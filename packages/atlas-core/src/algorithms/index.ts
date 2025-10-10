/**
 * @atlas/core/algorithms
 *
 * Multi-scale temporal dependency detection algorithms
 */

export type { ThresholdConfig } from './adaptive-thresholds';
export {
  calculateAdaptiveThreshold,
  calculateConfidenceBasedThreshold,
  getDefaultThresholds,
  getRecommendedThresholds,
} from './adaptive-thresholds';
export type { EmbeddingService } from './dependency-analyzer';
export {
  computeLocalDependencies,
  computeTopicDependencies,
  deduplicateDependencies,
  detectDependencies,
} from './dependency-analyzer';
export type { MetricsSummary, SimilarityMetric, TopicMetric } from './metrics-logger';
export { metricsLogger } from './metrics-logger';
