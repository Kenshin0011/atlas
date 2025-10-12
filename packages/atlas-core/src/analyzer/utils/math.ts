/**
 * 数学関数
 * ベクトル演算など
 */

/**
 * コサイン類似度を計算
 * @param a ベクトルa
 * @param b ベクトルb
 * @returns コサイン類似度 (-1..1)
 */
export const cosine = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
};
