/**
 * Japanese text processing utilities
 */

/**
 * Extract nouns from Japanese text (simple heuristic)
 * @param text - The input text.
 * @returns An array of extracted nouns.
 */
export const extractNouns = (text: string): string[] => {
  // カタカナ・漢字の連続を抽出
  const pattern = /([ァ-ヴー]+|[一-龯]+)/g;
  return text.match(pattern) || [];
};

/**
 * Detect question patterns in Japanese text
 * @param text - The input text.
 * @returns True if the text contains question patterns, false otherwise.
 */
export const detectQuestion = (text: string): boolean => {
  const questionPatterns = [
    /どう思|どうする|どうすれば/,
    /誰が|いつ|どこで|なぜ|何を/,
    /[?？]$/,
    /〜か$/,
  ];

  return questionPatterns.some(pattern => pattern.test(text));
};

/**
 * Detect decision/action keywords
 * @param text - The input text.
 * @returns True if the text contains decision/action keywords, false otherwise.
 */
export const detectDecision = (text: string): boolean => {
  const decisionKeywords = [
    '決定',
    '確定',
    '採用',
    '却下',
    'やることにしま',
    '進めま',
    'やめま',
    '期限',
    '担当',
    'タスク',
    'TODO',
  ];

  return decisionKeywords.some(keyword => text.includes(keyword));
};

/**
 * Detect temporal reference patterns
 * @param text - The input text.
 * @returns An array of detected temporal reference phrases.
 */
export const detectTemporalReference = (text: string): string[] => {
  const patterns = ['さっき', '前に', '最初に', '先ほど', 'あの話', 'その件', 'その時'];

  return patterns.filter(pattern => text.includes(pattern));
};
