# Atlas Database ER Diagram

## テーブル構造

```
┌─────────────────────────────────────────┐
│             sessions                     │
├─────────────────────────────────────────┤
│ id (PK)              UUID                │
│ created_at           TIMESTAMP           │
│ user_id (FK)         UUID → auth.users  │
│ username             TEXT                │
│ notes                TEXT                │
│ tags                 TEXT[]              │
│ experiment_params    JSONB               │
└─────────────────────────────────────────┘
             │
             │ 1
             │
             │ *
  ┌──────────┴───────────┬──────────────┬──────────────┐
  │                      │              │              │
  ▼                      ▼              ▼              ▼
┌────────────┐    ┌────────────┐  ┌────────────┐  ┌────────────┐
│utterances  │    │  scores    │  │dependencies│  │dependencies│
├────────────┤    ├────────────┤  ├────────────┤  ├────────────┤
│id (PK)     │    │id (PK)     │  │id (PK)     │  │id (PK)     │
│session_id ─┼───→│session_id ─┤  │session_id ─┤  │session_id ─┤
│user_id     │    │utterance_id│  │from_utt_id │  │to_utt_id   │
│username    │    │score       │  │to_utt_id   │  │created_at  │
│speaker     │    │created_at  │  │created_at  │  └────────────┘
│text        │    └────────────┘  └────────────┘
│timestamp   │           │               │
│created_at  │           │               │
└────────────┘           │               │
     │                   │               │
     │                   │               │
     └───────────────────┘               │
           1              *               │
           │           ─────              │
           │          /     \             │
           └─────────/       \────────────┘
                    1         1
                 (from)     (to)
```

## リレーション

### 1. sessions → utterances (1:N)
- 1つのセッションに複数の発話が含まれる
- `utterances.session_id` → `sessions.id`
- CASCADE DELETE: セッション削除時に発話も削除

### 2. sessions → scores (1:N)
- 1つのセッションに複数のスコアが含まれる
- `scores.session_id` → `sessions.id`
- CASCADE DELETE: セッション削除時にスコアも削除

### 3. utterances → scores (1:1)
- 1つの発話に1つのスコア
- `scores.utterance_id` → `utterances.id`
- CASCADE DELETE: 発話削除時にスコアも削除
- UNIQUE制約: `(session_id, utterance_id)`

### 4. sessions → dependencies (1:N)
- 1つのセッションに複数の依存関係が含まれる
- `dependencies.session_id` → `sessions.id`
- CASCADE DELETE: セッション削除時に依存関係も削除

### 5. utterances → dependencies (1:N, from)
- 1つの発話から複数の依存関係が出る（アンカー発話）
- `dependencies.from_utterance_id` → `utterances.id`
- CASCADE DELETE: 発話削除時に依存関係も削除

### 6. utterances → dependencies (1:N, to)
- 1つの発話に複数の依存関係が入る（依存発話）
- `dependencies.to_utterance_id` → `utterances.id`
- CASCADE DELETE: 発話削除時に依存関係も削除
- UNIQUE制約: `(session_id, from_utterance_id, to_utterance_id)`

## データ例

```
sessions:
┌──────────────────────────────────┬────────────┬──────────┐
│ id                               │ username   │ notes    │
├──────────────────────────────────┼────────────┼──────────┤
│ 123e4567-e89b-12d3-a456-...      │ alice      │ Meeting  │
└──────────────────────────────────┴────────────┴──────────┘

utterances:
┌────┬──────────┬──────────┬─────────────────────┐
│ id │ session  │ speaker  │ text                │
├────┼──────────┼──────────┼─────────────────────┤
│ 1  │ 123e...  │ alice    │ 予算は500万円です   │
│ 2  │ 123e...  │ bob      │ 開発期間は3ヶ月     │
│ 3  │ 123e...  │ alice    │ その予算で大丈夫？  │
└────┴──────────┴──────────┴─────────────────────┘

scores:
┌────┬──────────┬──────────┬────────────────────┐
│ id │ session  │ utt_id   │ score (JSONB)      │
├────┼──────────┼──────────┼────────────────────┤
│ 1  │ 123e...  │ 1        │ {score: 0.85, ...} │
│ 2  │ 123e...  │ 2        │ {score: 0.72, ...} │
│ 3  │ 123e...  │ 3        │ {score: 0.91, ...} │
└────┴──────────┴──────────┴────────────────────┘

dependencies:
┌────┬──────────┬──────────┬──────────┐
│ id │ session  │ from_id  │ to_id    │
├────┼──────────┼──────────┼──────────┤
│ 1  │ 123e...  │ 1        │ 3        │  ← 発話3は発話1に依存
│ 2  │ 123e...  │ 2        │ 3        │  ← 発話3は発話2にも依存
└────┴──────────┴──────────┴──────────┘
```

この例では、発話3「その予算で大丈夫？」が発話1「予算は500万円です」と発話2「開発期間は3ヶ月」の両方に依存していることを示しています。

## インデックス

- `sessions`: `user_id`, `username`, `created_at`
- `utterances`: `session_id`, `user_id`, `created_at`
- `scores`: `session_id`, `utterance_id`
- `dependencies`: `session_id`, `from_utterance_id`, `to_utterance_id`
