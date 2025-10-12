# Supabase Setup for CTIDE

## 概要

CTIDE AssistantはSupabaseを使用して以下を実現します:
- ✅ 会話セッションの永続化
- ✅ リアルタイム同期（別タブ・別ブラウザでデバッグ可能）
- ✅ ユーザー認証とセッション所有者管理
- ✅ URLで会話を共有可能（誰でも閲覧、オーナーのみ編集）

## 1. Supabaseプロジェクトの作成

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
```

## 3. マイグレーションの実行

### 方法A: Supabase Dashboard（推奨）

1. Supabase Dashboard > SQL Editor を開く
2. 「New Query」をクリック
3. `apps/web/supabase/migrations/001_create_ctide_tables.sql` の内容をコピー&ペースト
4. 「Run」をクリック
5. 続けて `002_add_user_id_to_sessions.sql` も実行

### 方法B: Supabase CLI

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
- speaker_name: text
- user_id: UUID (作成者、auth.usersへの外部キー)
- user_email: text (表示用)
```
- セッションの所有者を記録
- URLで共有可能（誰でも閲覧、オーナーのみ編集）

### utterances
```sql
- id: bigserial (主キー)
- session_id: UUID (sessionsへの外部キー)
- speaker: text
- text: text
- timestamp: bigint
- created_at: timestamp
```
- リアルタイム購読有効
- セッションオーナーのみ追加可能

### ctide_scores
```sql
- id: bigserial (主キー)
- session_id: UUID
- utterance_id: bigint
- score: jsonb (CtideScore全体)
- created_at: timestamp
```
- リアルタイム購読有効
- JSON形式で詳細スコアを保存

## 6. 使い方

### A. 会話を開始（/ctide）

1. `/ctide` にアクセス
2. ログインボタンをクリック（初回のみ）
3. サインアップ（メールアドレス + パスワード）
4. 話者名を入力
5. 「開始」ボタンで会話開始
6. ヘッダーに「デバッグURL」が表示される

### B. デバッグモードで表示（/ctide/debug）

**同じブラウザで別タブ:**
1. デバッグURLをコピー（例: `/ctide/debug?session=xxx`）
2. 新しいタブで開く
3. リアルタイムで会話とスコアが同期される

**別のブラウザ・別の人と共有:**
1. デバッグURLを共有
2. 相手が開くと読み取り専用モードで表示
3. リアルタイムで会話を監視可能

### C. プログラムから使用

```typescript
import { createSession, saveUtterance, getSessionInfo } from '@/lib/supabase/ctide-session';

// セッション作成（ログイン必須）
const sessionId = await createSession('John');

// 発話追加
await saveUtterance(sessionId, {
  id: 0,
  speaker: 'John',
  text: 'Hello world',
  timestamp: Date.now(),
});

// セッション情報取得
const info = await getSessionInfo(sessionId);
console.log(info.userEmail); // 作成者のメールアドレス
```

### D. リアルタイム購読

```typescript
import { subscribeToUtterances } from '@/lib/supabase/ctide-session';

const channel = subscribeToUtterances(sessionId, (utterance) => {
  console.log('New utterance:', utterance);
});

// 購読解除
channel.unsubscribe();
```

## 7. トラブルシューティング

### エラー: "Session is missing"

- ブラウザのCookieが無効になっている可能性があります
- シークレットモードでは認証が動作しない場合があります

### エラー: "new row violates row-level security policy"

- RLSポリシーの設定を確認してください
- マイグレーションが正しく実行されているか確認

### リアルタイム同期が動かない

1. Supabase Dashboard > Database > Replication を確認
2. `utterances` と `ctide_scores` テーブルがReplication対象になっているか確認
3. マイグレーション最後の `ALTER PUBLICATION` が実行されているか確認

## 8. セキュリティ設定

現在の設定:
- ✅ 誰でも全セッションを閲覧可能（URLで共有）
- ✅ ログインユーザーのみセッション作成可能
- ✅ セッションオーナーのみ発話追加・スコア保存可能
- ✅ セッションオーナーのみ更新・削除可能

この設定は **デバッグ・実験目的** に最適化されています。
本番環境では追加のアクセス制御を検討してください。
