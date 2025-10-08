/**
 * Extract nouns from a Japanese text.
 * @param text - The input text.
 * @returns An array of extracted nouns.
 */
export const extractNouns = (text: string): string[] => {
  // カタカナ・漢字の連続を抽出（簡易版）
  const pattern = /([ァ-ヴー]{2,}|[一-龯]{2,})/g;
  return text.match(pattern) || [];
};
