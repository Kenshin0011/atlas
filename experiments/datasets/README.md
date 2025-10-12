# データセット形式

## データセット構造

```json
{
  "metadata": {
    "name": "データセット名",
    "description": "説明",
    "created_at": "2025-01-15T00:00:00Z",
    "source": "データソース",
    "ground_truth": true
  },
  "conversations": [
    {
      "id": "conv_001",
      "utterances": [
        {
          "id": 1,
          "text": "発話テキスト",
          "timestamp": 1705276800000,
          "speaker": "A"
        }
      ],
      "annotations": {
        "important_ids": [3, 7, 12],
        "notes": "アノテーション補足"
      }
    }
  ]
}
```

## フィールド説明

### metadata

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | string | データセット名 |
| `description` | string | データセットの説明 |
| `created_at` | string | 作成日時（ISO 8601） |
| `source` | string | データソース（例: "実験", "収集"） |
| `ground_truth` | boolean | 正解アノテーションがあるか |

### conversations

各会話は以下の構造：

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | 会話ID |
| `utterances` | Utterance[] | 発話リスト |
| `annotations` | object | 正解アノテーション（任意） |

### utterances

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | number | 発話ID |
| `text` | string | 発話テキスト |
| `timestamp` | number | タイムスタンプ（ミリ秒） |
| `speaker` | string | 発話者 |

### annotations（任意）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `important_ids` | number[] | 重要発話のIDリスト |
| `notes` | string | 補足情報 |

## データセット作成方法

### 1. 実験データから作成

```bash
cd experiments/scripts
pnpm tsx convert-experimental-data.ts input.csv output.json
```

### 2. 手動作成

`sample.json` をコピーして編集：

```bash
cp datasets/sample.json datasets/my_dataset.json
```

### 3. 既存会話ログから変換

Webシステムのセッションエクスポート機能を使用：
- `/sessions` → データエクスポート → JSON
- 必要に応じてアノテーションを追加

## 正解データのアノテーション

重要発話の正解データを用意する場合：

1. 複数のアノテーター（3名以上推奨）が独立に重要発話を選択
2. 多数決または一致度で正解を決定
3. `annotations.important_ids` に記録

### アノテーション基準（例）

- 話題の転換点
- 重要な決定事項
- 後続の発話で参照される発話
- 聞き逃すと文脈が分からなくなる発話
