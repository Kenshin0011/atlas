/**
 * フォールバックアダプタ
 * LLM未接続時の動作確認用
 * 埋め込みのみでなんちゃって損失を近似
 */

import { cosine } from '../utils/math';
import type { ModelAdapter, Utterance } from './types';

/**
 * コサインフォールバックアダプタ
 * 文字コードヒストグラムベースの簡易埋め込みを使用
 */
export class CosineFallbackAdapter implements ModelAdapter {
  /**
   * 履歴との類似度から擬似損失を計算
   */
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    const hText = history.map(h => h.text).join('\n');
    const [hVec, yVec] = await Promise.all([this.embed(hText), this.embed(current.text)]);
    const sim = cosine(hVec, yVec);
    return 1 - sim; // 擬似損失
  }

  /**
   * マスク後の履歴との類似度から擬似損失を計算
   */
  async maskedLoss(history: Utterance[], current: Utterance, masked: Utterance): Promise<number> {
    const hText = history
      .filter(h => h.id !== masked.id)
      .map(h => h.text)
      .join('\n');
    const [hVec, yVec] = await Promise.all([this.embed(hText), this.embed(current.text)]);
    const sim = cosine(hVec, yVec);
    return 1 - sim;
  }

  /**
   * 簡易埋め込み
   * 文字コードヒストグラムを固定次元ベクトルに変換
   */
  async embed(text: string): Promise<number[]> {
    const dim = 128;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[text.charCodeAt(i) % dim] += 1;
    }
    const n = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map(v => (n ? v / n : 0));
  }
}
