/**
 * 複数のtxtファイルを一括変換してJSONデータセットに統合
 *
 * 使い方:
 *   tsx convert-batch-txt-to-json.ts <input_dir> [output.json] [--limit N]
 *
 * 例:
 *   tsx convert-batch-txt-to-json.ts ../datasets/ ../datasets/conversations_1000.json --limit 1000
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type Utterance = {
  id: number;
  text: string;
  timestamp: number;
  speaker: string;
};

type Conversation = {
  id: string;
  utterances: Utterance[];
};

/**
 * 1つのtxtファイルを解析してUtteranceの配列に変換
 */
const parseTxtFile = async (filePath: string): Promise<Utterance[]> => {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const utterances: Utterance[] = [];
  const startTime = Date.now();
  const intervalMs = 5000; // 5秒間隔

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // A: または B: で始まる行を抽出
    const match = trimmed.match(/^([A-Z]):\s*(.+)$/);
    if (!match) continue;

    const [, speaker, text] = match;

    utterances.push({
      id: utterances.length + 1,
      text: text.trim(),
      timestamp: startTime + utterances.length * intervalMs,
      speaker,
    });
  }

  return utterances;
};

/**
 * メイン処理
 */
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('使い方: tsx convert-batch-txt-to-json.ts <input_dir> [output.json] [--limit N]');
    console.error('');
    console.error('例:');
    console.error('  tsx convert-batch-txt-to-json.ts ../datasets/');
    console.error(
      '  tsx convert-batch-txt-to-json.ts ../datasets/ ../datasets/conv1000.json --limit 1000'
    );
    process.exit(1);
  }

  const inputDir = path.resolve(args[0]);

  // 出力パスとlimitオプションの処理
  let outputPath: string;
  let limit: number | undefined;

  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = Number.parseInt(args[limitIndex + 1], 10);
  }

  if (args[1] && !args[1].startsWith('--')) {
    outputPath = path.resolve(args[1]);
  } else {
    const suffix = limit ? `_${limit}` : '';
    outputPath = path.resolve(inputDir, `conversations${suffix}.json`);
  }

  console.log('📂 入力ディレクトリ:', inputDir);
  console.log('📁 出力ファイル:', outputPath);
  if (limit) {
    console.log(`🔢 制限: 最初の${limit}ファイル`);
  }

  // ディレクトリ存在チェック
  try {
    await fs.access(inputDir);
  } catch {
    console.error('❌ 入力ディレクトリが見つかりません:', inputDir);
    process.exit(1);
  }

  // txtファイル一覧取得
  console.log('\n📖 txtファイルを検索中...');
  const allFiles = await fs.readdir(inputDir);
  const txtFiles = allFiles
    .filter(f => f.endsWith('.txt'))
    .sort((a, b) => {
      // 自然順ソート（PP1, PP2, ..., PP10, ..., PP100）
      const matchA = a.match(/^PP(\d+)\.txt$/);
      const matchB = b.match(/^PP(\d+)\.txt$/);
      if (matchA && matchB) {
        return Number.parseInt(matchA[1], 10) - Number.parseInt(matchB[1], 10);
      }
      return a.localeCompare(b);
    })
    .slice(0, limit); // limitがあれば制限

  if (txtFiles.length === 0) {
    console.error('❌ txtファイルが見つかりませんでした');
    process.exit(1);
  }

  console.log(`✅ ${txtFiles.length}個のtxtファイルを発見しました`);

  // 各ファイルを解析
  console.log('\n🔄 解析中...');
  const conversations: Conversation[] = [];
  let totalUtterances = 0;
  const speakerCounts = new Map<string, number>();

  for (let i = 0; i < txtFiles.length; i++) {
    const fileName = txtFiles[i];
    const filePath = path.join(inputDir, fileName);

    try {
      const utterances = await parseTxtFile(filePath);

      if (utterances.length > 0) {
        // 会話IDはファイル名から生成（拡張子を除く）
        const convId = path.basename(fileName, '.txt');

        conversations.push({
          id: convId,
          utterances,
        });

        totalUtterances += utterances.length;

        // 話者統計
        for (const u of utterances) {
          speakerCounts.set(u.speaker, (speakerCounts.get(u.speaker) || 0) + 1);
        }
      }

      // 進捗表示
      if ((i + 1) % 100 === 0 || i === txtFiles.length - 1) {
        process.stdout.write(`\r  進捗: ${i + 1}/${txtFiles.length} ファイル`);
      }
    } catch (error) {
      console.error(`\n⚠️  ${fileName} の解析に失敗:`, error);
    }
  }

  console.log(`\n✅ ${conversations.length}会話、${totalUtterances}発話を解析しました`);

  // 話者統計
  console.log('\n📊 話者別統計:');
  for (const [speaker, count] of speakerCounts) {
    console.log(`  ${speaker}: ${count}発話`);
  }

  // JSON形式に変換
  const dataset = {
    metadata: {
      name: `Batch Conversations (${conversations.length} conversations)`,
      description: `${inputDir}から変換した${conversations.length}会話（${totalUtterances}発話）`,
      created_at: new Date().toISOString(),
      source: 'batch_txt_conversion',
      ground_truth: false,
    },
    conversations,
  };

  // 保存
  console.log('\n💾 保存中...');
  await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2));

  console.log('✅ 保存完了:', outputPath);
  console.log('\n✨ 変換完了！');
  console.log(`\n次のステップ: tsx analyze.ts ${outputPath}`);
};

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
