/**
 * OpenAIアダプタ
 * text-embedding-3-smallを使用した埋め込み
 * 埋め込み空間でのコサイン類似度により損失を近似
 */

import type { ModelAdapter, Utterance } from './types';

/**
 * OpenAIアダプタ設定
 */
export type OpenAIAdapterConfig = {
  /** OpenAI APIキー */
  apiKey: string;
  /** 埋め込みモデル名 */
  model?: string;
  /** 埋め込み次元数 */
  embeddingDimension?: number;
};

export class OpenAIAdapter implements ModelAdapter {
  private apiKey: string;
  private model: string;
  private embeddingDimension: number;
  private cache: Map<string, number[]> = new Map();

  constructor(config: OpenAIAdapterConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.embeddingDimension = config.embeddingDimension || 1536;
  }

  /**
   * OpenAI APIから埋め込みを取得（キャッシュ付き）
   */
  async embed(text: string): Promise<number[]> {
    // Cache check
    const cached = this.cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        dimensions: this.embeddingDimension,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding as number[];

    // Cache
    this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * コサイン類似度から損失を近似
   * 損失が高い = 履歴から現在発話を予測困難
   */
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    if (history.length === 0) {
      return 1.0; // Maximum loss when no history
    }

    // Concatenate history (weighted by recency)
    const historyText = history.map(h => h.text).join('\n');

    const [historyVec, currentVec] = await Promise.all([
      this.embed(historyText),
      this.embed(current.text),
    ]);

    const similarity = this.cosineSimilarity(historyVec, currentVec);

    // Loss = 1 - similarity (range: [0, 2], typically [0, 1])
    return 1 - similarity;
  }

  /**
   * マスク損失を近似
   * 特定の発話を除外した履歴から損失を計算
   * ΔLoss = L(Y|H\{u}) - L(Y|H) で発話uの情報量を測定
   */
  async maskedLoss(history: Utterance[], current: Utterance, masked: Utterance): Promise<number> {
    const filteredHistory = history.filter(h => h.id !== masked.id);

    if (filteredHistory.length === 0) {
      return 1.0; // Maximum loss when no history
    }

    const historyText = filteredHistory.map(h => h.text).join('\n');

    const [historyVec, currentVec] = await Promise.all([
      this.embed(historyText),
      this.embed(current.text),
    ]);

    const similarity = this.cosineSimilarity(historyVec, currentVec);

    return 1 - similarity;
  }

  /**
   * 2つのベクトル間のコサイン類似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * キャッシュをクリア（メモリ管理用）
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得（監視用）
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
