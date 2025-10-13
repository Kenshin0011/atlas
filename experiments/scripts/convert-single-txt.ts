/**
 * 単一のtxtファイルをJSON形式に変換
 *
 * 使い方:
 *   tsx convert-single-txt.ts <input.txt> [output.json]
 *
 * 例:
 *   tsx convert-single-txt.ts ../datasets/meeting_10.txt
 *   tsx convert-single-txt.ts ../datasets/meeting_10.txt ../datasets/meeting_10.json
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
 * パスをカレントディレクトリから解決
 * (experiments/から実行される)
 */
const resolvePath = (inputPath: string): string => {
  // 絶対パスの場合はそのまま返す
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  // "experiments/"で始まる場合は、それを除去してから解決
  let relativePath = inputPath;
  if (relativePath.startsWith('experiments/')) {
    relativePath = relativePath.slice('experiments/'.length);
  }

  return path.resolve(process.cwd(), relativePath);
};

/**
 * txtファイルを解析してUtteranceの配列に変換
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

    // "話者名: 発話内容" の形式を抽出
    // 話者名は日本語・英語に対応 (例: A:, Aさん:, 司会:, Alice:)
    const match = trimmed.match(/^([^:：]+)[：:]\s*(.+)$/);
    if (!match) continue;

    const [, speaker, text] = match;

    utterances.push({
      id: utterances.length + 1,
      text: text.trim(),
      timestamp: startTime + utterances.length * intervalMs,
      speaker: speaker.trim(),
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
    console.error('使い方: tsx convert-single-txt.ts <input.txt> [output.json]');
    console.error('');
    console.error('例:');
    console.error('  tsx convert-single-txt.ts datasets/meeting_10.txt');
    console.error('  tsx convert-single-txt.ts datasets/meeting_10.txt datasets/meeting_10.json');
    process.exit(1);
  }

  const inputPath = resolvePath(args[0]);

  // 出力パスの決定
  const outputPath = args[1] ? resolvePath(args[1]) : inputPath.replace(/\.txt$/, '.json');

  console.log('📂 入力ファイル:', inputPath);
  console.log('📁 出力ファイル:', outputPath);

  // ファイル存在チェック
  try {
    await fs.access(inputPath);
  } catch {
    console.error('❌ 入力ファイルが見つかりません:', inputPath);
    process.exit(1);
  }

  // ファイルを解析
  console.log('\n🔄 解析中...');
  const utterances = await parseTxtFile(inputPath);

  if (utterances.length === 0) {
    console.error('❌ 発話が見つかりませんでした');
    console.error('   形式: "A: 発話内容" または "B: 発話内容"');
    process.exit(1);
  }

  console.log(`✅ ${utterances.length}発話を解析しました`);

  // 話者統計
  const speakerCounts = new Map<string, number>();
  for (const u of utterances) {
    speakerCounts.set(u.speaker, (speakerCounts.get(u.speaker) || 0) + 1);
  }

  console.log('\n📊 話者別統計:');
  for (const [speaker, count] of speakerCounts) {
    console.log(`  ${speaker}: ${count}発話`);
  }

  // 会話IDはファイル名から生成
  const convId = path.basename(inputPath, '.txt');

  const conversation: Conversation = {
    id: convId,
    utterances,
  };

  // JSON形式に変換
  const dataset = {
    metadata: {
      name: `Single Conversation (${convId})`,
      description: `${inputPath}から変換した1会話（${utterances.length}発話）`,
      created_at: new Date().toISOString(),
      source: 'single_txt_conversion',
      ground_truth: false,
    },
    conversations: [conversation],
  };

  // 保存
  console.log('\n💾 保存中...');
  await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2));

  console.log('✅ 保存完了:', outputPath);
  console.log('\n✨ 変換完了！');
  console.log(`\n次のステップ: pnpm analyze ${outputPath.replace(/^.*experiments\//, '')}`);
};

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
