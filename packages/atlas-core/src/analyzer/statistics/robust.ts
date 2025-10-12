/**
 * ロバスト統計関数
 * 外れ値に強い統計量の計算
 */

/**
 * 中央値を計算
 * @param xs 数値配列
 * @returns 中央値
 */
export const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * ロバストZ変換（MADベース）
 * 外れ値に頑健な標準化
 * @param values 数値配列
 * @returns 標準化された値の配列
 */
export const robustZ = (values: number[]): number[] => {
  const med = median(values);
  const abs = values.map(v => Math.abs(v - med));
  const mad = median(abs) || 1e-9;
  return values.map(v => 0.6745 * ((v - med) / mad));
};
