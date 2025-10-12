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
- ⚡ **リアルタイム処理** - 会話が進行するたびに即座に分析
- 🏢 **ブース別セッション管理** - 実験ブース単位で会話を整理
- 👥 **マルチユーザー対応** - 複数ユーザーが同じ会話に参加可能
- 🔐 **シンプル認証** - Supabaseベースのユーザー名認証
- 📊 **管理ダッシュボード** - セッション管理・統計表示・データエクスポート
- 🔄 **リアルタイム同期** - Supabaseによるリアルタイムデータ共有
- 🎯 **アンカーメモリ** - 過去の重要発話を長期記憶として活用

---

## 🏗️ アーキテクチャ

```
atlas/
├── apps/
│   └── web/                             # Next.js 15 アプリケーション (@atlas/web)
│       ├── src/
│       │   ├── app/                     # App Router
│       │   │   ├── api/
│       │   │   │   ├── analyze/         # 会話分析API (Edge Runtime)
│       │   │   │   └── sessions/        # セッション管理API
│       │   │   ├── booth/[booth_id]/    # ブース別会話画面
│       │   │   ├── debug/               # デバッグビューア
│       │   │   ├── login/               # ログインページ
│       │   │   ├── sessions/            # 管理：セッション一覧
│       │   │   └── middleware.ts        # 認証・管理者保護
│       │   ├── features/
│       │   │   ├── components/          # UI コンポーネント
│       │   │   └── hooks/               # React hooks (useStream, useStreamWithSupabase)
│       │   └── lib/
│       │       └── supabase/            # Supabase クライアント・ヘルパー
│       └── package.json
│
├── packages/
│   └── atlas-core/                      # 共有コアライブラリ (@atlas/core)
│       └── src/
│           ├── analyzer/                # 会話分析モジュール (18ファイル)
│           │   ├── adapters/            # モデルアダプタ (OpenAI, Fallback)
│           │   ├── statistics/          # 統計関数 (FDR, robust, time-decay)
│           │   ├── utils/               # 汎用ユーティリティ (math, array)
│           │   ├── scoring/             # スコアリングロジック
│           │   ├── analyzer.ts          # コア分析関数
│           │   ├── analyze-with-anchors.ts  # アンカー統合版
│           │   ├── anchor-memory.ts     # 重要発話の長期記憶
│           │   ├── diversify.ts         # MMR多様化
│           │   ├── null-samples.ts      # 帰無サンプル生成
│           │   └── types.ts             # Analyzer設定型
│           ├── format/                  # UI用ユーティリティ
│           │   └── time.ts              # 相対時間表示
│           ├── types.ts                 # コア型定義 (Utterance)
│           └── index.ts                 # 公開API
│
└── supabase/
    └── migrations/                      # データベーススキーマ
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (推奨: 23.6.1)
- pnpm >= 8
- OpenAI API Key
- Supabase Project (for authentication and database)

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
# - OPENAI_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_ADMIN_USERNAMES (comma-separated, optional)
```

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. In Supabase Dashboard → Authentication → Settings:
   - **Disable** "Confirm email" (email confirmation not needed)
3. Run migrations:
   ```bash
   cd apps/web
   # Apply migrations to your Supabase project
   ```
4. Copy your project URL and anon key to `.env.local`

### Development

```bash
# Run Next.js dev server with Turbo
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

- 「開始」をクリックして音声認識を開始
- システムが自動的に検出：
  - 重要発話（緑色でハイライト）
  - スコアと統計的有意性（p値）
  - アンカー数
- 「停止」で録音を一時停止
- 「クリア」で会話をリセット

### 4. **管理ダッシュボード** (`/sessions`) - 管理者のみ

- 全セッションを表示：
  - ブース名
  - ユーザー名
  - 発話数
  - 重要発話数
  - 平均スコア
- JSON/CSV形式でデータエクスポート
- 「表示」でデバッグビューアを開く

### 5. **デバッグビューア** (`/debug?session=xxx`)

- リアルタイムで分析結果を可視化
- スコア詳細、p値、ランクを表示
- 他のユーザーのセッションも閲覧可能（URL共有）

---

## 📊 Technology Stack

| Layer                  | Technology                           |
| ---------------------- | ------------------------------------ |
| **Frontend**           | Next.js 15 + React 19 + Tailwind CSS |
| **Authentication**     | Supabase Auth (cookie-based SSR)     |
| **Database**           | PostgreSQL (via Supabase)            |
| **Speech Recognition** | Web Speech API (Browser)             |
| **Embeddings**         | OpenAI text-embedding-3-small        |
| **Hosting**            | Vercel (Serverless)                  |
| **Build System**       | Turborepo + pnpm workspaces          |
| **Code Quality**       | Biome (linter/formatter)             |

### データベーススキーマ

- **sessions**: ブース別会話セッション
  - `id`, `created_at`, `user_id`, `username`, `notes` (ブース名), `tags`, `experiment_params`
- **utterances**: 個別の発話
  - `id`, `session_id`, `user_id`, `username`, `speaker`, `text`, `timestamp`
- **ctide_scores**: 発話のスコア（分析結果）
  - `id`, `session_id`, `utterance_id`, `score` (JSONB)

---

## 🔬 コアアルゴリズム

### 統計的重要発話検出

ATLASは、機械学習モデルを訓練することなく、統計的手法で重要発話を検出します。

#### 1. **損失ベース情報量測定**

各発話の情報量を、埋め込み空間での損失関数で測定：

```
Δ_i = L(Y | H \ {u_i}) - L(Y | H)

L: 損失関数（埋め込みベース）
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
w(age) = exp(-λ · age)
λ = ln(2) / half_life_turns
```

#### 5. **アンカーメモリ**

過去の重要発話を長期記憶として保持し、類似度でスコアをブースト：

```
score_boosted = score_raw + 0.2 × similarity(current, anchors)
```

### パラメータ

| パラメータ | デフォルト | 説明 |
|-----------|----------|------|
| `k` | 3 | 直近k文を厳密評価 |
| `alphaMix` | 0.6 | 損失重視度 (0..1) |
| `halfLifeTurns` | 20 | 半減期（ターン数） |
| `nullSamples` | 8 | 帰無サンプル数 |
| `fdrAlpha` | 0.1 | FDR閾値 |
| `mmrLambda` | 0.7 | MMR重要度重視度 |

---

## 💰 Cost Estimation

| Service                 | Monthly Cost                  |
| ----------------------- | ----------------------------- |
| Vercel Hobby            | $0 (free tier)                |
| Supabase Free Tier      | $0 (500MB DB, 50k auth users) |
| Web Speech API          | $0 (browser built-in)         |
| OpenAI Embeddings       | ~$2 (100k utterances)         |
| OpenAI GPT-4 (optional) | ~$3 (100 calls)               |
| **Total**               | **~$0-5/month**               |

---

## 🔧 設定

`packages/atlas-core/src/analyzer/types.ts` で検出パラメータをカスタマイズ：

```typescript
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 3,                   // 直近k文の厳密評価
  alphaMix: 0.6,          // 損失重視度 (0..1)
  halfLifeTurns: 20,      // 半減期（ターン数）
  nullSamples: 8,         // 帰無サンプル数
  fdrAlpha: 0.1,          // FDR閾値
  minTokensForSingle: 5,  // 短文統合閾値
  mmrLambda: 0.7,         // MMR重要度重視度
};
```

### API使用例

```typescript
import {
  analyze,
  analyzeWithAnchors,
  AnchorMemory,
  OpenAIAdapter
} from '@atlas/core';

// アダプタ初期化
const adapter = new OpenAIAdapter({ apiKey: 'sk-...' });

// 基本分析
const result = await analyze(adapter, history, current, {
  k: 6,
  fdrAlpha: 0.1,
});

// アンカーメモリ付き分析
const anchorMemory = new AnchorMemory(200);
const result = await analyzeWithAnchors(
  adapter,
  history,
  current,
  anchorMemory
);
```

---

## 📖 技術的特徴

ATLASの主な技術的革新：

1. **学習不要の統計的手法** - 機械学習モデルの訓練が不要
2. **厳密な統計的検定** - 帰無分布とFDR制御による誤検出抑制
3. **埋め込みベース損失計算** - LLMの埋め込み空間で情報量を測定
4. **時間減衰モデル** - 古い発話の影響を適切に減衰
5. **アンカーメモリ** - 過去の重要発話を長期記憶として活用
6. **リアルタイム処理** - 会話進行に合わせて即座に分析

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- Original SCAIN concept from conversation analysis research
- Built with Next.js, OpenAI, and Vercel
- Web Speech API by W3C/Chrome team
