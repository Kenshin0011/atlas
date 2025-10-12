/**
 * ATLAS コア型定義
 * ライブラリ全体で共有される型
 */

/**
 * 発話型（アプリケーション層用）
 * 数値IDを使用する外部インターフェース
 */
export type Utterance = {
  /** 発話ID（数値） */
  id: number;
  /** 発話テキスト */
  text: string;
  /** タイムスタンプ（ミリ秒エポック） */
  timestamp: number;
  /** 発話者 */
  speaker: string;
};
