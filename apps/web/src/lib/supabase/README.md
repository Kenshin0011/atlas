# Supabase Integration Guide

ATLASのSupabase統合に関する完全なガイド

---

## 📚 目次

1. [アーキテクチャ](#アーキテクチャ)
2. [セットアップ](#セットアップ)
3. [クライアント種別](#クライアント種別)
4. [データベーススキーマ](#データベーススキーマ)
5. [RLS（Row Level Security）](#rlsrow-level-security)
6. [Server Actions](#server-actions)
7. [リアルタイム購読](#リアルタイム購読)
8. [型生成](#型生成)
9. [トラブルシューティング](#トラブルシューティング)

---

## アーキテクチャ

### ファイル構成

```
apps/web/src/lib/supabase/
├── client.ts              # ブラウザクライアント
├── server.ts              # API Route用クライアント（未使用）
├── server-actions.ts      # Server Actions用クライアント
├── service-client.ts      # サービスロールクライアント（RLSバイパス）
├── session.ts             # セッションCRUD + リアルタイム購読
├── username.ts            # ユーザー名ヘルパー
├── database.types.ts      # 自動生成型定義
└── README.md              # このファイル
```

### データフロー

```
ブラウザ → Server Actions → Service Client → Supabase
              ↓                    ↓
        Validation           RLSバイパス
          (最小)              (高速)
```

---

## セットアップ

### 1. 環境変数設定

`.env.local`に以下を追加：

```bash
# Supabase Project Settings
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # 機密情報！

# Admin Users (comma-separated emails)
NEXT_PUBLIC_ADMIN_USERS=admin@example.com,admin2@example.com

# OpenAI API Key
OPENAI_API_KEY=sk-...
```

**注意**: `SUPABASE_SERVICE_ROLE_KEY`は**RLSをバイパス**するため、絶対にクライアント側で使用しないこと。

### 2. マイグレーション実行

Supabase Dashboard → SQL Editorで以下を順番に実行：

```sql
-- 1. 初期スキーマ
-- supabase/migrations/001_initial_schema.sql の内容をコピー＆実行

-- 2. RLS最適化（必須！）
-- supabase/migrations/002_fix_rls_policies.sql の内容をコピー＆実行
```

### 3. 型定義生成

```bash
cd apps/web
pnpm db:types
```

これで`database.types.ts`が自動生成されます。

---

## クライアント種別

ATLASでは用途に応じて4種類のクライアントを使い分けます。

### 1. Browser Client (`client.ts`)

**用途**: ブラウザ側での操作

```typescript
import { supabase } from '@/lib/supabase/client';

// 認証
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// データ取得（RLS制約あり）
const { data: sessions } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', userId);
```

**特徴**:
- ✅ Cookie-based SSR対応
- ✅ RLS制約が適用される（セキュリティ）
- ❌ サーバーサイドでは使えない

### 2. Server Actions Client (`server-actions.ts`)

**用途**: Server Actionsで認証情報を取得

```typescript
import { createServerActionClient } from '@/lib/supabase/server-actions';

export const someAction = async () => {
  'use server';

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ユーザー情報のみ取得、データ操作には使わない
};
```

**特徴**:
- ✅ Server ActionsでCookie取得可能
- ✅ 認証情報の取得に最適
- ⚠️ データ操作は遅い（RLS制約）

### 3. Service Client (`service-client.ts`) ⭐ **推奨**

**用途**: Server Actionsでのデータ操作（高速）

```typescript
import { createServiceClient } from '@/lib/supabase/server-actions';

export const saveUtteranceAction = async (utterance: Utterance) => {
  'use server';

  const supabase = createServiceClient();

  // RLSをバイパスして直接保存（高速）
  const { data, error } = await supabase
    .from('utterances')
    .insert({ ...utterance });
};
```

**特徴**:
- ✅ **RLSをバイパス**（最高速）
- ✅ Server Actionsに最適
- ⚠️ サーバーサイドのみで使用（クライアントNG）

### 4. Server Client (`server.ts`) - **未使用**

API Route用のクライアント。現在は使用していません。

---

## データベーススキーマ

### テーブル構成

```sql
sessions
├── id (UUID, PK)
├── created_at (TIMESTAMP)
├── user_id (UUID, FK → auth.users)
├── username (TEXT)
├── notes (TEXT) -- ブース名
├── tags (TEXT[])
└── experiment_params (JSONB)

utterances
├── id (BIGSERIAL, PK)
├── session_id (UUID, FK → sessions)
├── user_id (UUID, FK → auth.users)
├── username (TEXT)
├── speaker (TEXT)
├── text (TEXT)
├── timestamp (BIGINT)
└── created_at (TIMESTAMP)

scores
├── id (BIGSERIAL, PK)
├── session_id (UUID, FK → sessions)
├── utterance_id (BIGINT, FK → utterances)
├── score (JSONB) -- { utteranceId, score, pValue, rank, isImportant, detail }
└── created_at (TIMESTAMP)
UNIQUE(session_id, utterance_id)

dependencies
├── id (BIGSERIAL, PK)
├── session_id (UUID, FK → sessions)
├── from_utterance_id (BIGINT, FK → utterances) -- 依存元（アンカー）
├── to_utterance_id (BIGINT, FK → utterances)   -- 依存先（重要発話）
└── created_at (TIMESTAMP)
UNIQUE(session_id, from_utterance_id, to_utterance_id)
```

### リレーション

```
sessions (1) ─┬─ (N) utterances
              ├─ (N) scores
              └─ (N) dependencies

utterances (1) ─┬─ (N) scores
                ├─ (N) dependencies (as from)
                └─ (N) dependencies (as to)
```

---

## RLS（Row Level Security）

### 最適化方針

**002_fix_rls_policies.sql**でRLSを最適化し、パフォーマンスを向上させています。

### ポリシー概要

#### sessions

```sql
-- 誰でも閲覧可能
SELECT: true

-- 認証ユーザーは自分のセッションを作成可能
INSERT: auth.uid() = user_id

-- 未認証ユーザーもセッション作成可能
INSERT: user_id IS NULL

-- 更新・削除は所有者のみ
UPDATE/DELETE: auth.uid() = user_id OR user_id IS NULL
```

#### utterances

```sql
-- 誰でも閲覧可能
SELECT: true

-- 認証ユーザーは発話を保存可能
INSERT: auth.uid() = user_id

-- 未認証ユーザーも発話を保存可能
INSERT: user_id IS NULL
```

#### scores / dependencies

```sql
-- 誰でも閲覧可能
SELECT: true

-- セッションが存在すれば誰でも保存可能（パフォーマンス優先）
INSERT/UPDATE: EXISTS (SELECT 1 FROM sessions WHERE id = session_id)
```

### Service Clientの必要性

RLSポリシーは柔軟ですが、Server ActionsではCookieベースの認証が制限されるため、**Service Client（RLSバイパス）**を使うことでパフォーマンスを向上させています。

---

## Server Actions

### 最適化ポイント

#### 1. Zodバリデーション削除

**Before**:
```typescript
const result = analyzeRequestSchema.parse({
  history,  // 全発話をバリデーション → 遅い！
  current,
  options,
});
```

**After**:
```typescript
if (!current?.text?.trim()) {
  throw new Error('Current utterance text is required');
}
// 最小限のチェックのみ
```

#### 2. Service Client使用

**Before**:
```typescript
const supabase = await createServerActionClient();  // RLS制約あり
const { data, error } = await supabase.from('utterances').insert(...);
```

**After**:
```typescript
const supabase = createServiceClient();  // RLSバイパス → 高速！
const { data, error } = await supabase.from('utterances').insert(...);
```

### 実装例

```typescript
// apps/web/src/app/actions/session.ts

'use server';

export const saveUtteranceAction = async (
  sessionId: string,
  utterance: Utterance,
  userId?: string | null,
  username?: string | null
): Promise<number> => {
  try {
    // Service Clientを使用（RLSバイパス）
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('utterances')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        username: username || null,
        speaker: utterance.speaker,
        text: utterance.text,
        timestamp: utterance.timestamp,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('[saveUtteranceAction] Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save utterance');
  }
};
```

---

## リアルタイム購読

### 基本構成

Supabase Realtimeを使って、複数ユーザー間でデータをリアルタイム同期します。

### 実装例

```typescript
// apps/web/src/lib/supabase/session.ts

export const subscribeToUtterances = (
  sessionId: string,
  onUtterance: (utterance: Utterance) => void,
  onDelete?: () => void
) => {
  const channel = supabase.channel(`utterances:${sessionId}`);

  // INSERT イベント
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'utterances',
      filter: `session_id=eq.${sessionId}`,
    },
    payload => {
      const row = payload.new;
      onUtterance({
        id: row.id as number,
        speaker: row.speaker as string,
        text: row.text as string,
        timestamp: row.timestamp as number,
      });
    }
  );

  // DELETE イベント（履歴リセット検出）
  if (onDelete) {
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'utterances',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onDelete();
      }
    );
  }

  return channel.subscribe();
};
```

### チャンネル設計

- `utterances:${sessionId}` - 発話の追加/削除
- `scores:${sessionId}` - スコアの追加/更新
- `dependencies:${sessionId}` - 依存関係の追加

### 注意点

- チャンネルは`unsubscribe()`で必ずクリーンアップすること
- `useEffect`のクリーンアップ関数で購読解除
- 重複チェックを実装して同じデータを二重追加しない

---

## 型生成

### コマンド

```bash
cd apps/web
pnpm db:types
```

### 仕組み

`package.json`に定義されたスクリプト：

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/supabase/database.types.ts"
  }
}
```

### 環境変数

`.env.local`に`SUPABASE_PROJECT_ID`が必要：

```bash
SUPABASE_PROJECT_ID=your-project-id
```

プロジェクトIDは、Supabase DashboardのURLから取得：
```
https://app.supabase.com/project/[your-project-id]
```

### 生成される型

```typescript
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: { id: string; created_at: string; ... };
        Insert: { id?: string; created_at?: string; ... };
        Update: { id?: string; created_at?: string; ... };
      };
      // ...
    };
  };
};
```

### 使用例

```typescript
import type { Database } from './database.types';

type Session = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
```

---

## トラブルシューティング

### エラー: "Row Level Security policy violation"

**原因**: RLSポリシーが厳しすぎる、または`SUPABASE_SERVICE_ROLE_KEY`が未設定

**対策**:
1. `002_fix_rls_policies.sql`を実行
2. `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`を設定
3. Server Actionsで`createServiceClient()`を使用

### エラー: "Failed to connect to Supabase"

**原因**: 環境変数の設定ミス

**対策**:
1. `.env.local`に正しいURLとキーを設定
2. Next.js開発サーバーを再起動（`pnpm dev`）

### エラー: "Type 'X' is not assignable to type 'Y'"

**原因**: 型定義が古い

**対策**:
```bash
cd apps/web
pnpm db:types
```

### リアルタイム購読が動かない

**原因**: Realtimeが有効化されていない

**対策**:
1. Supabase Dashboard → Database → Replication
2. `utterances`, `scores`, `dependencies`テーブルのReplicationを有効化
3. または、マイグレーションで自動設定：
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE utterances;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE dependencies;
```

### パフォーマンスが遅い

**原因**: RLS制約、またはZodバリデーションのオーバーヘッド

**対策**:
1. Server Actionsで`createServiceClient()`を使用
2. Zodバリデーションを削除（既に実施済み）
3. インデックスを確認（`001_initial_schema.sql`で設定済み）

---

## ベストプラクティス

### ✅ DO

- Server Actionsでは`createServiceClient()`を使用
- 型定義は常に最新に保つ（`pnpm db:types`）
- リアルタイム購読は必ず`unsubscribe()`
- エラーハンドリングを適切に実装

### ❌ DON'T

- クライアント側で`SUPABASE_SERVICE_ROLE_KEY`を使用
- 型定義を手動編集
- Zodで全発話をバリデーション（パフォーマンス低下）
- RLSをバイパスしたまま本番環境へデプロイ（セキュリティリスク）

---

## 参考リンク

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
