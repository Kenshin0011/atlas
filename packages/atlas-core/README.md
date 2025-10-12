# @atlas/core

ATLAS コアライブラリ - 統計的会話分析エンジン

学習不要のリアルタイム重要発話検出システム

---

## 📦 概要

`@atlas/core` は、会話から統計的に有意な重要発話を検出するためのコアライブラリです。機械学習モデルの訓練を必要とせず、埋め込みベースの損失計算とFDR制御による多重検定補正で、リアルタイムに重要発話を抽出します。

### 主な機能

- 📊 **統計的重要度検出** - 帰無分布生成とBenjamini-Hochberg法によるFDR制御
- 🧠 **埋め込みベース分析** - OpenAI embeddingsによる情報量測定
- ⚡ **リアルタイム処理** - 学習フェーズなし、即座に分析可能
- 🎯 **アンカーメモリ** - 過去の重要発話を長期記憶として活用
- 🔌 **モデルアダプタ** - OpenAI/独自モデルに対応可能
- 🛠️ **完全型安全** - TypeScriptで完全に型付け

---

## 📁 構造

```
@atlas/core/src/
├── analyzer/                      # 会話分析モジュール (18ファイル)
│   ├── adapters/                 # モデルアダプタ
│   │   ├── types.ts             # ModelAdapter型定義
│   │   ├── openai-adapter.ts    # OpenAI実装
│   │   ├── fallback-adapter.ts  # フォールバック実装
│   │   └── index.ts
│   ├── statistics/               # 統計関数
│   │   ├── robust.ts            # ロバスト統計 (median, robustZ)
│   │   ├── fdr.ts               # FDR制御 (ecdf, benjaminiHochberg)
│   │   └── time-decay.ts        # 時間減衰 (timeDecayWeight)
│   ├── utils/                    # 汎用ユーティリティ
│   │   ├── math.ts              # 数学関数 (cosine)
│   │   └── array.ts             # 配列操作 (shuffle)
│   ├── scoring/                  # スコアリング
│   │   ├── types.ts             # ScoreDetail, ScoredUtterance
│   │   └── scorer.ts            # スコアリングロジック
│   ├── analyzer.ts               # コア分析関数
│   ├── analyze-with-anchors.ts   # アンカー統合版
│   ├── anchor-memory.ts          # アンカーメモリクラス
│   ├── diversify.ts              # MMR多様化
│   ├── null-samples.ts           # 帰無サンプル生成
│   ├── converters.ts             # 型変換ヘルパー
│   ├── types.ts                  # Analyzer設定型
│   └── index.ts                  # 公開API
├── format/                        # UI用ユーティリティ
│   └── time.ts                   # 相対時間表示
├── types.ts                       # コア型定義 (Utterance)
└── index.ts                       # パッケージエントリ
```

---

## 🚀 インストール

```bash
pnpm add @atlas/core
```

**依存関係:**

- Node.js >= 18
- OpenAI API Key（OpenAIAdapterを使用する場合）

---

## 📖 使い方

### 基本的な使い方

```typescript
import {
  analyze,
  OpenAIAdapter,
  type Utterance,
} from '@atlas/core';

// 1. アダプタを初期化
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. 会話データを準備
const history: Utterance[] = [
  { id: 1, text: "今日は天気がいいですね", timestamp: Date.now() - 10000, speaker: "A" },
  { id: 2, text: "本当にそうですね", timestamp: Date.now() - 8000, speaker: "B" },
  { id: 3, text: "散歩に行きましょうか", timestamp: Date.now() - 5000, speaker: "A" },
];

const current: Utterance = {
  id: 4,
  text: "いいですね、公園に行きましょう",
  timestamp: Date.now(),
  speaker: "B"
};

// 3. 分析を実行
const result = await analyze(adapter, history, current, {
  k: 3,              // 直近3文を評価
  fdrAlpha: 0.1,     // FDR閾値
  halfLifeTurns: 20, // 20ターンで半減
});

// 4. 結果を確認
console.log('重要発話:', result.important);
console.log('全スコア:', result.scored);
```

### アンカーメモリ付き分析

```typescript
import {
  analyzeWithAnchors,
  AnchorMemory,
  OpenAIAdapter,
} from '@atlas/core';

const adapter = new OpenAIAdapter({ apiKey: '...' });
const anchorMemory = new AnchorMemory(200); // 最大200個保持

// 分析実行
const result = await analyzeWithAnchors(
  adapter,
  history,
  current,
  anchorMemory,
  { k: 3, fdrAlpha: 0.1 }
);

// 重要発話をアンカーメモリに追加
for (const imp of result.important) {
  anchorMemory.add({
    id: imp.id,
    text: imp.text,
    score: imp.score,
    ts: imp.timestamp,
  });
}

console.log('アンカー数:', anchorMemory.all().length);
console.log('上位10個:', anchorMemory.top(10));
```

### 独自アダプタの実装

```typescript
import { type ModelAdapter, type Utterance } from '@atlas/core';

class CustomAdapter implements ModelAdapter {
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    // 履歴を考慮した損失を計算
    // 損失が高い = 現在発話が予測困難
    return 0.5;
  }

  async maskedLoss(
    history: Utterance[],
    current: Utterance,
    masked: Utterance
  ): Promise<number> {
    // 特定の発話を除いた損失を計算
    // Δ = maskedLoss - baseLoss で情報量を測定
    return 0.7;
  }

  async embed(text: string): Promise<number[]> {
    // MMR多様化用の埋め込みベクトルを返す
    return new Array(128).fill(0);
  }
}

const adapter = new CustomAdapter();
const result = await analyze(adapter, history, current);
```

---

## 🔧 API リファレンス

### 型定義

#### `Utterance`

```typescript
type Utterance = {
  id: number;        // 発話ID
  text: string;      // 発話テキスト
  timestamp: number; // タイムスタンプ（ミリ秒）
  speaker: string;   // 発話者
};
```

#### `AnalyzerOptions`

```typescript
type AnalyzerOptions = {
  k?: number;                // 直近k文を厳密評価 (default: 3)
  alphaMix?: number;         // 損失重視度 0..1 (default: 0.6)
  halfLifeTurns?: number;    // 半減期ターン数 (default: 20)
  nullSamples?: number;      // 帰無サンプル数 (default: 8)
  fdrAlpha?: number;         // FDR閾値 (default: 0.1)
  minTokensForSingle?: number; // 短文統合閾値 (default: 5)
  mmrLambda?: number;        // MMR重要度重視度 (default: 0.7)
};
```

#### `ScoredUtterance`

```typescript
type ScoredUtterance = Utterance & {
  rank: number;    // ランク（スコア順位）
  score: number;   // 最終スコア
  p?: number;      // p値
  detail: {
    baseLoss: number;      // 基準損失
    maskedLoss: number;    // マスク損失
    deltaLoss: number;     // 差分損失
    ageWeight: number;     // 時間減衰重み
    rawScore: number;      // 生スコア
    finalScore: number;    // 最終スコア
    pValue?: number;       // p値
  };
};
```

#### `AnalyzeResult`

```typescript
type AnalyzeResult = {
  important: ScoredUtterance[];  // 統計的に有意な重要発話
  scored: ScoredUtterance[];     // 全発話のスコア
  nullScores: number[];          // 帰無スコア（デバッグ用）
};
```

### 関数

#### `analyze()`

基本的な会話分析を実行

```typescript
function analyze(
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  options?: AnalyzerOptions
): Promise<AnalyzeResult>
```

#### `analyzeWithAnchors()`

アンカーメモリを統合した分析を実行

```typescript
function analyzeWithAnchors(
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  anchorMemory: AnchorMemory,
  options?: AnalyzerOptions
): Promise<AnalyzeResult>
```

#### `AnchorMemory`

重要発話の長期記憶クラス

```typescript
class AnchorMemory {
  constructor(maxSize: number = 200);
  add(anchor: Anchor): void;
  top(n: number = 10): Anchor[];
  all(): Anchor[];
}
```

### アダプタ

#### `OpenAIAdapter`

OpenAI embeddingsを使用したアダプタ

```typescript
class OpenAIAdapter implements ModelAdapter {
  constructor(config: {
    apiKey: string;
    model?: string;              // default: 'text-embedding-3-small'
    embeddingDimension?: number; // default: 1536
  });

  clearCache(): void;    // キャッシュをクリア
  getCacheSize(): number; // キャッシュサイズを取得
}
```

#### `CosineFallbackAdapter`

LLM不要の簡易アダプタ（テスト用）

```typescript
class CosineFallbackAdapter implements ModelAdapter {
  // 文字コードヒストグラムベースの簡易埋め込み
}
```

---

## 🧪 アルゴリズム詳細

### 1. 損失ベース情報量測定

各発話の情報量を、埋め込み空間での損失関数で測定：

```
Δ_i = L(Y | H \ {u_i}) - L(Y | H)
```

- `L`: 損失関数（1 - コサイン類似度）
- `H`: 会話履歴
- `u_i`: 評価対象の発話
- `Y`: 現在の発話

**直感**: 発話を除くと損失が増加 = その発話が重要

### 2. 帰無分布生成

会話をランダムシャッフルして帰無分布を構築：

```
H_null = shuffle(H)
Δ_null ~ {Δ(H_null, u) | u ∈ sample(H_null, k)}
```

`nullSamples` 回繰り返して帰無スコア集合を生成

### 3. 統計的検定

**ロバストZ変換**:
```
z = 0.6745 × (x - median(X)) / MAD(X)
```

**p値計算**:
```
p_i = 1 - F_0(z_i)
```
- `F_0`: 帰無分布の経験累積分布関数（ECDF）

**FDR制御（Benjamini-Hochberg法）**:
```
p_(i) ≤ (i/n) × α  を満たす最大のi
```

### 4. 時間減衰

古い発話ほど重みを減衰：

```
w(age) = exp(-λ × age)
λ = ln(2) / halfLifeTurns
```

### 5. 最終スコア

```
score_final = (alphaMix × Δ + (1-alphaMix) × surprisal) × w(age)
```

---

## 📊 パフォーマンス

**計算量**: O(k × n) per utterance
- `k`: 評価対象の発話数（default: 3）
- `n`: nullSamples数（default: 8）

**典型的なレイテンシ**（OpenAIAdapter使用時）:
- 初回: ~500ms（埋め込みAPI呼び出し）
- 2回目以降: ~50ms（キャッシュヒット）

**メモリ使用量**:
- AnchorMemory: ~200個 × 1.5KB = 300KB
- 埋め込みキャッシュ: ~100発話 × 6KB = 600KB

---

## 🧩 拡張可能性

### カスタム統計関数

```typescript
import { robustZ, benjaminiHochberg } from '@atlas/core';

// 独自のロバスト変換
const myRobustZ = (values: number[]): number[] => {
  // ...
};
```

### カスタム時間減衰

```typescript
import { timeDecayWeight } from '@atlas/core';

// 独自の減衰関数
const myDecay = (age: number, halfLife: number): number => {
  return Math.exp(-2 * Math.log(2) * age / halfLife);
};
```

---

## 🔬 研究背景

ATLASのアルゴリズムは以下の研究に基づいています：

1. **情報理論**: 損失関数による情報量測定
2. **統計的仮説検定**: 帰無分布とp値による厳密な検定
3. **多重検定補正**: Benjamini-Hochberg法によるFDR制御
4. **時系列分析**: 指数減衰による時間重み付け
5. **情報検索**: MMRによる多様性確保

---

## 📝 ライセンス

MIT

---

## 🙏 謝辞

- 統計的手法: Benjamini & Hochberg (1995)
- 埋め込みAPI: OpenAI
- TypeScript: Microsoft

