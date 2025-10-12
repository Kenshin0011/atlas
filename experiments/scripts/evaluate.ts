/**
 * 分析結果評価スクリプト
 * 正解データと比較して評価指標を計算
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// 型定義
type Dataset = {
  metadata: {
    name: string;
    ground_truth: boolean;
  };
  conversations: Array<{
    id: string;
    utterances: Array<{ id: number; text: string }>;
    annotations?: {
      important_ids: number[];
    };
  }>;
};

type AnalysisResult = {
  metadata: Dataset['metadata'];
  results: Array<{
    conversation_id: string;
    utterances: Array<{
      id: number;
      text: string;
      score: number;
      p_value?: number;
      is_important: boolean;
    }>;
    important_utterances: number[];
  }>;
};

type EvaluationMetrics = {
  conversation_id: string;
  precision: number;
  recall: number;
  f1_score: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  predicted_count: number;
  ground_truth_count: number;
};

type EvaluationReport = {
  dataset_name: string;
  timestamp: string;
  has_ground_truth: boolean;
  overall_metrics?: {
    avg_precision: number;
    avg_recall: number;
    avg_f1_score: number;
    total_utterances: number;
    total_predicted: number;
    total_ground_truth: number;
  };
  per_conversation: EvaluationMetrics[];
  score_statistics: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    percentiles: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
    };
  };
};

/**
 * 評価指標を計算
 */
function calculateMetrics(
  predicted: number[],
  groundTruth: number[]
): Omit<EvaluationMetrics, 'conversation_id'> {
  const predictedSet = new Set(predicted);
  const groundTruthSet = new Set(groundTruth);

  const truePositives = [...predictedSet].filter(id => groundTruthSet.has(id)).length;
  const falsePositives = [...predictedSet].filter(id => !groundTruthSet.has(id)).length;
  const falseNegatives = [...groundTruthSet].filter(id => !predictedSet.has(id)).length;

  const precision = predictedSet.size > 0 ? truePositives / predictedSet.size : 0;
  const recall = groundTruthSet.size > 0 ? truePositives / groundTruthSet.size : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision,
    recall,
    f1_score: f1Score,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    predicted_count: predictedSet.size,
    ground_truth_count: groundTruthSet.size,
  };
}

/**
 * 統計量を計算
 */
function calculateStatistics(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    mean,
    median: percentile(50),
    std,
    min: sorted[0],
    max: sorted[n - 1],
    percentiles: {
      p25: percentile(25),
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('使い方: tsx evaluate.ts <analysis.json> [dataset.json]');
    console.error('例: tsx evaluate.ts ../results/sample/analysis.json ../datasets/sample.json');
    process.exit(1);
  }

  const analysisPath = path.resolve(args[0]);
  const outputDir = path.dirname(analysisPath);

  console.log('📂 分析結果:', analysisPath);

  // 分析結果読み込み
  const analysisJson = await fs.readFile(analysisPath, 'utf-8');
  const analysis: AnalysisResult = JSON.parse(analysisJson);

  console.log(`✅ ${analysis.results.length}件の会話結果を読み込みました`);

  // データセット読み込み（オプション）
  let dataset: Dataset | null = null;
  if (args[1]) {
    const datasetPath = path.resolve(args[1]);
    console.log('📂 データセット:', datasetPath);
    const datasetJson = await fs.readFile(datasetPath, 'utf-8');
    dataset = JSON.parse(datasetJson);
    console.log(`✅ ${dataset.conversations.length}件の会話（正解データ）を読み込みました`);
  }

  // スコア統計
  console.log('\n📊 スコア統計を計算中...');
  const allScores = analysis.results.flatMap(r => r.utterances.map(u => u.score));
  const scoreStats = calculateStatistics(allScores);

  // 評価指標（正解データがある場合のみ）
  const perConversation: EvaluationMetrics[] = [];
  let hasGroundTruth = false;

  if (dataset?.metadata.ground_truth) {
    console.log('\n🎯 評価指標を計算中...');
    hasGroundTruth = true;

    for (const result of analysis.results) {
      const conv = dataset.conversations.find(c => c.id === result.conversation_id);
      if (!conv?.annotations?.important_ids) {
        console.warn(`⚠️  ${result.conversation_id}: 正解データなし`);
        continue;
      }

      const metrics = calculateMetrics(result.important_utterances, conv.annotations.important_ids);

      perConversation.push({
        conversation_id: result.conversation_id,
        ...metrics,
      });

      console.log(`  ${result.conversation_id}:`);
      console.log(`    Precision: ${(metrics.precision * 100).toFixed(1)}%`);
      console.log(`    Recall: ${(metrics.recall * 100).toFixed(1)}%`);
      console.log(`    F1: ${(metrics.f1_score * 100).toFixed(1)}%`);
    }
  }

  // 全体指標
  let overallMetrics: EvaluationReport['overall_metrics'];
  if (hasGroundTruth && perConversation.length > 0) {
    const totalUtterances = analysis.results.reduce((sum, r) => sum + r.utterances.length, 0);
    const totalPredicted = perConversation.reduce((sum, m) => sum + m.predicted_count, 0);
    const totalGroundTruth = perConversation.reduce((sum, m) => sum + m.ground_truth_count, 0);

    overallMetrics = {
      avg_precision:
        perConversation.reduce((sum, m) => sum + m.precision, 0) / perConversation.length,
      avg_recall: perConversation.reduce((sum, m) => sum + m.recall, 0) / perConversation.length,
      avg_f1_score:
        perConversation.reduce((sum, m) => sum + m.f1_score, 0) / perConversation.length,
      total_utterances: totalUtterances,
      total_predicted: totalPredicted,
      total_ground_truth: totalGroundTruth,
    };
  }

  // レポート作成
  const report: EvaluationReport = {
    dataset_name: analysis.metadata.name,
    timestamp: new Date().toISOString(),
    has_ground_truth: hasGroundTruth,
    overall_metrics: overallMetrics,
    per_conversation: perConversation,
    score_statistics: scoreStats,
  };

  // 保存
  console.log('\n💾 レポート保存中...');
  await fs.writeFile(path.join(outputDir, 'metrics.json'), JSON.stringify(report, null, 2));

  // Markdownレポート生成
  const markdown = generateMarkdownReport(report, analysis);
  await fs.writeFile(path.join(outputDir, 'report.md'), markdown);

  console.log('✅ 保存完了');
  console.log(`  - ${path.join(outputDir, 'metrics.json')}`);
  console.log(`  - ${path.join(outputDir, 'report.md')}`);

  // サマリー表示
  console.log('\n📊 評価サマリー');
  console.log('─'.repeat(50));
  console.log(`スコア平均: ${scoreStats.mean.toFixed(3)}`);
  console.log(`スコア中央値: ${scoreStats.median.toFixed(3)}`);
  console.log(`スコア標準偏差: ${scoreStats.std.toFixed(3)}`);

  if (overallMetrics) {
    console.log('\n精度指標:');
    console.log(`  Precision: ${(overallMetrics.avg_precision * 100).toFixed(1)}%`);
    console.log(`  Recall: ${(overallMetrics.avg_recall * 100).toFixed(1)}%`);
    console.log(`  F1 Score: ${(overallMetrics.avg_f1_score * 100).toFixed(1)}%`);
  }

  console.log('\n✨ 評価完了！');
}

/**
 * Markdownレポート生成
 */
function generateMarkdownReport(report: EvaluationReport, analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`# 分析評価レポート`);
  lines.push('');
  lines.push(`**データセット**: ${report.dataset_name}`);
  lines.push(`**評価日時**: ${report.timestamp}`);
  lines.push('');

  // スコア統計
  lines.push('## スコア統計');
  lines.push('');
  lines.push('| 指標 | 値 |');
  lines.push('|------|-----|');
  lines.push(`| 平均 | ${report.score_statistics.mean.toFixed(3)} |`);
  lines.push(`| 中央値 | ${report.score_statistics.median.toFixed(3)} |`);
  lines.push(`| 標準偏差 | ${report.score_statistics.std.toFixed(3)} |`);
  lines.push(`| 最小値 | ${report.score_statistics.min.toFixed(3)} |`);
  lines.push(`| 最大値 | ${report.score_statistics.max.toFixed(3)} |`);
  lines.push(`| 25パーセンタイル | ${report.score_statistics.percentiles.p25.toFixed(3)} |`);
  lines.push(`| 75パーセンタイル | ${report.score_statistics.percentiles.p75.toFixed(3)} |`);
  lines.push(`| 90パーセンタイル | ${report.score_statistics.percentiles.p90.toFixed(3)} |`);
  lines.push('');

  // 評価指標（正解データがある場合）
  if (report.has_ground_truth && report.overall_metrics) {
    lines.push('## 評価指標');
    lines.push('');
    lines.push('### 全体');
    lines.push('');
    lines.push('| 指標 | 値 |');
    lines.push('|------|-----|');
    lines.push(`| Precision | ${(report.overall_metrics.avg_precision * 100).toFixed(1)}% |`);
    lines.push(`| Recall | ${(report.overall_metrics.avg_recall * 100).toFixed(1)}% |`);
    lines.push(`| F1 Score | ${(report.overall_metrics.avg_f1_score * 100).toFixed(1)}% |`);
    lines.push(`| 総発話数 | ${report.overall_metrics.total_utterances} |`);
    lines.push(`| 予測重要発話数 | ${report.overall_metrics.total_predicted} |`);
    lines.push(`| 正解重要発話数 | ${report.overall_metrics.total_ground_truth} |`);
    lines.push('');

    lines.push('### 会話別');
    lines.push('');
    lines.push('| 会話ID | Precision | Recall | F1 | TP | FP | FN |');
    lines.push('|--------|-----------|--------|----|----|----|----|');
    for (const m of report.per_conversation) {
      lines.push(
        `| ${m.conversation_id} | ${(m.precision * 100).toFixed(1)}% | ${(m.recall * 100).toFixed(1)}% | ${(m.f1_score * 100).toFixed(1)}% | ${m.true_positives} | ${m.false_positives} | ${m.false_negatives} |`
      );
    }
    lines.push('');
  }

  // 分析パラメータ
  const analysisWithParams = analysis as AnalysisResult & { analysis_params?: unknown };
  if ('analysis_params' in analysis && analysisWithParams.analysis_params) {
    lines.push('## 分析パラメータ');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(analysisWithParams.analysis_params, null, 2));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
