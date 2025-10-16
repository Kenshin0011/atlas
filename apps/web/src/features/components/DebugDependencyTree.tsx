/**
 * DebugDependencyTree Component
 * 依存関係のツリー構造を表示
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { useMemo } from 'react';
import type { DependencyEdge, Score } from '../hooks/useStream';

type DebugDependencyTreeProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  dependencies: DependencyEdge[];
};

type TreeNode = {
  utterance: Utterance;
  score?: Score;
  children: TreeNode[];
};

/**
 * 依存関係のツリーを構築（再帰的）
 */
const buildTree = (
  targetId: number,
  dependencies: DependencyEdge[],
  dialogue: Utterance[],
  scores: Map<number, Score>,
  visited: Set<number> = new Set()
): TreeNode[] => {
  if (visited.has(targetId)) return []; // サイクル防止

  // targetIdに依存している発話を探す（to → targetId）
  const deps = dependencies.filter(d => d.to === targetId);

  const nodes: TreeNode[] = [];
  for (const dep of deps) {
    const utterance = dialogue.find(u => u.id === dep.from);
    if (!utterance) continue;

    const newVisited = new Set(visited);
    newVisited.add(dep.from);

    // 再帰的に依存元を辿る
    const children = buildTree(dep.from, dependencies, dialogue, scores, newVisited);

    nodes.push({
      utterance,
      score: scores.get(dep.from),
      children,
    });
  }

  return nodes;
};

/**
 * ツリーノードを再帰的に表示
 */
const TreeNodeView = ({ node, level }: { node: TreeNode; level: number }) => {
  const { utterance, score, children } = node;

  // アンカー（他から依存されている）かどうか
  const isAnchor = children.length > 0 || score?.isImportant;

  // 色分け: アンカー = オレンジ、依存のみ = 緑
  const colorClasses = isAnchor
    ? {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        dot: 'bg-orange-500',
        line: 'bg-orange-400 dark:bg-orange-600',
      }
    : {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        dot: 'bg-green-500',
        line: 'bg-green-400 dark:bg-green-600',
      };

  return (
    <div className="relative">
      {/* 接続線 */}
      {level > 0 && (
        <div className="absolute left-6 top-0 h-8 w-0.5 bg-slate-300 dark:bg-slate-600" />
      )}

      {/* ノードカード */}
      <div className="mb-2">
        <div
          className={`p-3 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${colorClasses.dot} flex-shrink-0`} />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {utterance.speaker}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">ID: {utterance.id}</span>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {formatTimeAgo(utterance.timestamp, Date.now())}
            </span>
            {score?.isImportant && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                重要
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">{utterance.text}</p>
          {score && (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              スコア: {score.score.toFixed(4)} | p値: {score.pValue?.toFixed(4) || 'N/A'}
            </div>
          )}
        </div>

        {/* 子ノード（再帰） */}
        {children.length > 0 && (
          <div className="mt-2 pl-6 border-l-2 border-slate-200 dark:border-slate-700">
            {children.map((child, _idx) => (
              <TreeNodeView key={child.utterance.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DebugDependencyTree = ({
  dialogue,
  scores,
  dependencies,
}: DebugDependencyTreeProps) => {
  // 全ての発話に対してツリーを構築
  const trees = useMemo(() => {
    // 依存されている発話（from）と依存している発話（to）を取得
    const fromIds = new Set(dependencies.map(d => d.from));
    const toIds = new Set(dependencies.map(d => d.to));

    // ルートノード: 依存されている（fromに含まれる）が、自分は依存していない（toに含まれない）
    // または、重要発話で依存していない
    const rootIds = dialogue
      .filter(u => (fromIds.has(u.id) || scores.get(u.id)?.isImportant) && !toIds.has(u.id))
      .map(u => u.id);

    // 各ルートからツリーを構築
    return rootIds
      .map(rootId => {
        const utterance = dialogue.find(u => u.id === rootId);
        if (!utterance) return null;

        const children = buildTree(rootId, dependencies, dialogue, scores);

        return {
          utterance,
          score: scores.get(rootId),
          children,
        } as TreeNode;
      })
      .filter((node): node is TreeNode => node !== null);
  }, [dialogue, scores, dependencies]);

  if (trees.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          依存関係ツリー
        </h3>
        <div className="text-center text-slate-400 dark:text-slate-500 py-8">
          <p className="text-sm">依存関係が検出されていません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        依存関係ツリー
      </h3>
      <div className="space-y-4 max-h-[800px] overflow-y-auto">
        {trees.map(tree => (
          <TreeNodeView key={tree.utterance.id} node={tree} level={0} />
        ))}
      </div>
    </div>
  );
};
