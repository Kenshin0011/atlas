/**
 * Utility Functions for ATLAS
 * Attention Temporal Link Analysis System
 */

/**
 * Cosine Similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Temporal decay function: ω(distance, type)
 */
export function temporalDecay(
  distance: number,
  type: 'local' | 'topic' | 'global',
  config: { lambda_local: number; lambda_topic: number; lambda_global: number }
): number {
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
}

/**
 * Extract nouns from Japanese text (simple heuristic)
 */
export function extractNouns(text: string): string[] {
  // カタカナ・漢字の連続を抽出
  const pattern = /([ァ-ヴー]+|[一-龯]+)/g;
  return text.match(pattern) || [];
}

/**
 * Calculate time ago string
 */
export function formatTimeAgo(timestamp: number, currentTimestamp: number): string {
  const diff = currentTimestamp - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}時間前`;
  } else if (minutes > 0) {
    return `${minutes}分前`;
  } else {
    return `${seconds}秒前`;
  }
}

/**
 * Detect question patterns in Japanese text
 */
export function detectQuestion(text: string): boolean {
  const questionPatterns = [
    /どう思|どうする|どうすれば/,
    /誰が|いつ|どこで|なぜ|何を/,
    /[?？]$/,
    /〜か$/,
  ];

  return questionPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect decision/action keywords
 */
export function detectDecision(text: string): boolean {
  const decisionKeywords = [
    '決定', '確定', '採用', '却下',
    'やることにしま', '進めま', 'やめま',
    '期限', '担当', 'タスク', 'TODO',
  ];

  return decisionKeywords.some(keyword => text.includes(keyword));
}

/**
 * Detect temporal reference patterns
 */
export function detectTemporalReference(text: string): string[] {
  const patterns = [
    'さっき', '前に', '最初に', '先ほど',
    'あの話', 'その件', 'その時',
  ];

  return patterns.filter(pattern => text.includes(pattern));
}
