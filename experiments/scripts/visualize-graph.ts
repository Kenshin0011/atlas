/**
 * 依存関係グラフの可視化
 * 重要発話の連鎖をグラフ形式（DOT/JSON）で出力
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
  metadata: unknown;
  analysis_params: {
    k: number;
    fdrAlpha: number;
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

type Edge = {
  from: number; // 依存元（過去の重要発話）
  to: number; // 依存先（現在の発話）
  weight: number; // deltaLoss
  pValue: number;
};

type Node = {
  id: number;
  text: string;
  speaker: string;
  importance: number; // 他ノードから参照された回数
};

/**
 * パスをカレントディレクトリから解決
 */
const resolvePath = (inputPath: string): string => {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  let relativePath = inputPath;
  if (relativePath.startsWith('experiments/')) {
    relativePath = relativePath.slice('experiments/'.length);
  }

  return path.resolve(process.cwd(), relativePath);
};

/**
 * 依存関係グラフを構築
 */
const buildGraph = (
  result: AnalysisResult,
  utterances: DatasetUtterance[]
): { nodes: Map<number, Node>; edges: Edge[] } => {
  const nodes = new Map<number, Node>();
  const edges: Edge[] = [];

  // 全発話をノードとして初期化
  for (const utt of utterances) {
    nodes.set(utt.id, {
      id: utt.id,
      text: utt.text,
      speaker: utt.speaker,
      importance: 0,
    });
  }

  // 各ステップで検出された依存関係をエッジとして追加
  for (const step of result.processing_steps) {
    const toId = step.current_utterance_id;

    for (const fromId of step.important_ids) {
      const evaluated = step.evaluated_history.find(e => e.id === fromId);
      if (!evaluated) continue;

      edges.push({
        from: fromId,
        to: toId,
        weight: evaluated.detail.deltaLoss,
        pValue: evaluated.p_value ?? 1.0,
      });

      // 参照された発話の重要度を増加
      const node = nodes.get(fromId);
      if (node) {
        node.importance++;
      }
    }
  }

  return { nodes, edges };
};

/**
 * DOT形式用にラベルをエスケープ
 */
const escapeDotLabel = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\') // バックスラッシュ
    .replace(/"/g, '\\"') // ダブルクォート
    .replace(/\n/g, '\\n') // 改行
    .replace(/\r/g, '') // キャリッジリターン削除
    .slice(0, 40); // 長すぎる場合は切る
};

/**
 * DOT形式で出力（Graphviz用）
 */
const generateDot = (nodes: Map<number, Node>, edges: Edge[], conversationId: string): string => {
  const lines: string[] = [];
  lines.push(`digraph "${escapeDotLabel(conversationId)}" {`);
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, style=rounded, fontname="Helvetica"];');
  lines.push('  edge [fontname="Helvetica"];');
  lines.push('  graph [fontname="Helvetica"];');
  lines.push('');

  // ノード定義（重要度に応じて色を変える）
  for (const [id, node] of nodes) {
    // エッジに関係するノードのみ表示
    const hasEdge = edges.some(e => e.from === id || e.to === id);
    if (!hasEdge) continue;

    const color = node.importance > 2 ? 'red' : node.importance > 0 ? 'orange' : 'gray';
    const textPreview = escapeDotLabel(node.text);
    const label = `[${id}] ${escapeDotLabel(node.speaker)}\\n${textPreview}...`;
    lines.push(`  n${id} [label="${label}", color="${color}", fontcolor="${color}"];`);
  }

  lines.push('');

  // エッジ定義（deltaLossに応じて太さを変える）
  for (const edge of edges) {
    const weight = Math.max(1, Math.round(edge.weight * 10));
    const label = `Δ=${edge.weight.toFixed(3)}\\np=${edge.pValue.toFixed(3)}`;
    lines.push(`  n${edge.from} -> n${edge.to} [label="${label}", penwidth=${weight}];`);
  }

  lines.push('}');
  return lines.join('\n');
};

/**
 * JSON形式で出力
 */
const generateJson = (nodes: Map<number, Node>, edges: Edge[]): string => {
  return JSON.stringify(
    {
      nodes: Array.from(nodes.values()).filter(n =>
        edges.some(e => e.from === n.id || e.to === n.id)
      ),
      edges,
    },
    null,
    2
  );
};

/**
 * 連鎖パスを検出（重要発話が連続している部分）
 */
const detectChains = (edges: Edge[]): number[][] => {
  const chains: number[][] = [];
  const visited = new Set<number>();

  // エッジをグラフとして構築
  const graph = new Map<number, number[]>();
  for (const edge of edges) {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, []);
    }
    graph.get(edge.from)?.push(edge.to);
  }

  // DFSで連鎖を探索
  const dfs = (node: number, path: number[]) => {
    path.push(node);
    visited.add(node);

    const neighbors = graph.get(node) || [];
    if (neighbors.length === 0) {
      // 終端ノード
      if (path.length >= 2) {
        chains.push([...path]);
      }
    } else {
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next, path);
        }
      }
    }

    path.pop();
  };

  // 開始ノード（入次数0）から探索
  const allNodes = new Set([...edges.map(e => e.from), ...edges.map(e => e.to)]);
  const inDegree = new Map<number, number>();
  for (const node of allNodes) {
    inDegree.set(node, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  const startNodes = Array.from(allNodes).filter(n => inDegree.get(n) === 0);
  for (const start of startNodes) {
    if (!visited.has(start)) {
      dfs(start, []);
    }
  }

  return chains;
};

/**
 * メイン処理
 */
const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('使い方: tsx visualize-graph.ts <analysis.json> <dataset.json> [format]');
    console.error('format: dot (default), json');
    console.error('例: tsx visualize-graph.ts results/xxx/analysis.json datasets/xxx.json dot');
    process.exit(1);
  }

  const analysisPath = resolvePath(args[0]);
  const datasetPath = resolvePath(args[1]);
  const format = args[2] || 'dot';

  console.log('📂 分析結果:', analysisPath);
  console.log('📂 データセット:', datasetPath);
  console.log('📊 出力形式:', format);

  // データ読み込み
  const analysisJson = await fs.readFile(analysisPath, 'utf-8');
  const analysis: ExperimentResult = JSON.parse(analysisJson);

  const datasetJson = await fs.readFile(datasetPath, 'utf-8');
  const dataset: Dataset = JSON.parse(datasetJson);

  // 各会話のグラフを生成
  for (const result of analysis.results) {
    const conv = dataset.conversations.find(c => c.id === result.conversation_id);
    if (!conv) continue;

    console.log(`\n📊 会話ID: ${result.conversation_id}`);

    const { nodes, edges } = buildGraph(result, conv.utterances);

    console.log(`  ノード数: ${nodes.size}`);
    console.log(`  エッジ数: ${edges.length}`);

    // 連鎖検出
    const chains = detectChains(edges);
    console.log(`  検出された連鎖: ${chains.length}個`);
    for (let i = 0; i < chains.length; i++) {
      console.log(`    連鎖${i + 1}: [${chains[i].join(' → ')}] (長さ: ${chains[i].length})`);
    }

    // 出力
    const outputDir = path.dirname(analysisPath);
    let output: string;
    let filename: string;

    if (format === 'json') {
      output = generateJson(nodes, edges);
      filename = `graph_${result.conversation_id}.json`;
    } else {
      output = generateDot(nodes, edges, result.conversation_id);
      filename = `graph_${result.conversation_id}.dot`;
    }

    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, output);
    console.log(`  ✅ 保存: ${outputPath}`);

    if (format === 'dot') {
      console.log(`  💡 可視化: dot -Tpng ${outputPath} -o ${outputPath.replace('.dot', '.png')}`);
    }
  }

  console.log('\n✨ 完了！');
};

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
