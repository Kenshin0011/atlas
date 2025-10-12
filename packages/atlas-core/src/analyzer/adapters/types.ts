/**
 * モデルアダプタ型定義
 * LLM/埋め込みモデルとの接続インターフェース
 */

import type { Utterance } from '../../types';

// 型を再エクスポート（他のadaptersから利用可能にする）
export type { Utterance };

/**
 * モデルアダプタインターフェース
 * 各種LLM/埋め込みモデルに合わせて実装
 */
export type ModelAdapter = {
  /**
   * 履歴を考慮した損失計算
   * L(Y | H) = 履歴Hから現在発話Yを予測する損失
   * @param history 会話履歴
   * @param current 現在の発話
   * @returns 損失値（高いほど予測困難）
   */
  lossWithHistory: (history: Utterance[], current: Utterance) => Promise<number>;

  /**
   * マスク損失計算
   * L(Y | H \ {u}) = 特定の発話uを除いた履歴から現在発話Yを予測する損失
   * @param history 会話履歴
   * @param current 現在の発話
   * @param masked 除外する発話
   * @returns 損失値
   */
  maskedLoss: (history: Utterance[], current: Utterance, masked: Utterance) => Promise<number>;

  /**
   * テキスト埋め込み
   * MMR多様化や類似検索に使用
   * @param text テキスト
   * @returns 埋め込みベクトル
   */
  embed: (text: string) => Promise<number[]>;
};
