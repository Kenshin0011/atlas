# ATLAS 実験環境

会話データセットを使用したオフライン分析・評価環境

---

## 📁 ディレクトリ構成

```
experiments/
├── datasets/                              # データセット
│   ├── README.md                         # データセット形式説明
│   ├── sample.json                       # サンプルデータ
│   └── *.txt                             # 生データ（.gitignore）
├── scripts/                               # 実行スクリプト
│   ├── analyze.ts                        # 分析実行
│   ├── evaluate.ts                       # 結果評価
│   ├── convert-txt-to-json.ts            # 単一txt→JSON変換
│   └── convert-batch-txt-to-json.ts      # 複数txt一括変換
├── results/                               # 実験結果（.gitignore）
│   └── YYYY-MM-DD_dataset_name/
│       ├── analysis.json                 # 分析結果
│       ├── metrics.json                  # 評価指標
│       └── report.md                     # レポート
└── README.md                              # このファイル
```

---

## 🚀 クイックスタート

### 1. 環境変数を設定

```bash
export OPENAI_API_KEY="sk-..."
```

### 2. サンプルデータで分析を実行

```bash
cd experiments/scripts
pnpm tsx analyze.ts ../datasets/sample.json
```

出力例:
```
📂 データセット: /path/to/sample.json
📁 出力先: /path/to/results/2025-01-15_sample

📖 データセット読み込み中...
✅ 1件の会話を読み込みました

🔧 アダプタ初期化中...
📊 分析パラメータ: { k: 6, alphaMix: 0.6, ... }

🔍 分析開始...
[1/1] conv_001
  発話数: 18
  進捗: 18/18 発話
  ✅ 完了 (5234ms)
  重要発話: 4個

💾 結果を保存中...
✅ 保存完了: /path/to/results/2025-01-15_sample/analysis.json

📊 サマリー
──────────────────────────────────────────────────
会話数: 1
総発話数: 17
重要発話数: 4 (23.5%)
平均処理時間: 5234ms/会話
最終アンカー数: 4

✨ 分析完了！
次のステップ: tsx evaluate.ts /path/to/results/2025-01-15_sample/analysis.json
```

### 3. 結果を評価（正解データがある場合）

```bash
pnpm tsx evaluate.ts ../results/2025-01-15_sample/analysis.json ../datasets/sample.json
```

出力例:
```
📂 分析結果: /path/to/analysis.json
✅ 1件の会話結果を読み込みました
📂 データセット: /path/to/sample.json
✅ 1件の会話（正解データ）を読み込みました

📊 スコア統計を計算中...

🎯 評価指標を計算中...
  conv_001:
    Precision: 100.0%
    Recall: 75.0%
    F1: 85.7%

💾 レポート保存中...
✅ 保存完了
  - /path/to/results/2025-01-15_sample/metrics.json
  - /path/to/results/2025-01-15_sample/report.md

📊 評価サマリー
──────────────────────────────────────────────────
スコア平均: 0.234
スコア中央値: 0.198
スコア標準偏差: 0.145

精度指標:
  Precision: 100.0%
  Recall: 75.0%
  F1 Score: 85.7%

✨ 評価完了！
```

---

## 📝 詳細な使い方

### データセットの準備

#### 方法1: サンプルをコピーして編集

```bash
cp datasets/sample.json datasets/my_dataset.json
# my_dataset.jsonを編集
```

#### 方法2: Webシステムからエクスポート

1. Webシステムで会話を実施
2. `/sessions` → 対象セッションを選択 → データエクスポート
3. JSONファイルをダウンロード
4. `datasets/` に配置
5. 必要に応じて `annotations.important_ids` を追加

#### 方法3: A: B: 形式のtxtファイルから変換

既存の会話ログ（`A: テキスト` / `B: テキスト` 形式）がある場合：

**単一ファイルの変換:**
```bash
cd experiments/scripts
pnpm tsx convert-txt-to-json.ts ../datasets/conversation.txt
```

**複数ファイルの一括変換（推奨）:**

複数のtxtファイルがある場合、バッチ変換スクリプトで一括処理できます：

```bash
cd experiments/scripts

# datasetsディレクトリ内のすべてのtxtファイルを変換
pnpm tsx convert-batch-txt-to-json.ts ../datasets/

# 最初の1000ファイルのみ変換
pnpm tsx convert-batch-txt-to-json.ts ../datasets/ ../datasets/conversations_1000.json --limit 1000
```

出力例:
```
📂 入力ディレクトリ: /path/to/datasets
📁 出力ファイル: /path/to/conversations_1000.json
🔢 制限: 最初の1000ファイル

📖 txtファイルを検索中...
✅ 1000個のtxtファイルを発見しました

🔄 解析中...
  進捗: 1000/1000 ファイル
✅ 1000会話、12337発話を解析しました

📊 話者別統計:
  A: 6294発話
  B: 6043発話

💾 保存中...
✅ 保存完了: /path/to/conversations_1000.json

✨ 変換完了！
次のステップ: tsx analyze.ts /path/to/conversations_1000.json
```

**注意**:
- 各txtファイルは独立した会話（conversation）として扱われます
- 変換後のデータセットには正解ラベル（`annotations.important_ids`）が含まれないため、評価指標は計算できません。スコア統計のみ確認可能です。

データセット形式の詳細は `datasets/README.md` を参照。

### 分析パラメータのカスタマイズ

`scripts/analyze.ts` の `params` オブジェクトを編集：

```typescript
const params = {
  k: 6,              // 直近k文を評価
  alphaMix: 0.6,     // 損失重視度
  halfLifeTurns: 20, // 半減期
  nullSamples: 8,    // 帰無サンプル数
  fdrAlpha: 0.1,     // FDR閾値
  mmrLambda: 0.7,    // MMR重要度重視度
};
```

または、カスタムスクリプトを作成：

```typescript
import { analyze, OpenAIAdapter } from '@atlas/core';

const adapter = new OpenAIAdapter({ apiKey: '...' });
const result = await analyze(adapter, history, current, {
  k: 10,           // より多くの発話を評価
  fdrAlpha: 0.05,  // より厳しい閾値
});
```

### 複数データセットのバッチ処理

```bash
for dataset in datasets/*.json; do
  echo "Processing $dataset"
  pnpm tsx analyze.ts "$dataset"
done
```

---

## 📊 出力ファイル

### `analysis.json`

分析結果の完全なデータ：

```json
{
  "metadata": { ... },
  "analysis_params": { ... },
  "timestamp": "2025-01-15T12:00:00Z",
  "results": [
    {
      "conversation_id": "conv_001",
      "utterances": [
        {
          "id": 3,
          "text": "まず、新製品の開発スケジュールについて確認します",
          "rank": 1,
          "score": 0.456,
          "p_value": 0.023,
          "is_important": true,
          "detail": { ... }
        }
      ],
      "important_utterances": [3, 7, 12, 17],
      "anchor_count": 4,
      "processing_time_ms": 5234
    }
  ]
}
```

### `metrics.json`

評価指標（正解データがある場合）：

```json
{
  "dataset_name": "サンプル会話データセット",
  "timestamp": "2025-01-15T12:00:00Z",
  "has_ground_truth": true,
  "overall_metrics": {
    "avg_precision": 1.0,
    "avg_recall": 0.75,
    "avg_f1_score": 0.857
  },
  "per_conversation": [ ... ],
  "score_statistics": {
    "mean": 0.234,
    "median": 0.198,
    "std": 0.145,
    "percentiles": { ... }
  }
}
```

### `report.md`

可読性の高いMarkdownレポート：

```markdown
# 分析評価レポート

**データセット**: サンプル会話データセット
**評価日時**: 2025-01-15T12:00:00Z

## スコア統計

| 指標 | 値 |
|------|-----|
| 平均 | 0.234 |
| 中央値 | 0.198 |
...

## 評価指標

### 全体

| 指標 | 値 |
|------|-----|
| Precision | 100.0% |
| Recall | 75.0% |
| F1 Score | 85.7% |
...
```

---

## 🧪 実験例

### 例1: パラメータチューニング

異なるパラメータで分析し、最適値を探索：

```bash
# FDR閾値を変えて実験
for alpha in 0.05 0.1 0.15 0.2; do
  # analyze.ts の fdrAlpha を変更して実行
  echo "Testing fdrAlpha=$alpha"
  pnpm tsx analyze.ts datasets/sample.json results/alpha_$alpha
done

# 結果を比較
for dir in results/alpha_*; do
  pnpm tsx evaluate.ts $dir/analysis.json datasets/sample.json
done
```

### 例2: 複数データセットでの汎化性能評価

```bash
# 各データセットで評価
for dataset in datasets/*.json; do
  name=$(basename $dataset .json)
  pnpm tsx analyze.ts $dataset results/eval_$name
  pnpm tsx evaluate.ts results/eval_$name/analysis.json $dataset
done

# 結果を集計
cat results/eval_*/metrics.json | jq '.overall_metrics'
```

### 例3: アンカーメモリの効果検証

```bash
# アンカーメモリなしで分析（analyze.tsを修正）
pnpm tsx analyze-no-anchors.ts datasets/sample.json results/no_anchors

# アンカーメモリありで分析
pnpm tsx analyze.ts datasets/sample.json results/with_anchors

# 結果を比較
diff results/no_anchors/metrics.json results/with_anchors/metrics.json
```

---

## 📈 評価指標の解釈

### Precision（適合率）

```
Precision = TP / (TP + FP)
```

予測した重要発話のうち、実際に重要だったものの割合。
- 高い = 誤検出が少ない
- 低い = 無駄な通知が多い

### Recall（再現率）

```
Recall = TP / (TP + FN)
```

実際の重要発話のうち、正しく検出できたものの割合。
- 高い = 見逃しが少ない
- 低い = 重要な発話を見逃している

### F1 Score

```
F1 = 2 × (Precision × Recall) / (Precision + Recall)
```

PrecisionとRecallの調和平均。バランスの取れた指標。

---

## 🔧 トラブルシューティング

### `OPENAI_API_KEY is not set`

```bash
export OPENAI_API_KEY="sk-..."
```

### `Module not found: @atlas/core`

プロジェクトルートで依存関係をインストール：

```bash
cd ../..
pnpm install
```

### メモリ不足エラー

大規模データセットの場合、Node.jsのメモリを増やす：

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm tsx analyze.ts large_dataset.json
```

### 処理が遅い

- `nullSamples` を減らす（8 → 4）
- `k` を減らす（6 → 4）
- 埋め込みキャッシュを活用（同じテキストは再計算しない）

---

## 📚 参考資料

- [データセット形式](./datasets/README.md)
- [@atlas/core API](../packages/atlas-core/README.md)
- [メインREADME](../README.md)

---

## 💡 ヒント

1. **小さなデータセットから始める** - まずsample.jsonで動作確認
2. **正解データを用意する** - 評価指標が計算できる
3. **パラメータを記録する** - 実験の再現性のため
4. **結果を可視化する** - metrics.jsonをグラフ化
5. **複数のアノテーターで正解を作成** - 信頼性の高い評価

---

## 🤝 貢献

新しいデータセットや評価スクリプトの追加を歓迎します！
