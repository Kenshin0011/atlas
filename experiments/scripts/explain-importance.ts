/**
 * 分析結果を人間が理解しやすい形で説明するスクリプト
 * 「各発話を処理した時、どの過去の発話が重要と判断されたか」を可視化
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type EvaluatedUtterance = {
  id: number;
  text: string;
  rank: number;
  score: number;
  p_value?: number;
  is_important: boolean;
  detail: {
    baseLoss: number;
    maskedLoss: number;
    deltaLoss: number;
    ageWeight: number;
    rawScore: number;
    finalScore: number;
  };
};

type ProcessingStep = {
  current_utterance_id: number;
  current_utterance_text: string;
  evaluated_history: EvaluatedUtterance[];
  important_ids: number[];
};

type AnalysisResult = {
  conversation_id: string;
  processing_steps: ProcessingStep[];
  anchor_count: number;
  processing_time_ms: number;
};

type ExperimentResult = {
  metadata: {
    name: string;
    description: string;
    created_at: string;
    source: string;
    ground_truth: boolean;
  };
  analysis_params: {
    k: number;
    alphaMix: number;
    halfLifeTurns: number;
    nullSamples: number;
    fdrAlpha: number;
    mmrLambda: number;
  };
  timestamp: string;
  results: AnalysisResult[];
};

type DatasetUtterance = {
  id: number;
  text: string;
  timestamp: number;
  speaker: string;
};

type Dataset = {
  metadata: unknown;
  conversations: Array<{
    id: string;
    utterances: DatasetUtterance[];
  }>;
};

/**
 * メイン処理
 */
const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('使い方: tsx explain-importance.ts <analysis.json> <dataset.json> [output.txt]');
    console.error(
      '例: tsx explain-importance.ts ../results/2025-10-12_conversations_10/analysis.json ../datasets/conversations_10.json'
    );
    process.exit(1);
  }

  const analysisPath = path.resolve(args[0]);
  const datasetPath = path.resolve(args[1]);

  // 出力ファイルパスを決定
  const outputPath = args[2]
    ? path.resolve(args[2])
    : path.join(path.dirname(analysisPath), 'explanation.txt');

  console.log('📂 分析結果:', analysisPath);
  console.log('📂 データセット:', datasetPath);
  console.log('📄 出力先:', outputPath);

  // データ読み込み
  const analysisJson = await fs.readFile(analysisPath, 'utf-8');
  const analysis: ExperimentResult = JSON.parse(analysisJson);

  const datasetJson = await fs.readFile(datasetPath, 'utf-8');
  const dataset: Dataset = JSON.parse(datasetJson);

  // 出力バッファ
  const output: string[] = [];
  output.push(`\n${'='.repeat(80)}`);
  output.push('重要発話の詳細分析');
  output.push('各発話を処理した時、どの過去の発話が重要と判断されたか');
  output.push('='.repeat(80));

  // 各会話を分析
  for (const result of analysis.results) {
    const conv = dataset.conversations.find(c => c.id === result.conversation_id);
    if (!conv) continue;

    output.push(`\n\n${'='.repeat(80)}`);
    output.push(`【会話ID: ${result.conversation_id}】`);
    output.push(`総発話数: ${conv.utterances.length}`);

    const totalImportant = result.processing_steps.reduce(
      (sum, step) => sum + step.important_ids.length,
      0
    );
    output.push(`重要発話として検出された総数: ${totalImportant}`);
    output.push('='.repeat(80));

    // 各処理ステップを表示
    for (const step of result.processing_steps) {
      // 重要な発話がある場合のみ表示
      if (step.important_ids.length === 0) continue;

      const currentUtt = conv.utterances.find(u => u.id === step.current_utterance_id);
      if (!currentUtt) continue;

      output.push(`\n${'-'.repeat(80)}`);
      output.push(`【発話${step.current_utterance_id}を処理】`);
      output.push(`話者: ${currentUtt.speaker}`);
      output.push(`内容: "${step.current_utterance_text}"`);
      output.push('');
      output.push(`この発話を理解するために重要な過去の発話: ${step.important_ids.length}件`);
      output.push('');

      // 重要な発話のみを抽出してスコア順にソート
      const importantUtterances = step.evaluated_history
        .filter(u => u.is_important)
        .sort((a, b) => b.score - a.score);

      for (let i = 0; i < importantUtterances.length; i++) {
        const imp = importantUtterances[i];
        const pastUtt = conv.utterances.find(u => u.id === imp.id);
        if (!pastUtt) continue;

        output.push(`  ${i + 1}. 発話${imp.id} (${pastUtt.speaker})`);
        output.push(`     "${imp.text}"`);
        output.push(
          `     スコア: ${imp.score.toFixed(3)} | p値: ${imp.p_value?.toFixed(3) ?? 'N/A'} | rank: ${imp.rank}`
        );
        output.push(
          `     deltaLoss: ${imp.detail.deltaLoss.toFixed(3)} (この発話をマスクすると予測が変わる度合い)`
        );

        // 理由を推測
        const reasons: string[] = [];
        if (imp.detail.deltaLoss > 0.05) {
          reasons.push('文脈として重要');
        }
        if (imp.p_value !== undefined && imp.p_value < 0.1) {
          reasons.push('統計的に有意');
        }
        if (imp.rank === 1) {
          reasons.push('最重要');
        }
        if (reasons.length > 0) {
          output.push(`     理由: ${reasons.join(', ')}`);
        }
        output.push('');
      }
    }
  }

  // サマリー情報
  output.push(`\n${'='.repeat(80)}`);
  output.push('📊 分析パラメータ');
  output.push('='.repeat(80));
  output.push(`k: ${analysis.analysis_params.k} (各時点で評価する過去の発話数)`);
  output.push(`nullSamples: ${analysis.analysis_params.nullSamples} (統計検定用の帰無サンプル数)`);
  output.push(`fdrAlpha: ${analysis.analysis_params.fdrAlpha} (偽発見率の閾値)`);
  output.push(`halfLifeTurns: ${analysis.analysis_params.halfLifeTurns} (時間減衰の半減期)`);
  output.push('');
  output.push('💡 重要度の判断基準:');
  output.push('  1. deltaLoss: その発話をマスク(隠す)すると、現在の発話の予測がどれだけ変わるか');
  output.push('     → 大きいほど、現在の発話を理解するために必要な文脈');
  output.push('  2. p値: 統計的に有意かどうか (nullSamplesとの比較)');
  output.push('     → 小さいほど、偶然ではなく本当に重要');
  output.push('  3. rank: その時点での相対的な重要度順位');
  output.push('     → 1が最も重要');
  output.push('  4. score: deltaLoss × ageWeight (時間経過で減衰)');
  output.push('     → 古い発話ほど重要度が下がる');

  // ファイルに書き込み
  await fs.writeFile(outputPath, output.join('\n'), 'utf-8');
  console.log(`\n✅ 説明を保存しました: ${outputPath}`);
};

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
