/**
 * 時間減衰関数
 * 発話の古さに応じて重みを減衰
 */

/**
 * 指数減衰による重み計算
 * @param ageTurns 何ターン前の発話か
 * @param halfLifeTurns 半減期（何ターンで重みが半分になるか）
 * @returns 減衰後の重み (0..1)
 */
export const timeDecayWeight = (ageTurns: number, halfLifeTurns: number): number => {
  const lambda = Math.log(2) / Math.max(1, halfLifeTurns);
  return Math.exp(-lambda * ageTurns);
};
