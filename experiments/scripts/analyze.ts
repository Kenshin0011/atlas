/**
 * 会話データセット分析スクリプト
 * データセットを読み込み、ATLASで分析して結果を保存
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnchorMemory, analyzeWithAnchors, OpenAIAdapter, type Utterance } from '@atlas/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データセット型定義
type Dataset = {
  metadata: {
    name: string;
    description: string;
    created_at: string;
    source: string;
    ground_truth: boolean;
  };
  conversations: Array<{
    id: string;
    utterances: Utterance[];
    annotations?: {
      important_ids: number[];
      notes?: string;
    };
  }>;
};

// 分析結果型定義
type AnalysisResult = {
  conversation_id: string;
  utterances: Array<{
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
  }>;
  important_utterances: number[];
  anchor_count: number;
  processing_time_ms: number;
};

type ExperimentResult = {
  metadata: Dataset['metadata'];
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

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('使い方: tsx analyze.ts <dataset.json> [output_dir]');
    console.error('例: tsx analyze.ts ../datasets/sample.json ../results/sample');
    process.exit(1);
  }

  const datasetPath = path.resolve(args[0]);
  const outputDir = args[1]
    ? path.resolve(args[1])
    : path.resolve(
        __dirname,
        '../results',
        `${new Date().toISOString().split('T')[0]}_${path.basename(datasetPath, '.json')}`
      );

  console.log('📂 データセット:', datasetPath);
  console.log('📁 出力先:', outputDir);

  // 環境変数チェック
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY が設定されていません');
    process.exit(1);
  }

  // データセット読み込み
  console.log('\n📖 データセット読み込み中...');
  const datasetJson = await fs.readFile(datasetPath, 'utf-8');
  const dataset: Dataset = JSON.parse(datasetJson);
  console.log(`✅ ${dataset.conversations.length}件の会話を読み込みました`);

  // アダプタ初期化
  console.log('\n🔧 アダプタ初期化中...');
  const adapter = new OpenAIAdapter({ apiKey });
  const anchorMemory = new AnchorMemory(200);

  // 分析パラメータ
  const params = {
    k: 3, // 6→3に削減（評価する履歴発話数）
    alphaMix: 0.6,
    halfLifeTurns: 20,
    nullSamples: 2, // 8→2に削減（帰無サンプル数）
    fdrAlpha: 0.1,
    mmrLambda: 0.7,
  };
  console.log('📊 分析パラメータ:', params);

  // 各会話を分析
  console.log('\n🔍 分析開始...');
  const results: AnalysisResult[] = [];

  for (let i = 0; i < dataset.conversations.length; i++) {
    const conv = dataset.conversations[i];
    console.log(`\n[${i + 1}/${dataset.conversations.length}] ${conv.id}`);
    console.log(`  発話数: ${conv.utterances.length}`);

    const startTime = Date.now();
    const convResults: AnalysisResult['utterances'] = [];
    const importantIds: number[] = [];

    // 各発話を順次分析
    for (let j = 1; j < conv.utterances.length; j++) {
      const history = conv.utterances.slice(0, j);
      const current = conv.utterances[j];

      const result = await analyzeWithAnchors(adapter, history, current, anchorMemory, params);

      // 重要発話をアンカーメモリに追加
      for (const imp of result.important) {
        anchorMemory.add({
          id: imp.id,
          text: imp.text,
          score: imp.score,
          ts: imp.timestamp,
        });
      }

      // 全スコアを記録
      for (const scored of result.scored) {
        const isImportant = result.important.some(imp => imp.id === scored.id);
        convResults.push({
          id: scored.id,
          text: scored.text,
          rank: scored.rank,
          score: scored.score,
          p_value: scored.p,
          is_important: isImportant,
          detail: {
            baseLoss: scored.detail.baseLoss,
            maskedLoss: scored.detail.maskedLoss,
            deltaLoss: scored.detail.deltaLoss,
            ageWeight: scored.detail.ageWeight,
            rawScore: scored.detail.rawScore,
            finalScore: scored.detail.finalScore,
          },
        });

        if (isImportant) {
          importantIds.push(scored.id);
        }
      }

      // 進捗表示
      if ((j + 1) % 5 === 0 || j === conv.utterances.length - 1) {
        process.stdout.write(`\r  進捗: ${j + 1}/${conv.utterances.length} 発話`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n  ✅ 完了 (${processingTime}ms)`);
    console.log(`  重要発話: ${importantIds.length}個`);

    results.push({
      conversation_id: conv.id,
      utterances: convResults,
      important_utterances: importantIds,
      anchor_count: anchorMemory.all().length,
      processing_time_ms: processingTime,
    });
  }

  // 結果を保存
  console.log('\n💾 結果を保存中...');
  await fs.mkdir(outputDir, { recursive: true });

  const experimentResult: ExperimentResult = {
    metadata: dataset.metadata,
    analysis_params: params,
    timestamp: new Date().toISOString(),
    results,
  };

  await fs.writeFile(
    path.join(outputDir, 'analysis.json'),
    JSON.stringify(experimentResult, null, 2)
  );

  console.log('✅ 保存完了:', path.join(outputDir, 'analysis.json'));

  // サマリー表示
  console.log('\n📊 サマリー');
  console.log('─'.repeat(50));
  const totalUtterances = results.reduce((sum, r) => sum + r.utterances.length, 0);
  const totalImportant = results.reduce((sum, r) => sum + r.important_utterances.length, 0);
  const avgTime = results.reduce((sum, r) => sum + r.processing_time_ms, 0) / results.length;

  console.log(`会話数: ${results.length}`);
  console.log(`総発話数: ${totalUtterances}`);
  console.log(
    `重要発話数: ${totalImportant} (${((totalImportant / totalUtterances) * 100).toFixed(1)}%)`
  );
  console.log(`平均処理時間: ${avgTime.toFixed(0)}ms/会話`);
  console.log(`最終アンカー数: ${anchorMemory.all().length}`);

  console.log('\n✨ 分析完了！');
  console.log(`次のステップ: tsx evaluate.ts ${outputDir}/analysis.json`);
}

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
