/**
 * Adaptive thresholds based on statistical analysis
 */

export type ThresholdConfig = {
  local: {
    threshold: number;
    reasoning: string;
  };
  topic: {
    threshold: number;
    reasoning: string;
  };
  scain: {
    threshold: number;
    reasoning: string;
  };
  notification: {
    threshold: number;
    reasoning: string;
  };
};

/**
 * Calculate adaptive threshold based on statistical distribution of weights.
 *
 * Uses two methods and returns the minimum:
 * 1. Percentile-based: Selects the value at the given percentile
 * 2. Standard deviation-based: mean + 0.5σ
 *
 * @param weights - Array of computed dependency weights from previous detections
 * @param percentile - Target percentile for threshold (default: 75, i.e., top 25%)
 * @returns Object containing:
 *   - threshold: Calculated threshold value
 *   - reasoning: Human-readable explanation with statistics
 *
 * @example
 * const weights = [0.1, 0.2, 0.3, 0.4, 0.5];
 * const result = calculateAdaptiveThreshold(weights, 75);
 * // result.threshold will be around 0.4-0.5
 */
export const calculateAdaptiveThreshold = (
  weights: number[],
  percentile: number = 75
): { threshold: number; reasoning: string } => {
  if (weights.length === 0) {
    return {
      threshold: 0.3,
      reasoning: 'No data available, using conservative default (0.3)',
    };
  }

  const sorted = [...weights].sort((a, b) => a - b);
  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const std = Math.sqrt(weights.reduce((sum, w) => sum + (w - mean) ** 2, 0) / weights.length);

  // パーセンタイルベースの閾値
  const index = Math.floor((sorted.length * percentile) / 100);
  const percentileThreshold = sorted[index] || 0;

  // 平均 + 標準偏差ベースの閾値
  const stdThreshold = mean + std * 0.5;

  // 両方を考慮した最終閾値
  const threshold = Math.min(percentileThreshold, stdThreshold);

  const reasoning = [
    `Based on ${weights.length} samples`,
    `Mean: ${mean.toFixed(3)}, Std: ${std.toFixed(3)}`,
    `${percentile}th percentile: ${percentileThreshold.toFixed(3)}`,
    `Mean + 0.5σ: ${stdThreshold.toFixed(3)}`,
    `Selected: ${threshold.toFixed(3)}`,
  ].join(' | ');

  return { threshold, reasoning };
};

/**
 * Calculate confidence-based threshold adjustment.
 *
 * When data size is small, increases the threshold to be more conservative.
 * As more data accumulates, converges to the base threshold.
 *
 * @param dataSize - Number of data samples collected
 * @param baseThreshold - Base threshold to adjust (default: 0.3)
 * @returns Object containing:
 *   - threshold: Adjusted threshold (base + penalty for low confidence)
 *   - reasoning: Human-readable explanation with confidence percentage
 *
 * @remarks
 * - Confidence reaches 100% at 100 samples
 * - Maximum penalty is +0.2 (when dataSize = 0)
 * - Formula: threshold = baseThreshold + (1 - confidence) * 0.2
 *
 * @example
 * calculateConfidenceBasedThreshold(10, 0.3);  // Returns ~0.48 (low confidence)
 * calculateConfidenceBasedThreshold(100, 0.3); // Returns 0.3 (full confidence)
 */
export const calculateConfidenceBasedThreshold = (
  dataSize: number,
  baseThreshold: number = 0.3
): { threshold: number; reasoning: string } => {
  // 必要なデータサイズの目安
  const minConfidentSize = 100;
  const confidence = Math.min(dataSize / minConfidentSize, 1.0);

  // データが少ない時は保守的に高い閾値
  const threshold = baseThreshold + (1 - confidence) * 0.2;

  const reasoning = [
    `Data size: ${dataSize}`,
    `Confidence: ${(confidence * 100).toFixed(0)}%`,
    `Threshold adjusted from ${baseThreshold} to ${threshold.toFixed(3)}`,
  ].join(' | ');

  return { threshold, reasoning };
};

/**
 * Get recommended thresholds based on current data distribution.
 *
 * Calculates optimal thresholds for all dependency types using
 * statistical analysis of collected metrics.
 *
 * @param summary - Metrics summary containing weight arrays
 * @param summary.localDependencies.weights - Array of local dependency weights
 * @param summary.topicDependencies.weights - Array of topic dependency weights
 * @returns ThresholdConfig with four threshold types:
 *   - local: For semantic similarity-based dependencies (75th percentile)
 *   - topic: For noun overlap-based dependencies (75th percentile)
 *   - scain: For determining important utterances (85th percentile)
 *   - notification: For user notifications (90th percentile, most conservative)
 *
 * @remarks
 * Each threshold includes confidence-based adjustment:
 * - More conservative when data size < 100 samples
 * - Converges to statistical threshold as data accumulates
 *
 * @example
 * const summary = metricsLogger.getSummary();
 * const thresholds = getRecommendedThresholds(summary);
 * console.log(thresholds.local.threshold); // e.g., 0.42
 */
export const getRecommendedThresholds = (summary: {
  localDependencies: { weights: number[] };
  topicDependencies: { weights: number[] };
}): ThresholdConfig => {
  // Local dependencies: 上位25%を検出（保守的）
  const localResult = calculateAdaptiveThreshold(summary.localDependencies.weights, 75);
  const localConfidence = calculateConfidenceBasedThreshold(
    summary.localDependencies.weights.length,
    localResult.threshold
  );

  // Topic dependencies: 上位25%を検出（保守的）
  const topicResult = calculateAdaptiveThreshold(summary.topicDependencies.weights, 75);
  const topicConfidence = calculateConfidenceBasedThreshold(
    summary.topicDependencies.weights.length,
    topicResult.threshold
  );

  // SCAIN threshold: 上位15%を重要とみなす
  const allWeights = [...summary.localDependencies.weights, ...summary.topicDependencies.weights];
  const scainResult = calculateAdaptiveThreshold(allWeights, 85);

  // Notification threshold: さらに上位10%のみ通知
  const notificationResult = calculateAdaptiveThreshold(allWeights, 90);

  return {
    local: {
      threshold: localConfidence.threshold,
      reasoning: `${localResult.reasoning} | ${localConfidence.reasoning}`,
    },
    topic: {
      threshold: topicConfidence.threshold,
      reasoning: `${topicResult.reasoning} | ${topicConfidence.reasoning}`,
    },
    scain: {
      threshold: scainResult.threshold,
      reasoning: scainResult.reasoning,
    },
    notification: {
      threshold: notificationResult.threshold,
      reasoning: notificationResult.reasoning,
    },
  };
};

/**
 * Get default thresholds with empirically-derived reasoning.
 *
 * Used when insufficient data is available for adaptive thresholds
 * (typically < 50 samples per dependency type).
 *
 * @returns ThresholdConfig with conservative default values:
 *   - local: 0.35 (cosine similarity ~70° angle)
 *   - topic: 0.25 (1 shared entity with moderate decay)
 *   - scain: 0.5 (mid-point balance)
 *   - notification: 0.65 (top 20%, highly conservative)
 *
 * @remarks
 * These values are based on:
 * - Cosine similarity properties (unit circle geometry)
 * - Expected temporal decay effects
 * - Balance between precision and recall
 *
 * @example
 * const thresholds = getDefaultThresholds();
 * // Use when metricsLogger has < 50 samples
 */
export const getDefaultThresholds = (): ThresholdConfig => {
  return {
    local: {
      threshold: 0.35,
      reasoning:
        'Default based on cosine similarity properties: 0.35 is roughly 70° angle, indicating moderate similarity',
    },
    topic: {
      threshold: 0.25,
      reasoning:
        'Default based on expected noun overlap: 1 shared entity with moderate temporal decay',
    },
    scain: {
      threshold: 0.5,
      reasoning: 'Default mid-point threshold: balance between precision and recall',
    },
    notification: {
      threshold: 0.65,
      reasoning:
        'Default conservative threshold: only notify for high-confidence dependencies (top 20%)',
    },
  };
};
