# Supabase Setup for CTIDE

## 概要

CTIDE Assistant は Supabase を使用して以下を実現します:

- ✅ ユーザー名ベースの認証（メールアドレス不要）
- ✅ ブース単位での会話セッション管理
- ✅ マルチユーザー対応（複数人での会話をサポート）
- ✅ Row Level Security (RLS) による安全なデータアクセス
- ✅ 管理画面でのデータ可視化・エクスポート
- ✅ リアルタイム同期（別タブ・別ブラウザでデバッグ可能）

## 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（推奨: Northeast Asia (Tokyo)）
5. プロジェクト作成完了後、Settings > API から以下をコピー:
   - `Project URL`
   - `anon public` key

## 2. 環境変数の設定

`apps/web/.env.local` に以下を追加:

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application Configuration
NEXT_PUBLIC_APP_NAME=ATLAS

# Admin Users (comma-separated)
NEXT_PUBLIC_ADMIN_USERNAMES=admin

# Username Domain (default: test.com)
NEXT_PUBLIC_USERNAME_DOMAIN=test.com
```

## 3. マイグレーションの実行

### 方法 A: Supabase Dashboard（推奨）

1. Supabase Dashboard > SQL Editor を開く
2. 「New Query」をクリック
3. `migrations/001_create_ctide_tables.sql` の内容をコピー&ペースト
4. 「Run」をクリック
5. エラーがなければ `002_...sql` と `003_...sql` も順番に実行

### 方法 B: Supabase CLI

```bash
# Supabase CLI インストール
npm install -g supabase

# プロジェクトにリンク
cd apps/web
supabase link --project-ref your-project-ref

# マイグレーション実行
supabase db push
```

## 4. 認証設定（オプションだが推奨）

### メール認証を有効化

1. Supabase Dashboard > Authentication > Settings
2. 「Email」が有効になっていることを確認
3. 「Enable email confirmations」を **OFF** に設定（開発用）
   - 本番環境では **ON** に設定してください

### サインアップ制限（オプション）

- 「Allow new users to sign up」を OFF にすると、管理者のみユーザー作成可能

## 5. テーブル構成

### sessions

```sql
- id: UUID (主キー)
- created_at: timestamp
- user_id: UUID (auth.usersへの外部キー)
- username: text (作成者のユーザー名)
- notes: text (ブース名)
- tags: text[] (タグ配列)
- experiment_params: jsonb (実験パラメータ)
```

- ブース単位での会話セッション管理
- notes フィールドにブース名を保存

### utterances

```sql
- id: bigserial (主キー)
- session_id: UUID (sessionsへの外部キー)
- user_id: UUID (発話者のauth.users ID)
- username: text (発話者のユーザー名)
- speaker: text (表示用話者名、usernameと同じ)
- text: text (発話内容)
- timestamp: bigint (UNIX timestamp)
- created_at: timestamp
```

- マルチユーザー対応（RLS で保護）
- 認証済みユーザーのみ自分の発話を追加可能

### dependencies

```sql
- id: bigserial (主キー)
- session_id: UUID
- from_utterance_id: bigint (参照元発話)
- to_utterance_id: bigint (参照先発話)
- weight: double precision (依存度)
- type: text (local/topic/global)
- created_at: timestamp
```

- 発話間の時間的依存関係を記録

### important_utterances

```sql
- id: bigserial (主キー)
- session_id: UUID
- utterance_id: bigint
- importance_score: double precision
- created_at: timestamp
```

- 重要発言として検出された発話を記録

### session_stats (View)

```
- session_id: UUID
- utterance_count: bigint (発話数)
- important_count: bigint (重要発言数)
- avg_score: double precision (平均スコア)
```

- 管理画面用の統計ビュー（自動更新）

## 6. 使い方

### A. ログイン（/login）

1. `/login` にアクセス
2. ユーザー名を入力（3 文字以上、英数字と`_`、`-`のみ）
3. パスワードを入力
4. 「サインイン」または「サインアップ」
5. 成功すると `/` にリダイレクト

### B. ブース作成（/）

1. ブース名を入力（例: 「実験 A - 条件 1」）
2. 「ブースを作成して会話を開始」をクリック
3. 自動的に `/booth/[booth_id]` に遷移

### C. 会話（/booth/[booth_id]）

1. 「開始」ボタンで音声認識を開始
2. 話すと自動的に発話が記録される
3. 重要発言は緑色でハイライト
4. 「停止」で録音を停止
5. 「クリア」で会話をリセット

### D. 管理画面（/sessions） - 管理者のみ

1. すべてのセッションを一覧表示
2. ブース名、ユーザー名、統計情報を確認
3. 「JSON 出力」または「CSV 出力」でデータをエクスポート
4. 「表示」リンクでデバッグビューを開く

### E. デバッグビュー（/debug?session=xxx）

1. URL パラメータでセッション ID を指定
2. リアルタイムで会話を監視
3. 依存関係グラフを可視化
4. 管理者のみアクセス可能

### F. プログラムから使用

```typescript
import {
  createSession,
  saveUtterance,
  getSessionInfo,
} from "@/lib/supabase/ctide-session";
import type { BoothInfo } from "@/lib/supabase/ctide-session";

// ブース作成（ログイン必須）
const boothInfo: BoothInfo = {
  name: "実験A - 条件1",
};
const sessionId = await createSession(boothInfo);

// 発話追加（認証済みユーザーのみ）
await saveUtterance(sessionId, {
  id: 0,
  speaker: "john", // ログイン中のusername
  text: "Hello world",
  timestamp: Date.now(),
});

// セッション情報取得
const info = await getSessionInfo(sessionId);
console.log(info.username); // 作成者のユーザー名
console.log(info.boothName); // ブース名
```

### G. リアルタイム購読

```typescript
import { subscribeToUtterances } from "@/lib/supabase/ctide-session";

const channel = subscribeToUtterances(sessionId, (utterance) => {
  console.log("New utterance:", utterance);
});

// 購読解除
channel.unsubscribe();
```

## 7. トラブルシューティング

### エラー: "Session is missing"

- ブラウザの Cookie が無効になっている可能性があります
- シークレットモードでは認証が動作しない場合があります

### エラー: "new row violates row-level security policy"

- RLS ポリシーの設定を確認してください
- マイグレーションが正しく実行されているか確認

### リアルタイム同期が動かない

1. Supabase Dashboard > Database > Replication を確認
2. `utterances` と `ctide_scores` テーブルが Replication 対象になっているか確認
3. マイグレーション最後の `ALTER PUBLICATION` が実行されているか確認

## 8. セキュリティ設定

現在の設定（Row Level Security）:

- ✅ 誰でも全セッション・発話を閲覧可能（SELECT）
- ✅ ログインユーザーのみセッション作成可能（INSERT）
- ✅ 認証済みユーザーのみ自分の発話を追加可能（INSERT）
  - RLS ポリシー: `auth.uid() = user_id AND speaker = username`
- ✅ セッション作成者のみ更新・削除可能（UPDATE/DELETE）
- ✅ 管理画面は環境変数で指定したユーザーのみアクセス可能

この設定は **実験・研究目的** に最適化されています。
マルチユーザー会話を安全にサポートし、なりすましを防止します。
