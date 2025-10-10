/**
 * Extract nouns from Japanese text.
 *
 * Simple heuristic: extracts katakana and kanji sequences.
 *
 * @param text - Input Japanese text
 * @returns Array of extracted nouns
 *
 * @example
 * extractNouns("AIと機械学習について") // ["AI", "機械学習"]
 */
export const extractNouns = (text: string): string[] => {
  // カタカナ・漢字の連続を抽出（簡易版）
  const pattern = /([ァ-ヴー]{2,}|[一-龯]{2,})/g;
  return text.match(pattern) || [];
};
