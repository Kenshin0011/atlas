# ATLAS

**A**ttention **T**emporal **L**ink **A**nalysis **S**ystem

リアルタイム会話分析システム - 学習なし・統計的重要発話検出

---

## 🎯 概要

ATLASは、会話中の重要な発話を統計的に検出するリアルタイム分析システムです。機械学習モデルの訓練を必要とせず、埋め込みベースの損失計算とFDR制御による多重検定補正で、統計的に有意な重要発話を抽出します。

### 主な特徴

- 🎤 **Web Speech API統合** - ブラウザネイティブの音声認識（無料）
- 📊 **統計的重要度検出** - 帰無分布とFDR制御による厳密な有意性判定
- 🧠 **埋め込みベース分析** - OpenAI embeddings + 損失関数による情報量測定
- ⚡ **リアルタイム処理** - Server Actions + Supabase Realtimeで即座に分析
- 🏢 **ブース別セッション管理** - 実験ブース単位で会話を整理
- 👥 **マルチユーザー対応** - 複数ユーザーが同じ会話に参加可能
- 🔐 **認証システム** - Supabaseベースのメール認証
- 📊 **管理ダッシュボード** - セッション管理・統計表示・データエクスポート
- 🔄 **リアルタイム同期** - Supabaseによるリアルタイムデータ共有
- 🎯 **アンカーメモリ** - 過去の重要発話を長期記憶として活用
- 🎨 **依存関係可視化** - 重要発話（オレンジ）と依存元（緑）の視覚的表現

---

## 🏗️ アーキテクチャ

```
atlas/
├── apps/
│   └── web/                             # Next.js 15 アプリケーション (@atlas/web)
│       ├── src/
│       │   ├── app/
│       │   │   ├── actions/             # Server Actions（最適化済み）
│       │   │   │   ├── analysis.ts     # 会話分析 Server Action
│       │   │   │   └── session.ts      # セッション管理 Server Actions
│       │   │   ├── booth/[booth_id]/   # ブース別会話画面
│       │   │   ├── debug/              # デバッグビューア
│       │   │   ├── sessions/           # 管理：セッション一覧
│       │   │   └── middleware.ts       # 認証・管理者保護
│       │   ├── features/
│       │   │   ├── components/         # UI コンポーネント
│       │   │   │   ├── ImportantHighlights.tsx  # 重要発話チェイン（色分け）
│       │   │   │   ├── DependencyMinimap.tsx   # 依存関係マップ
│       │   │   │   └── ...
│       │   │   └── hooks/              # React hooks
│       │   │       ├── useStream.ts    # ローカル分析
│       │   │       └── useStreamWithSupabase.ts  # Supabase統合
│       │   ├── hooks/                  # 共有hooks
│       │   │   ├── useAuth.ts
│       │   │   └── useSpeechRecognition.ts
│       │   └── lib/
│       │       ├── services/
│       │       │   └── analysis.ts     # 分析ビジネスロジック
│       │       └── supabase/           # Supabase クライアント
│       │           ├── client.ts       # ブラウザクライアント
│       │           ├── server-actions.ts  # Server Actions用クライアント
│       │           ├── service-client.ts  # サービスロールクライアント（RLSバイパス）
│       │           ├── session.ts      # セッションCRUD
│       │           └── database.types.ts  # 自動生成型定義
│       └── package.json
│
├── packages/
│   └── atlas-core/                     # 共有コアライブラリ (@atlas/core)
│       └── src/
│           ├── analyzer/               # 会話分析モジュール
│           │   ├── adapters/           # モデルアダプタ (OpenAI, Fallback)
│           │   ├── statistics/         # 統計関数 (FDR, robust, time-decay)
│           │   ├── utils/              # 汎用ユーティリティ
│           │   ├── scoring/            # スコアリングロジック
│           │   ├── analyzer.ts         # コア分析関数
│           │   ├── analyze-with-anchors.ts  # アンカー統合版
│           │   ├── anchor-memory.ts    # 重要発話の長期記憶
│           │   ├── diversify.ts        # MMR多様化
│           │   ├── null-samples.ts     # 帰無サンプル生成
│           │   └── types.ts            # Analyzer設定型
│           ├── format/                 # UI用ユーティリティ
│           │   └── time.ts             # 相対時間表示
│           ├── types.ts                # コア型定義 (Utterance)
│           └── index.ts                # 公開API
│
└── supabase/
    └── migrations/                     # データベーススキーマ
        └── 001_initial_schema.sql      # 初期スキーマ
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (推奨: 23.6.1)
- pnpm >= 8
- OpenAI API Key
- Supabase Project (authentication + database + realtime)

### Installation

```bash
# Clone and navigate
cd atlas

# Node.jsバージョンを設定（nvmを使用する場合）
nvm use

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add:
# - OPENAI_API_KEY=sk-...
# - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# - SUPABASE_SERVICE_ROLE_KEY=eyJ...  (重要: サーバーサイドのみ)
# - NEXT_PUBLIC_ADMIN_USERS=admin@example.com
```

### Supabase Setup

1. **プロジェクト作成** - https://supabase.com で新規プロジェクト作成
2. **認証設定** - Dashboard → Authentication → Settings:
   - Email confirmation: 有効（または無効化して簡略化）
3. **マイグレーション実行** - SQL Editorで以下を順番に実行:
   ```sql
   -- 001_initial_schema.sql の内容を実行
   ```
4. **環境変数設定** - `.env.local`に以下をコピー:
   - `NEXT_PUBLIC_SUPABASE_URL`: プロジェクトURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 公開キー（anon key）
   - `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（**機密情報**）

### Development

```bash
# Run Next.js dev server with Turbopack
pnpm dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
pnpm build
```

---

## 👤 使い方

### 1. **ログイン** (`/login`)

- ユーザー名を入力（3文字以上、英数字・`_`・`-`）
- アカウント作成またはログイン
- ブース一覧へリダイレクト

### 2. **ブース作成** (`/`)

- ブース名を入力（例: "実験A - 条件1"）
- 「ブースを作成」をクリック
- 自動的に新規セッションが作成される

### 3. **会話** (`/booth/[booth_id]`)

- **音声認識**: 「開始」をクリックして音声入力を開始
- **テキスト入力**: 入力ボックスに直接入力してEnter
- **リアルタイム分析**:
  - 🟠 **オレンジ**: 新たに重要と検出された発話
  - 🟢 **緑**: その依存元となる過去の重要発話（アンカー）
  - スコア、p値、ランクがリアルタイム表示
- **操作**:
  - 「停止」で録音を一時停止

### 4. **管理ダッシュボード** (`/sessions`) - 管理者のみ

- **セッション一覧表示**:
  - ブース名、ユーザー名
  - 発話数、重要発話数、平均スコア
- **データエクスポート**: JSON/CSV形式
- **セッション管理**:
  - 「▶」で展開して会話履歴を表示
  - 「リセット」でデータクリア
  - 「削除」でセッション完全削除

### 5. **デバッグビューア** (`/debug?session=xxx`)

- リアルタイムで分析結果を可視化
- スコア詳細、p値、ランクを表示
- 依存関係グラフで重要発話のつながりを視覚化
- URLで共有可能（他ユーザーも閲覧可）

---

## 📊 Technology Stack

| Layer                  | Technology                             |
| ---------------------- | -------------------------------------- |
| **Frontend**           | Next.js 15 + React 19 + Tailwind CSS  |
| **Backend**            | Next.js Server Actions（最適化済み）  |
| **Authentication**     | Supabase Auth (cookie-based SSR)       |
| **Database**           | PostgreSQL (via Supabase)              |
| **Realtime**           | Supabase Realtime (WebSocket)          |
| **Speech Recognition** | Web Speech API (Browser)               |
| **Embeddings**         | OpenAI text-embedding-3-small          |
| **Hosting**            | Vercel (Serverless + Edge Functions)   |
| **Build System**       | Turborepo + pnpm workspaces            |
| **Code Quality**       | Biome (linter/formatter)               |

### データベーススキーマ

- **sessions**: ブース別会話セッション
  - `id` (UUID), `created_at`, `user_id`, `username`, `notes` (ブース名), `tags`, `experiment_params`
- **utterances**: 個別の発話
  - `id` (BIGSERIAL), `session_id`, `user_id`, `username`, `speaker`, `text`, `timestamp`
- **scores**: 発話のスコア（分析結果）
  - `id`, `session_id`, `utterance_id`, `score` (JSONB)
  - UNIQUE制約: `(session_id, utterance_id)`
- **dependencies**: 依存関係エッジ
  - `id`, `session_id`, `from_utterance_id`, `to_utterance_id`
  - UNIQUE制約: `(session_id, from_utterance_id, to_utterance_id)`

---

## 🔬 コアアルゴリズム

### 統計的重要発話検出

ATLASは、機械学習モデルを訓練することなく、統計的手法で重要発話を検出します。

#### 1. **損失ベース情報量測定**

各発話の情報量を、埋め込み空間での損失関数で測定：

```
Δ_i = L(Y | H \ {u_i}) - L(Y | H)

L: 損失関数（コサイン類似度ベース）
H: 会話履歴
u_i: 評価対象の発話
Y: 現在の発話
```

発話を除くと損失が増加 = その発話が重要

#### 2. **帰無分布生成**

ランダムシャッフルで帰無分布を構築：

```
H_null = shuffle(H)
Δ_null ~ {Δ(H_null, u) | u ∈ H_null}
```

#### 3. **p値計算とFDR制御**

- ロバストZ変換で正規化
- 経験累積分布関数（ECDF）でp値算出
- Benjamini-Hochberg法でFDR制御（α=0.1）

#### 4. **時間減衰**

古い発話ほど重みを減衰：

```
w(distance) = exp(-λ · distance)
λ = ln(2) / halfLifeTurns
```

#### 5. **アンカーメモリ**

過去の重要発話を長期記憶として保持し、MMRで多様性を確保：

```
MMR(u) = λ · relevance(u, current) - (1 - λ) · max_similarity(u, selected)
```

### パラメータ

| パラメータ | デフォルト | 説明 |
|-----------|----------|------|
| `k` | 15 | 直近k文を厳密評価 |
| `alphaMix` | 0.6 | 損失重視度 (0..1) |
| `halfLifeTurns` | 20 | 半減期（ターン数） |
| `nullSamples` | 20 | 帰無サンプル数 |
| `fdrAlpha` | 0.1 | FDR閾値 |
| `mmrLambda` | 0.7 | MMR関連性重視度 |

### 📚 詳細ドキュメント

アルゴリズムの詳細な解説（実装コード、具体的な会話例、ステップバイステップの計算）は以下を参照してください：

**[`packages/atlas-core/README.md`](packages/atlas-core/README.md)**

---

## 🎨 UI設計

### 色分けルール

- **🟠 オレンジ**: 新たに重要と検出された発話（dependent）
  - `dependencies.to`に含まれる発話
  - 現在の分析で重要と判定されたもの
- **🟢 緑**: 依存元となる過去の重要発話（anchor）
  - `dependencies.from`に含まれる発話
  - 他の重要発話から参照されている基盤

### コンポーネント

- **ImportantHighlights**: 重要発話チェインを時系列で表示
- **DependencyMinimap**: 依存関係を視覚的に表示
- **ConversationStreamWithDependencies**: 現在の発話を表示
- **DebugConversationView**: 全発話にスコアを表示

---

---

## 💰 Cost Estimation

| Service                 | Monthly Cost                  |
| ----------------------- | ----------------------------- |
| Vercel Hobby            | $0 (free tier)                |
| Supabase Free Tier      | $0 (500MB DB, 50k auth users, 2GB bandwidth) |
| Web Speech API          | $0 (browser built-in)         |
| OpenAI Embeddings       | ~$0.02/1k texts (1536 dim)    |
| **Total**               | **~$0-10/month** (depending on usage) |

**例**: 月間10,000発話 = 約$0.20 (embeddings)

---

## 🔧 設定

`packages/atlas-core/src/analyzer/types.ts` で検出パラメータをカスタマイズ：

```typescript
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 15,                  // 直近k文の厳密評価
  alphaMix: 0.6,          // 損失重視度 (0..1)
  halfLifeTurns: 20,      // 半減期（ターン数）
  nullSamples: 20,         // 帰無サンプル数
  fdrAlpha: 0.1,          // FDR閾値
  mmrLambda: 0.7,         // MMR重要度重視度
};
```

### API使用例

```typescript
import {
  analyzeWithAnchors,
  AnchorMemory,
  OpenAIAdapter
} from '@atlas/core';

// アダプタ初期化
const adapter = new OpenAIAdapter({ apiKey: 'sk-...' });

// アンカーメモリ付き分析
const anchorMemory = new AnchorMemory(200);
const result = await analyzeWithAnchors(
  adapter,
  history,
  current,
  anchorMemory,
  {
    k: 3,
    fdrAlpha: 0.1,
  }
);

// result.important: 重要発話のリスト
// result.scored: 全発話のスコア
// result.anchorCount: アンカーメモリのサイズ
```

---

## 📖 技術的特徴

ATLASの主な技術的革新：

1. **学習不要の統計的手法** - 機械学習モデルの訓練が不要
2. **厳密な統計的検定** - 帰無分布とFDR制御による誤検出抑制
3. **埋め込みベース損失計算** - LLMの埋め込み空間で情報量を測定
4. **時間減衰モデル** - 古い発話の影響を指数関数的に減衰
5. **アンカーメモリ + MMR** - 過去の重要発話を多様性を保ちながら長期記憶
6. **リアルタイム処理** - Server Actions + Supabase Realtimeで即座に分析・同期
7. **最適化されたServer Actions** - バリデーションオーバーヘッドを最小化
8. **RLS最適化** - サービスクライアントでパフォーマンス向上

---

## 🐛 トラブルシューティング

### 分析が遅い

- **原因**: 会話が長くなるとOpenAI API呼び出しが増加
- **対策**: `k`（アンカー数）を減らす、または`nullSamples`を減らす

### 重要発話が検出されない

- **原因**: FDR閾値が厳しい、または会話が短い
- **対策**: `fdrAlpha`を0.15に増やす、または会話を10発話以上続ける

### データベースエラー

- **原因**: RLSポリシーまたは環境変数の問題
- **対策**:
  1. `SUPABASE_SERVICE_ROLE_KEY`が設定されているか確認
  2. Supabaseダッシュボードでテーブルが作成されているか確認

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- Original concept inspired by conversation analysis research
- Built with Next.js 15, React 19, OpenAI, Supabase, and Vercel
- Web Speech API by W3C/Chrome team
