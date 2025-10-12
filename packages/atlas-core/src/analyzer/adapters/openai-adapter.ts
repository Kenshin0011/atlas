/**
 * OpenAI Adapter for Conversation Analyzer
 * Uses text-embedding-3-small for embeddings
 * Approximates loss via cosine similarity in embedding space
 */

import type { ModelAdapter } from '../..';

// Internal Analyzer Utterance type (matches the one in index.ts)
type Utterance = {
  id: string;
  text: string;
  ts?: number;
  speaker?: string;
};

export type OpenAIAdapterConfig = {
  apiKey: string;
  model?: string;
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
   * Get embeddings from OpenAI API with caching
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
   * Approximate loss as 1 - cosine similarity
   * Higher loss = current utterance is less predictable from history
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
   * Approximate masked loss by removing one utterance from history
   * ΔLoss = L(Y|H\{u}) - L(Y|H) measures information contribution of u
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
   * Cosine similarity between two vectors
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
   * Clear embedding cache (useful for memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
