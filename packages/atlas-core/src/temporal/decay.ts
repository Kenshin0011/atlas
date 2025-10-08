/**
 * Temporal decay functions for dependency weighting
 */

/**
 * Temporal decay function: ω(distance, type)
 * @param distance - The distance in utterance IDs.
 * @param type - The type of dependency ('local', 'topic', 'global').
 * @param config - Decay parameters for each type.
 * @returns The decay weight.
 */
export const temporalDecay = (
  distance: number,
  type: 'local' | 'topic' | 'global',
  config: { lambda_local: number; lambda_topic: number; lambda_global: number }
): number => {
  const beta: Record<typeof type, number> = {
    local: 1.0,
    topic: 0.8,
    global: 0.9,
  };

  const lambda: Record<typeof type, number> = {
    local: config.lambda_local,
    topic: config.lambda_topic,
    global: config.lambda_global,
  };

  return beta[type] * Math.exp(-lambda[type] * distance);
};
