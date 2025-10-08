/**
 * Metrics logging for parameter validation and tuning.
 *
 * This module provides real-time logging of dependency detection
 * metrics to enable adaptive threshold calculation and system tuning.
 */

/**
 * Metric data for local (similarity-based) dependency detection.
 */
export type SimilarityMetric = {
  /** Cosine similarity between embeddings (0-1) */
  similarity: number;
  /** Utterance distance (number of utterances between current and referenced) */
  distance: number;
  /** Final weight after temporal decay */
  weight: number;
  /** Threshold used for detection */
  threshold: number;
  /** Whether dependency was detected (weight > threshold) */
  detected: boolean;
  /** Unix timestamp (milliseconds) */
  timestamp: number;
};

/**
 * Metric data for topic (noun overlap-based) dependency detection.
 */
export type TopicMetric = {
  /** Number of shared nouns (カタカナ/漢字 entities) */
  overlapCount: number;
  /** Utterance distance (number of utterances between current and referenced) */
  distance: number;
  /** Weight before temporal decay (overlap ratio * 0.5) */
  rawWeight: number;
  /** Final weight after temporal decay */
  weight: number;
  /** Threshold used for detection */
  threshold: number;
  /** Whether dependency was detected (weight > threshold) */
  detected: boolean;
  /** Array of shared noun strings */
  sharedEntities: string[];
  /** Unix timestamp (milliseconds) */
  timestamp: number;
};

/**
 * Aggregated summary of all collected metrics.
 */
export type MetricsSummary = {
  /** Total number of metrics collected */
  totalUtterances: number;
  /** Local dependency statistics */
  localDependencies: {
    /** Number of detected local dependencies */
    detected: number;
    /** Array of all cosine similarities */
    similarities: number[];
    /** Array of all computed weights */
    weights: number[];
    /** Array of all utterance distances */
    distances: number[];
  };
  /** Topic dependency statistics */
  topicDependencies: {
    /** Number of detected topic dependencies */
    detected: number;
    /** Array of all noun overlap counts */
    overlapCounts: number[];
    /** Array of all computed weights */
    weights: number[];
    /** Array of all utterance distances */
    distances: number[];
  };
};

/**
 * Singleton logger for dependency detection metrics.
 *
 * Collects and aggregates metrics from both local and topic dependency
 * detection to enable adaptive threshold calculation.
 *
 * @remarks
 * - Stores up to 1000 most recent metrics (FIFO)
 * - Thread-safe for single Next.js process
 * - Data persists only during server runtime (not across restarts)
 *
 * @example
 * import { metricsLogger } from './metricsLogger';
 *
 * // Log a detection result
 * metricsLogger.logSimilarity({
 *   similarity: 0.65,
 *   distance: 2,
 *   weight: 0.45,
 *   threshold: 0.35,
 *   detected: true,
 *   timestamp: Date.now()
 * });
 *
 * // Get summary for adaptive thresholds
 * const summary = metricsLogger.getSummary();
 * const thresholds = getRecommendedThresholds(summary);
 */
class MetricsLogger {
  private similarityMetrics: SimilarityMetric[] = [];
  private topicMetrics: TopicMetric[] = [];
  private maxStoredMetrics = 1000; // 最大保存数

  /**
   * Log a local (similarity-based) dependency detection result.
   *
   * @param metric - Similarity metric containing detection details
   *
   * @remarks
   * Automatically removes oldest metric when storage exceeds 1000 entries
   */
  logSimilarity(metric: SimilarityMetric): void {
    this.similarityMetrics.push(metric);
    if (this.similarityMetrics.length > this.maxStoredMetrics) {
      this.similarityMetrics.shift();
    }
  }

  /**
   * Log a topic (noun overlap-based) dependency detection result.
   *
   * @param metric - Topic metric containing detection details
   *
   * @remarks
   * Automatically removes oldest metric when storage exceeds 1000 entries
   */
  logTopic(metric: TopicMetric): void {
    this.topicMetrics.push(metric);
    if (this.topicMetrics.length > this.maxStoredMetrics) {
      this.topicMetrics.shift();
    }
  }

  /**
   * Get aggregated summary of all collected metrics.
   *
   * @returns MetricsSummary with arrays of all metric values
   *
   * @remarks
   * Used by adaptive threshold system to calculate optimal thresholds
   * based on actual conversation patterns.
   */
  getSummary(): MetricsSummary {
    return {
      totalUtterances: this.similarityMetrics.length + this.topicMetrics.length,
      localDependencies: {
        detected: this.similarityMetrics.filter(m => m.detected).length,
        similarities: this.similarityMetrics.map(m => m.similarity),
        weights: this.similarityMetrics.map(m => m.weight),
        distances: this.similarityMetrics.map(m => m.distance),
      },
      topicDependencies: {
        detected: this.topicMetrics.filter(m => m.detected).length,
        overlapCounts: this.topicMetrics.map(m => m.overlapCount),
        weights: this.topicMetrics.map(m => m.weight),
        distances: this.topicMetrics.map(m => m.distance),
      },
    };
  }

  /**
   * Get statistical analysis of collected weight distributions.
   *
   * @returns Statistics object containing:
   *   - local: Stats for local dependency weights
   *   - topic: Stats for topic dependency weights
   *
   * Each includes mean, standard deviation, and percentiles (10, 25, 50, 75, 90, 95, 99).
   *
   * @example
   * const stats = metricsLogger.getStatistics();
   * console.log(stats.local.mean); // e.g., 0.37
   * console.log(stats.local.percentiles[75]); // e.g., 0.52
   */
  getStatistics(): {
    local: { mean: number; std: number; percentiles: Record<number, number> };
    topic: { mean: number; std: number; percentiles: Record<number, number> };
  } {
    return {
      local: this.calculateStats(this.similarityMetrics.map(m => m.weight)),
      topic: this.calculateStats(this.topicMetrics.map(m => m.weight)),
    };
  }

  /**
   * Calculate statistical properties of a numeric array.
   *
   * @param values - Array of numeric values
   * @returns Statistics including mean, std, and percentiles
   *
   * @internal
   */
  private calculateStats(values: number[]): {
    mean: number;
    std: number;
    percentiles: Record<number, number>;
  } {
    if (values.length === 0) {
      return { mean: 0, std: 0, percentiles: {} };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);

    const sorted = [...values].sort((a, b) => a - b);
    const percentiles: Record<number, number> = {};
    [10, 25, 50, 75, 90, 95, 99].forEach(p => {
      const index = Math.floor((sorted.length * p) / 100);
      percentiles[p] = sorted[index] || 0;
    });

    return { mean, std, percentiles };
  }

  /**
   * Export all metrics data as JSON string.
   *
   * @returns Formatted JSON string containing:
   *   - summary: Aggregated statistics
   *   - statistics: Mean, std, percentiles
   *   - rawData: All individual metrics
   *
   * @remarks
   * Can be saved to file for offline analysis or debugging.
   * Format is compatible with data analysis tools (Python, R, etc.)
   *
   * @example
   * const json = metricsLogger.exportData();
   * // Save to file via /api/metrics POST endpoint
   */
  exportData(): string {
    return JSON.stringify(
      {
        summary: this.getSummary(),
        statistics: this.getStatistics(),
        rawData: {
          similarity: this.similarityMetrics,
          topic: this.topicMetrics,
        },
      },
      null,
      2
    );
  }

  /**
   * Clear all stored metrics.
   *
   * @remarks
   * Useful for:
   * - Starting a new experiment/session
   * - Resetting after major parameter changes
   * - Clearing test data before production use
   */
  clear(): void {
    this.similarityMetrics = [];
    this.topicMetrics = [];
  }
}

/**
 * Singleton instance of MetricsLogger.
 *
 * Import and use directly:
 * ```typescript
 * import { metricsLogger } from './metricsLogger';
 * metricsLogger.logSimilarity(...);
 * ```
 */
export const metricsLogger = new MetricsLogger();
