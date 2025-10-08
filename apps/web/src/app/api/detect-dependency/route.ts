import type { SCAINResult, Utterance } from '@atlas/core';
import { DEFAULT_CONFIG } from '@atlas/core';
import { NextResponse } from 'next/server';
import { detectDependencies } from '@/services/dependencyAnalyzer';

/**
 * Handle POST requests for dependency detection.
 * @param req - The incoming request.
 * @returns A NextResponse with the detection results.
 */
export const POST = async (req: Request) => {
  try {
    const { dialogue, current }: { dialogue: Utterance[]; current: Utterance } = await req.json();

    // 依存関係検出
    const dependencies = await detectDependencies(dialogue, current);

    // SCAIN判定
    const maxDependency =
      dependencies.length > 0
        ? dependencies.reduce((max, dep) => (dep.weight > max.weight ? dep : max))
        : null;

    const isSCAIN = maxDependency ? maxDependency.weight > DEFAULT_CONFIG.scain_threshold : false;

    // SCAINタイプの分類
    let scainType: 'short-term' | 'mid-term' | 'long-term' | undefined;
    if (isSCAIN && maxDependency) {
      scainType =
        maxDependency.type === 'local'
          ? 'short-term'
          : maxDependency.type === 'topic'
            ? 'mid-term'
            : 'long-term';
    }

    const result: SCAINResult = {
      is_scain: isSCAIN,
      dependencies,
      scain_type: scainType,
      importance_score: maxDependency?.weight || 0,
      max_dependency_weight: maxDependency?.weight || 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dependency detection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
