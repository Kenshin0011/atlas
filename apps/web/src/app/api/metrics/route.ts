import { getDefaultThresholds, getRecommendedThresholds, metricsLogger } from '@atlas/core';
import { NextResponse } from 'next/server';

/**
 * GET /api/metrics
 *
 * Returns current metrics, statistics, and recommended thresholds.
 *
 * @returns JSON response containing:
 *   - summary: Aggregated metrics (total counts, detected dependencies, weight arrays)
 *   - statistics: Mean, std, percentiles for local and topic weights
 *   - thresholds: Current threshold configuration (adaptive or default)
 *   - dataQuality: Information about data sufficiency and confidence
 *
 * @remarks
 * - Uses adaptive thresholds when 50+ samples available
 * - Falls back to default thresholds during cold start
 * - Can be polled to monitor system behavior in real-time
 *
 * @example
 * // Fetch current metrics
 * const response = await fetch('/api/metrics');
 * const { summary, thresholds, dataQuality } = await response.json();
 * console.log('Local threshold:', thresholds.local.threshold);
 * console.log('Confidence:', dataQuality.confidence); // 'high' or 'low'
 */
export const GET = async () => {
  try {
    const summary = metricsLogger.getSummary();
    const statistics = metricsLogger.getStatistics();

    const hasEnoughData =
      summary.localDependencies.weights.length > 50 ||
      summary.topicDependencies.weights.length > 50;

    const thresholds = hasEnoughData ? getRecommendedThresholds(summary) : getDefaultThresholds();

    return NextResponse.json({
      summary,
      statistics,
      thresholds,
      dataQuality: {
        hasEnoughData,
        localSamples: summary.localDependencies.weights.length,
        topicSamples: summary.topicDependencies.weights.length,
        confidence: hasEnoughData ? 'high' : 'low',
      },
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve metrics' }, { status: 500 });
  }
};

/**
 * POST /api/metrics
 *
 * Export all metrics data as downloadable JSON file.
 *
 * @returns JSON file download response containing:
 *   - summary: Aggregated statistics
 *   - statistics: Mean, std, percentiles
 *   - rawData: All individual similarity and topic metrics
 *
 * @remarks
 * - File is named with timestamp: `atlas-metrics-{timestamp}.json`
 * - Suitable for offline analysis with Python, R, or spreadsheet software
 * - Data includes all individual detection attempts (not just positive detections)
 *
 * @example
 * // Trigger download
 * const response = await fetch('/api/metrics', { method: 'POST' });
 * const blob = await response.blob();
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'atlas-metrics.json';
 * a.click();
 */
export const POST = async () => {
  try {
    const data = metricsLogger.exportData();
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="atlas-metrics-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Metrics export error:', error);
    return NextResponse.json({ error: 'Failed to export metrics' }, { status: 500 });
  }
};

/**
 * DELETE /api/metrics
 *
 * Clear all stored metrics data.
 *
 * @returns JSON response with success status
 *
 * @remarks
 * - Resets both local and topic metrics to empty arrays
 * - System will fall back to default thresholds after clearing
 * - Useful for starting a new experimental session
 *
 * @example
 * // Clear all metrics
 * await fetch('/api/metrics', { method: 'DELETE' });
 * // System now uses default thresholds until 50+ new samples collected
 */
export const DELETE = async () => {
  try {
    metricsLogger.clear();
    return NextResponse.json({ success: true, message: 'Metrics cleared' });
  } catch (error) {
    console.error('Metrics clear error:', error);
    return NextResponse.json({ error: 'Failed to clear metrics' }, { status: 500 });
  }
};
