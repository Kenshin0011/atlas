/**
 * FDR制御（False Discovery Rate）
 * 多重検定補正
 */

/**
 * 経験累積分布関数（ECDF）を生成
 * @param sample サンプルデータ
 * @returns x → F(x) = P(X ≤ x) を返す関数
 */
export const ecdf =
  (sample: number[]): ((x: number) => number) =>
  (x: number) => {
    const s = [...sample].sort((a, b) => a - b);
    let lo = 0;
    let hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (s[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    return lo / s.length;
  };

/**
 * Benjamini-Hochberg手続き
 * FDR制御による多重検定補正
 * @param pvals p値の配列
 * @param alpha FDR閾値
 * @returns 有意と判定されたインデックスの配列
 */
export const benjaminiHochberg = (pvals: number[], alpha: number): number[] => {
  const n = pvals.length;
  const order = pvals.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let k = -1;
  for (let j = 0; j < n; j++) {
    const threshold = ((j + 1) / n) * alpha;
    if (order[j].p <= threshold) k = j;
  }
  if (k === -1) return [];
  const cutoff = order[k].p;
  return order.filter(o => o.p <= cutoff).map(o => o.i);
};
