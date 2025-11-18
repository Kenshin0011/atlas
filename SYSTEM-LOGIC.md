# ATLAS システムロジック詳細

このドキュメントは、ATLASシステムの現在の実装ロジックを包括的に説明します。

## 目次

1. [システム概要](#システム概要)
2. [コアアルゴリズム](#コアアルゴリズム)
3. [データフロー](#データフロー)
4. [主要コンポーネント](#主要コンポーネント)
5. [実装の詳細](#実装の詳細)

---

## システム概要

ATLASは、リアルタイム会話から重要な発話を自動検出するシステムです。

### 基本原理

会話履歴から現在の発話を予測する際、**ある発話を除くと予測精度が大きく下がる場合、その発話は重要**という考え方に基づいています。

```
重要度 = (その発話を除いた損失 - 基準損失) × 時間減衰
```

### システムアーキテクチャ

```
┌─────────────────┐
│  Web UI         │ ← Next.js 15 + React 19
│  (Assistant)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase        │ ← PostgreSQL + Realtime
│ (sessions, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analysis API    │ ← Server Actions
│ (/api/analyze)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ @atlas/core     │ ← コア分析エンジン
│ (analyzer)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OpenAI API      │ ← text-embedding-3-small
│ (embeddings)    │
└─────────────────┘
```

---

## コアアルゴリズム

### 1. 重要発話検出の流れ

**packages/atlas-core/src/analyzer/analyzer.ts**

```typescript
async function analyze(adapter, history, current, opts) {
  // 1. 候補選択: 直近k個の発話を評価対象とする
  const candidates = history.slice(-opts.k);

  // 2. 基準損失を計算: 全履歴から現在発話を予測
  const baseLoss = await adapter.lossWithHistory(history, current);

  // 3. 各候補のスコアを並列計算
  const scored = await scoreUtterances(
    adapter, history, current, candidates, baseLoss, opts
  );

  // 4. 帰無分布を生成（統計的有意性検定用）
  const nullScores = await generateNullSamples(
    adapter, history, current, candidates.length, opts.nullSamples
  );

  // 5. ロバストz値で正規化
  const allScores = [...scored.map(s => s.score), ...nullScores];
  const zScores = robustZ(allScores);

  // 6. z値で重要発話を判定
  const important = scored
    .map((s, i) => ({ ...s, z: zScores[i] }))
    .filter(s => s.z > opts.zThreshold)
    .sort((a, b) => b.z - a.z);

  return { important, scored, nullScores };
}
```

### 2. スコア計算の詳細

**packages/atlas-core/src/analyzer/scoring/scorer.ts**

```typescript
async function scoreUtterances(adapter, history, current, candidates, baseLoss, opts) {
  // 並列でmaskedLossを計算
  const maskedLosses = await Promise.all(
    candidates.map(candidate =>
      adapter.maskedLoss(history, current, candidate.id)
    )
  );

  return candidates.map((candidate, i) => {
    // 損失の差分 = その発話がどれだけ重要か
    const deltaLoss = maskedLosses[i] - baseLoss;

    // 時間減衰: 古い発話ほど重みが減る
    const ageTurns = history.length - history.findIndex(u => u.id === candidate.id);
    const ageWeight = timeDecayWeight(ageTurns, opts.halfLifeTurns);

    // 最終スコア
    const finalScore = deltaLoss * ageWeight;

    return {
      utterance: candidate,
      score: finalScore,
      detail: {
        baseLoss,
        maskedLoss: maskedLosses[i],
        deltaLoss,
        ageWeight,
        finalScore,
      }
    };
  });
}
```

### 3. 時間減衰関数

**packages/atlas-core/src/analyzer/statistics/time-decay.ts**

```typescript
function timeDecayWeight(distance: number, halfLifeTurns: number): number {
  const lambda = Math.log(2) / halfLifeTurns;
  return Math.exp(-lambda * distance);
}
```

- `halfLifeTurns = 50`: 50ターン前の発話は重みが50%
- 指数減衰により、古い発話ほどスコアが低下

### 4. 統計的正規化（ロバストz値）

**packages/atlas-core/src/analyzer/statistics/robust.ts**

```typescript
function robustZ(values: number[]): number[] {
  const med = median(values);
  const deviations = values.map(v => Math.abs(v - med));
  const mad = median(deviations);

  // MADが0に近い場合の安定化
  const madStable = Math.max(mad, 0.001);

  // z値変換 (0.6745はMAD→標準偏差の変換係数)
  return values.map(v => 0.6745 * (v - med) / madStable);
}
```

**特徴:**
- 外れ値に強い（中央値ベース）
- 短い会話でも安定（MAD最小値: 0.001）
- `z > 1.0` で重要判定（上位16%相当）

### 5. 帰無分布生成

**packages/atlas-core/src/analyzer/null-samples.ts**

```typescript
async function generateNullSamples(adapter, history, current, candidateCount, nullSamples) {
  // nullSamplesは候補数の3倍以上に自動調整
  const adjustedSamples = Math.max(nullSamples, candidateCount * 3);

  // 並列でシャッフル版の損失を計算
  const nullScores = await Promise.all(
    Array(adjustedSamples).fill(0).map(async () => {
      const shuffled = [...history].sort(() => Math.random() - 0.5);
      const baseLoss = await adapter.lossWithHistory(shuffled, current);

      // ランダムな発話を1つ除外
      const randomIdx = Math.floor(Math.random() * shuffled.length);
      const randomUtterance = shuffled[randomIdx];
      const maskedLoss = await adapter.maskedLoss(shuffled, current, randomUtterance.id);

      return maskedLoss - baseLoss;
    })
  );

  return nullScores;
}
```

**目的:** 「たまたま高スコアになった発話」を除外し、統計的に有意な発話のみを検出

---

## データフロー

### 1. 発話追加から重要発話検出まで

```
[ユーザー入力]
    │
    ▼
[useStreamWithSupabase.addUtterance()]
    │
    ├─ 楽観的更新（UI即反映）
    │
    ├─ Supabase保存（saveUtteranceAction）
    │
    └─ 分析実行（analyzeConversationAction）
         │
         ▼
[analysisService.analyzeConversation()]
    │
    ├─ OpenAIAdapter初期化
    │
    └─ analyzeWithAnchors()
         │
         ├─ analyze() → 基本分析
         │    │
         │    ├─ 候補選択（直近k=15個）
         │    ├─ baseLoss計算
         │    ├─ scoreUtterances（並列）
         │    ├─ generateNullSamples（並列）
         │    ├─ robustZ正規化
         │    └─ 重要発話判定（z > 1.0）
         │
         └─ アンカーブースト
              │
              └─ 重要発話をAnchorMemoryに追加
    │
    ▼
[スコア・依存関係の保存]
    │
    ├─ saveBatchScoresAction（upsert）
    │
    └─ saveDependenciesAction（insert）
    │
    ▼
[Supabase Realtime通知]
    │
    └─ UI更新（scores, dependencies, importantList）
```

### 2. UIモードによる違い

**α版（依存関係グラフ使用）:**
```
[分析結果] → [依存関係抽出] → [グラフ構築]
                                    │
                                    ▼
                            [currentDependencies]
                                    │
                                    └→ オレンジ⭐表示
```

**β版（重要発話のみ）:**
```
[分析結果] → [重要発話フィルタ] → [最新の重要発話1個]
                                    │
                                    ▼
                            [currentDependencies]
                                    │
                                    └→ オレンジ⭐表示
```

**凡例:**
- **青▶**: 最新の発話（currentUtterance）
- **オレンジ⭐**: 現在の関連語
  - α版: 依存関係グラフに基づく関連語
  - β版: 最新の重要発話1個のみ
- **紫●**: 過去の重要発話

---

## 主要コンポーネント

### 1. React フック

**apps/web/src/features/hooks/useStreamWithSupabase.ts**

```typescript
export const useStreamWithSupabase = ({ sessionId, onImportantDetected }) => {
  // 状態管理
  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [scores, setScores] = useState<Map<number, Score>>(new Map());
  const [dependencies, setDependencies] = useState<DependencyEdge[]>([]);

  // セッション初期化
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId); // 既存セッション読み込み
      setupRealtimeSubscription(sessionId); // リアルタイム購読
    }
  }, [sessionId]);

  // 発話追加
  const addUtterance = useCallback(async (utterance: Utterance) => {
    // 楽観的更新
    setDialogue(prev => [...prev, utterance]);

    // 並列実行
    await Promise.all([
      // DB保存
      saveUtteranceAction(sessionId, utterance, user.id, username),

      // 分析実行
      (async () => {
        const result = await analyzeConversationAction({
          history: dialogue,
          current: utterance,
        });

        // スコア保存
        await saveBatchScoresAction(
          sessionId,
          result.scored.map(s => ({ utteranceId: s.utterance.id, score: s }))
        );

        // 依存関係保存（α版のみ）
        if (result.dependencies) {
          await saveDependenciesAction(sessionId, result.dependencies);
        }
      })()
    ]);
  }, [dialogue, sessionId, user, username]);

  return {
    sessionId,
    dialogue,
    scores,
    dependencies,
    addUtterance,
    // ...
  };
};
```

### 2. 分析API

**apps/web/src/app/api/analyze/route.ts**

```typescript
export async function POST(request: Request) {
  const { history, current, options } = await request.json();

  // バリデーション
  if (!current?.text) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 分析実行
  const result = await analyzeConversation(history, current, options);

  return NextResponse.json(result);
}
```

### 3. 分析サービス

**apps/web/src/lib/services/analysis.ts**

```typescript
// グローバルアンカーメモリ（最大200個）
const anchorMemory = new AnchorMemory(200);

export const analyzeConversation = async (
  history: Utterance[],
  current: Utterance,
  options?: AnalyzerOptions
) => {
  // OpenAIアダプタ初期化
  const adapter = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
  });

  // アンカー統合分析
  const result = await analyzeWithAnchors(
    adapter,
    anchorMemory,
    history,
    current,
    options
  );

  // 重要発話をアンカーに追加
  for (const imp of result.important) {
    anchorMemory.add(imp.utterance, imp.score);
  }

  return {
    important: result.important,
    scored: result.scored,
    anchorCount: anchorMemory.size,
  };
};
```

### 4. OpenAI アダプタ

**packages/atlas-core/src/analyzer/adapters/openai.ts**

```typescript
export class OpenAIAdapter implements ModelAdapter {
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    // 履歴と現在発話の埋め込みを取得
    const historyEmb = await this.getAverageEmbedding(history);
    const currentEmb = await this.embed(current.text);

    // コサイン類似度 → 損失（1 - 類似度）
    const similarity = cosineSimilarity(historyEmb, currentEmb);
    return 1 - similarity;
  }

  async maskedLoss(
    history: Utterance[],
    current: Utterance,
    maskedId: number
  ): Promise<number> {
    // 特定発話を除いた履歴で損失を計算
    const masked = history.filter(u => u.id !== maskedId);
    return this.lossWithHistory(masked, current);
  }

  async embed(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding; // 1536次元
  }

  private async getAverageEmbedding(utterances: Utterance[]): Promise<number[]> {
    const embeddings = await Promise.all(
      utterances.map(u => this.embed(u.text))
    );

    // 平均ベクトル（等重み）
    return embeddings[0].map((_, dim) =>
      embeddings.reduce((sum, emb) => sum + emb[dim], 0) / embeddings.length
    );
  }
}
```

### 5. アンカーメモリ統合

**packages/atlas-core/src/analyzer/analyze-with-anchors.ts**

```typescript
export async function analyzeWithAnchors(
  adapter: ModelAdapter,
  anchorMemory: AnchorMemory,
  history: Utterance[],
  current: Utterance,
  options?: AnalyzerOptions
): Promise<AnalysisResult> {
  // 基本分析
  const result = await analyze(adapter, history, current, options);

  // アンカーメモリから上位10個取得
  const topAnchors = anchorMemory.top(10);
  if (topAnchors.length === 0) return result;

  // 現在発話の埋め込みを取得
  const currentEmb = await adapter.embed(current.text);

  // アンカーとの類似度でスコアをブースト
  const boosted = await Promise.all(
    result.scored.map(async (scored) => {
      const uttEmb = await adapter.embed(scored.utterance.text);

      // 全アンカーとの最大類似度
      const maxSimilarity = Math.max(
        ...topAnchors.map(anchor => {
          const anchorEmb = await adapter.embed(anchor.utterance.text);
          return cosineSimilarity(uttEmb, anchorEmb);
        })
      );

      // スコアブースト: +0.2 × 類似度
      return {
        ...scored,
        score: scored.score + 0.2 * maxSimilarity,
      };
    })
  );

  // スコア順に再ソート
  return {
    ...result,
    scored: boosted.sort((a, b) => b.score - a.score),
  };
}
```

---

## 実装の詳細

### 1. デフォルトパラメータ

**packages/atlas-core/src/analyzer/types.ts**

```typescript
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 15,                // 直近15発話を候補とする
  halfLifeTurns: 50,    // 50ターンで重みが50%に減衰
  nullSamples: 20,      // 帰無分布用サンプル数（自動調整: min 3×k）
  zThreshold: 1.0,      // z値閾値（上位16%相当）
};
```

### 2. スコア型定義

**packages/atlas-core/src/analyzer/scoring/types.ts**

```typescript
export type ScoreDetail = {
  baseLoss: number;      // 基準損失
  maskedLoss: number;    // 発話除外時の損失
  deltaLoss: number;     // 損失差分（重要度の生値）
  ageWeight: number;     // 時間減衰係数
  finalScore: number;    // 最終スコア = deltaLoss × ageWeight
  zScore?: number;       // 正規化後のz値
};

export type ScoredUtterance = {
  utterance: Utterance;
  score: number;
  rank: number;
  z?: number;
  detail: ScoreDetail;
};
```

### 3. データベーススキーマ

**Supabase テーブル構造:**

```sql
-- セッション
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  notes TEXT,                    -- ブース名
  experiment_params JSONB        -- { uiMode: 'alpha' | 'beta' }
);

-- 発話
CREATE TABLE utterances (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID,
  username TEXT,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- スコア
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  utterance_id BIGINT REFERENCES utterances(id) ON DELETE CASCADE,
  score JSONB NOT NULL,          -- ScoreDetail JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, utterance_id)
);

-- 依存関係（α版のみ使用）
CREATE TABLE dependencies (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  from_utterance_id BIGINT REFERENCES utterances(id) ON DELETE CASCADE,
  to_utterance_id BIGINT REFERENCES utterances(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, from_utterance_id, to_utterance_id)
);
```

### 4. UIコンポーネント構造

```
apps/web/src/features/components/
├── Assistant.tsx              # メインUI（音声入力・テキスト入力）
├── ConversationTimeline.tsx   # 会話タイムライン（α版・β版統合）
├── BoothList.tsx             # ブース一覧・作成
└── SessionsManager.tsx        # セッション管理（管理者用）
```

**ConversationTimeline の表示ロジック:**

```typescript
// β版では最新の重要発話のみをオレンジにする
const currentDependencies = useMemo(() => {
  if (isBetaMode) {
    const importantUtterances = dialogue.filter(u => scores.get(u.id)?.isImportant);
    if (importantUtterances.length === 0) return new Set<number>();

    // 最新の重要発話1個のみ
    const latest = importantUtterances[importantUtterances.length - 1];
    return new Set([latest.id]);
  }

  // α版：依存関係グラフから計算
  return new Set(getAllDependencies(currentUtterance.id));
}, [isBetaMode, dialogue, scores, currentUtterance, dependencies]);

// 発話カードのスタイル
const cardStyle = isCurrent
  ? 'bg-blue-50 border-blue-400'      // 青: 最新
  : isDependency
  ? 'bg-orange-50 border-orange-400'  // オレンジ: 関連
  : isImportant
  ? 'bg-purple-50 border-purple-300'  // 紫: 過去の重要語
  : 'bg-white border-slate-200';      // 灰: 通常
```

### 5. 最適化手法

**並列処理:**
```typescript
// スコア計算と帰無分布生成を並列実行
const [scored, nullScores] = await Promise.all([
  scoreUtterances(adapter, history, current, candidates, baseLoss, opts),
  generateNullSamples(adapter, history, current, candidates.length, opts.nullSamples)
]);
```

**バッチ保存:**
```typescript
// スコアを一括upsert
await saveBatchScoresAction(sessionId, scoredList.map(s => ({
  utteranceId: s.utterance.id,
  score: {
    score: s.score,
    isImportant: s.z > zThreshold,
    z: s.z,
    detail: s.detail,
  }
})));
```

**キャッシュ:**
```typescript
// OpenAI埋め込みのキャッシュ（メモリ内）
const embeddingCache = new Map<string, number[]>();

async embed(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }

  const embedding = await openai.embeddings.create({...});
  embeddingCache.set(text, embedding);
  return embedding;
}
```

---

## パフォーマンス特性

### 計算量

- **候補数**: k = 15
- **埋め込み呼び出し**: O(k) + O(nullSamples)
- **時間計算量**: O(k × 埋め込み時間 + nullSamples × 埋め込み時間)

### レイテンシ（実測値）

| 操作 | 平均レイテンシ |
|-----|---------------|
| 発話追加（楽観的更新） | ~10ms |
| DB保存 | ~50ms |
| 埋め込み取得（OpenAI） | ~100ms/発話 |
| 分析全体（k=15, null=20） | ~3-5秒 |
| スコア保存 | ~100ms |

### スケーラビリティ

- **会話長**: 1000発話まで動作確認済み
- **同時セッション**: Supabaseのキャパシティに依存
- **アンカーメモリ**: 200個上限でメモリ使用量制限

---

## 今後の拡張ポイント

### 1. アルゴリズム改善
- 依存関係グラフの自動構築（α版）
- 話者間のインタラクション考慮
- トピックモデル統合

### 2. パフォーマンス最適化
- 埋め込みキャッシュの永続化
- バッチ処理の最適化
- ストリーミング応答

### 3. 機能追加
- 多言語対応
- カスタムパラメータ調整UI
- リアルタイムグラフ可視化

---

## 参考資料

- **コードベース**: `/Users/kenshin0011/Project/atlas`
- **設定ファイル**: `.claude/CLAUDE.md`
- **依存関係**: `package.json`, `turbo.json`
