import type { Dependency, Utterance } from '@atlas/core';
import { cosineSimilarity, DEFAULT_CONFIG, temporalDecay } from '@atlas/core';
import { extractNouns } from '@/utils/textProcessing';
import { getEmbeddings } from './embeddingService';

export const computeLocalDependencies = async (
  dialogue: Utterance[],
  current: Utterance
): Promise<Dependency[]> => {
  const dependencies: Dependency[] = [];
  const recentUtterances = dialogue.slice(-3); // 直前3発言

  if (recentUtterances.length === 0) {
    return dependencies;
  }

  try {
    // 空文字列チェック
    if (!current.text || current.text.trim().length === 0) {
      return dependencies;
    }

    // 有効な発言のみフィルタ
    const validUtterances = recentUtterances.filter(u => u.text && u.text.trim().length > 0);
    if (validUtterances.length === 0) {
      return dependencies;
    }

    // Embedding計算（バッチ）
    const texts = [...validUtterances.map(u => u.text), current.text];
    const embeddings = await getEmbeddings(texts);

    const currentEmbedding = embeddings[embeddings.length - 1];

    for (let i = 0; i < validUtterances.length; i++) {
      const prev = validUtterances[i];
      const prevEmbedding = embeddings[i];

      if (!prevEmbedding) {
        continue;
      }

      // Cosine類似度
      const similarity = cosineSimilarity(currentEmbedding, prevEmbedding);

      // 時間減衰
      const distance = current.id - prev.id;
      const weight =
        similarity *
        temporalDecay(distance, 'local', {
          lambda_local: DEFAULT_CONFIG.lambda_local,
          lambda_topic: DEFAULT_CONFIG.lambda_topic,
          lambda_global: DEFAULT_CONFIG.lambda_global,
        });

      if (weight > 0.3) {
        dependencies.push({
          id: prev.id,
          weight,
          type: 'local',
        });
      }
    }
  } catch (error) {
    console.error('Local dependency computation error:', error);
  }

  return dependencies;
};

export const computeTopicDependencies = (
  dialogue: Utterance[],
  current: Utterance
): Dependency[] => {
  const dependencies: Dependency[] = [];
  const currentNouns = extractNouns(current.text);

  if (currentNouns.length === 0) {
    return dependencies;
  }

  // 直近10発言を対象
  const recentDialogue = dialogue.slice(-10);

  for (const prev of recentDialogue) {
    const prevNouns = extractNouns(prev.text);
    const overlap = currentNouns.filter(n => prevNouns.includes(n));

    if (overlap.length > 0) {
      const distance = current.id - prev.id;
      const rawWeight = overlap.length * 0.3;
      const weight =
        rawWeight *
        temporalDecay(distance, 'topic', {
          lambda_local: DEFAULT_CONFIG.lambda_local,
          lambda_topic: DEFAULT_CONFIG.lambda_topic,
          lambda_global: DEFAULT_CONFIG.lambda_global,
        });

      if (weight > 0.25) {
        dependencies.push({
          id: prev.id,
          weight,
          type: 'topic',
          evidence: {
            shared_entities: overlap,
          },
        });
      }
    }
  }

  return dependencies;
};

export const deduplicateDependencies = (deps: Dependency[]): Dependency[] => {
  const map = new Map<number, Dependency>();

  for (const dep of deps) {
    const existing = map.get(dep.id);
    if (!existing || dep.weight > existing.weight) {
      map.set(dep.id, dep);
    }
  }

  return Array.from(map.values());
};

export const detectDependencies = async (
  dialogue: Utterance[],
  current: Utterance
): Promise<Dependency[]> => {
  const dependencies: Dependency[] = [];

  // Layer 1: Local Dependencies (直前3発言)
  const localDeps = await computeLocalDependencies(dialogue, current);
  dependencies.push(...localDeps);

  // Layer 2: Topical Dependencies (簡易版 - 固有名詞の重複)
  const topicDeps = computeTopicDependencies(dialogue, current);
  dependencies.push(...topicDeps);

  // 重複排除と重みでソート
  const uniqueDeps = deduplicateDependencies(dependencies);
  return uniqueDeps.sort((a, b) => b.weight - a.weight);
};
