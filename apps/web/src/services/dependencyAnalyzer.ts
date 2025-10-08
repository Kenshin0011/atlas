import type { Dependency, Utterance } from '@atlas/core';
import { cosineSimilarity, DEFAULT_CONFIG, temporalDecay } from '@atlas/core';
import { extractNouns } from '@/utils/textProcessing';
import { getDefaultThresholds, getRecommendedThresholds } from './adaptiveThresholds';
import { getEmbeddings } from './embeddingService';
import { metricsLogger } from './metricsLogger';

/**
 * Get current thresholds (adaptive or default).
 *
 * Automatically switches between adaptive and default thresholds
 * based on available data quantity.
 *
 * @returns ThresholdConfig - Either adaptive (if ≥50 samples) or default
 *
 * @remarks
 * - Uses adaptive thresholds when sufficient data is available (50+ samples)
 * - Falls back to default thresholds during initial "cold start" period
 * - Logs threshold source to console for debugging
 *
 * @internal
 */
const getCurrentThresholds = () => {
  const summary = metricsLogger.getSummary();
  const hasEnoughData =
    summary.localDependencies.weights.length > 50 || summary.topicDependencies.weights.length > 50;

  if (hasEnoughData) {
    const recommended = getRecommendedThresholds(summary);
    console.log('[ATLAS] Using adaptive thresholds:', recommended);
    return recommended;
  }

  const defaults = getDefaultThresholds();
  console.log('[ATLAS] Using default thresholds:', defaults);
  return defaults;
};

/**
 * Compute local dependencies based on recent utterances.
 *
 * Uses semantic similarity (embeddings + cosine similarity) with temporal decay
 * to detect short-term references to recent context (1-3 utterances back).
 *
 * @param dialogue - Full conversation history
 * @param current - Current utterance to analyze
 * @returns Array of detected local dependencies
 *
 * @remarks
 * Detection process:
 * 1. Filter out empty utterances
 * 2. Get OpenAI embeddings for all utterances (text-embedding-3-small)
 * 3. Calculate cosine similarity between current and each previous utterance
 * 4. Apply temporal decay based on distance
 * 5. Compare against adaptive threshold
 * 6. Log results to metricsLogger
 *
 * Uses adaptive threshold from dependencyAnalyzer.ts:66:
 * - Default: 0.35 (cosine similarity ~70° angle)
 * - Adaptive: Based on 75th percentile of collected data
 *
 * @example
 * const deps = await computeLocalDependencies(
 *   dialogue,
 *   { id: 5, text: "それについて詳しく教えて", speaker: "A", timestamp: 1000 }
 * );
 * // Returns [{ id: 4, weight: 0.68, type: "local" }]
 */
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

    // 適応的閾値を取得
    const thresholds = getCurrentThresholds();
    const localThreshold = thresholds.local.threshold;

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

      // メトリクスをロギング
      const detected = weight > localThreshold;
      metricsLogger.logSimilarity({
        similarity,
        distance,
        weight,
        threshold: localThreshold,
        detected,
        timestamp: Date.now(),
      });

      if (detected) {
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

/**
 * Compute topic dependencies using noun overlap heuristic.
 *
 * Detects mid-term topical connections by finding shared entities
 * (katakana/kanji nouns) within the last 10 utterances.
 *
 * @param dialogue - Full conversation history
 * @param current - Current utterance to analyze
 * @returns Array of detected topic dependencies
 *
 * @remarks
 * Detection process:
 * 1. Extract nouns (katakana/kanji) from current and last 10 utterances
 * 2. Find overlapping nouns
 * 3. Calculate overlap ratio (shared / max(current, prev))
 * 4. Weight = overlap ratio * 0.5 (max 0.5 for 100% overlap)
 * 5. Apply temporal decay (λ=0.2)
 * 6. Compare against adaptive threshold
 * 7. Log results to metricsLogger
 *
 * Uses adaptive threshold from dependencyAnalyzer.ts:174:
 * - Default: 0.25 (1 shared entity with moderate decay)
 * - Adaptive: Based on 75th percentile of collected data
 *
 * Changed in this commit:
 * - Weight calculation changed from `overlap.length * 0.3` to ratio-based
 * - Now considers relative overlap rather than absolute count
 *
 * @example
 * const deps = computeTopicDependencies(
 *   dialogue,
 *   { id: 12, text: "AIの倫理問題について", speaker: "A", timestamp: 5000 }
 * );
 * // Returns [{ id: 8, weight: 0.35, type: "topic" }] if "AI" was mentioned at id:8
 */
export const computeTopicDependencies = (
  dialogue: Utterance[],
  current: Utterance
): Dependency[] => {
  const dependencies: Dependency[] = [];
  const currentNouns = extractNouns(current.text);

  if (currentNouns.length === 0) {
    return dependencies;
  }

  // 適応的閾値を取得
  const thresholds = getCurrentThresholds();
  const topicThreshold = thresholds.topic.threshold;

  // 直近10発言を対象
  const recentDialogue = dialogue.slice(-10);

  for (const prev of recentDialogue) {
    const prevNouns = extractNouns(prev.text);
    const overlap = currentNouns.filter(n => prevNouns.includes(n));

    if (overlap.length > 0) {
      const distance = current.id - prev.id;
      // Normalized weight based on overlap ratio
      const overlapRatio = overlap.length / Math.max(currentNouns.length, prevNouns.length);
      const rawWeight = overlapRatio * 0.5; // Max 0.5 for 100% overlap
      const weight =
        rawWeight *
        temporalDecay(distance, 'topic', {
          lambda_local: DEFAULT_CONFIG.lambda_local,
          lambda_topic: DEFAULT_CONFIG.lambda_topic,
          lambda_global: DEFAULT_CONFIG.lambda_global,
        });

      // メトリクスをロギング
      const detected = weight > topicThreshold;
      metricsLogger.logTopic({
        overlapCount: overlap.length,
        distance,
        rawWeight,
        weight,
        threshold: topicThreshold,
        detected,
        sharedEntities: overlap,
        timestamp: Date.now(),
      });

      if (detected) {
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

/**
 * Deduplicate dependencies by keeping the highest weight for each ID.
 * @param deps - The array of dependencies.
 * @returns An array of deduplicated dependencies.
 */
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

/**
 * Detect dependencies in the dialogue.
 * @param dialogue - The dialogue history.
 * @param current - The current utterance.
 * @returns An array of detected dependencies.
 */
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
