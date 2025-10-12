/**
 * アンカーメモリ
 * 重要な発話を長期記憶として保持
 */

/**
 * アンカー型
 * 重要発話の記録
 */
export type Anchor = {
  /** 発話ID（数値） */
  id: number;
  /** 発話テキスト */
  text: string;
  /** 重要度スコア */
  score: number;
  /** タイムスタンプ（任意） */
  ts?: number;
  /** トピック（任意） */
  topic?: string;
};

/**
 * アンカーメモリクラス
 * 重要発話をスコア順に保持
 */
export class AnchorMemory {
  private anchors: Anchor[] = [];

  /**
   * @param maxSize 最大保持数
   */
  constructor(private maxSize = 200) {}

  /**
   * アンカーを追加
   * スコア順にソートし、上位maxSize個のみ保持
   * @param a アンカー
   */
  add(a: Anchor): void {
    this.anchors.push(a);
    this.anchors.sort((x, y) => y.score - x.score);
    if (this.anchors.length > this.maxSize) this.anchors.pop();
  }

  /**
   * 上位n個のアンカーを取得
   * @param n 取得数
   * @returns アンカー配列
   */
  top(n = 10): Anchor[] {
    return this.anchors.slice(0, n);
  }

  /**
   * 全アンカーを取得
   * @returns アンカー配列（コピー）
   */
  all(): Anchor[] {
    return [...this.anchors];
  }
}
