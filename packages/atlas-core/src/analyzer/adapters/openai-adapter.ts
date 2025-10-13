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
  /** 時間減衰率（重み付き平均用、デフォルト: 0.15） */
  decayLambda?: number;
};

export class OpenAIAdapter implements ModelAdapter {
  private apiKey: string;
  private model: string;
  private embeddingDimension: number;
  private decayLambda: number;
  private cache: Map<string, number[]> = new Map();

  constructor(config: OpenAIAdapterConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.embeddingDimension = config.embeddingDimension || 1536;
    this.decayLambda = config.decayLambda ?? 0.15;
  }

  /**
   * OpenAI APIから埋め込みを取得（キャッシュ付き + リトライ）
   */
  async embed(text: string): Promise<number[]> {
    // Cache check
    const cached = this.cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    // リトライ付きAPI呼び出し
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
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

        // Rate Limitエラーの場合はリトライ
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2 ** attempt * 1000;
          console.warn(
            `Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding as number[];

        // Cache
        this.cache.set(text, embedding);

        return embedding;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const waitTime = 2 ** attempt * 1000;
          console.warn(
            `API call failed, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('OpenAI API call failed after retries');
  }

  /**
   * コサイン類似度から損失を近似
   * 損失が高い = 履歴から現在発話を予測困難
   *
   * 最適化: 履歴を結合せず、各発話の埋め込みの重み付き平均で計算
   * → API呼び出しは各発話1回のみ（キャッシュ効果大）
   * 重み付き平均により、最近の発話の影響を大きくして感度を向上
   */
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    if (history.length === 0) {
      return 1.0; // Maximum loss when no history
    }

    // 各発話の埋め込みを取得（キャッシュから or 1回だけAPI）
    const [historyVecs, currentVec] = await Promise.all([
      Promise.all(history.map(h => this.embed(h.text))),
      this.embed(current.text),
    ]);

    // 時間減衰を考慮した重み付き平均ベクトルを計算（API不要）
    const weights = this.computeTemporalWeights(historyVecs.length);
    const avgVec = this.weightedAverageVectors(historyVecs, weights);

    const similarity = this.cosineSimilarity(avgVec, currentVec);

    // Loss = 1 - similarity (range: [0, 2], typically [0, 1])
    return 1 - similarity;
  }

  /**
   * マスク損失を近似
   * 特定の発話を除外した履歴から損失を計算
   * ΔLoss = L(Y|H\{u}) - L(Y|H) で発話uの情報量を測定
   *
   * 最適化: 重み付き平均から該当発話を除外して再計算（API不要）
   */
  async maskedLoss(history: Utterance[], current: Utterance, masked: Utterance): Promise<number> {
    // 除外する発話のインデックスを見つける
    const maskedIndex = history.findIndex(h => h.id === masked.id);
    if (maskedIndex === -1) {
      throw new Error(`Masked utterance not found in history: ${masked.id}`);
    }

    const filteredHistory = history.filter(h => h.id !== masked.id);

    if (filteredHistory.length === 0) {
      return 1.0; // Maximum loss when no history
    }

    // 各発話の埋め込みを取得（キャッシュから or 1回だけAPI）
    const [filteredVecs, currentVec] = await Promise.all([
      Promise.all(filteredHistory.map(h => this.embed(h.text))),
      this.embed(current.text),
    ]);

    // 元の重みを計算し、除外したインデックスを削除
    const originalWeights = this.computeTemporalWeights(history.length);
    const filteredWeights = originalWeights.filter((_, i) => i !== maskedIndex);

    // フィルタ後の重み付き平均ベクトルを計算（API不要）
    const avgVec = this.weightedAverageVectors(filteredVecs, filteredWeights);

    const similarity = this.cosineSimilarity(avgVec, currentVec);

    return 1 - similarity;
  }

  /**
   * 時間減衰を考慮した重みを計算
   * 新しい発話ほど大きな重みを持つ（exponential decay）
   * @param length 履歴の長さ
   * @returns 正規化された重み配列（合計=1）
   */
  private computeTemporalWeights(length: number): number[] {
    if (length === 0) {
      return [];
    }

    // weight[i] = exp(-lambda × (length - 1 - i))
    // i=0が最古、i=length-1が最新
    const weights = Array.from({ length }, (_, i) => {
      const distance = length - 1 - i; // 最新からの距離
      return Math.exp(-this.decayLambda * distance);
    });

    // 正規化（合計=1）
    const sum = weights.reduce((acc, w) => acc + w, 0);
    return weights.map(w => w / sum);
  }

  /**
   * ベクトルの重み付き平均を計算
   * @param vectors ベクトル配列
   * @param weights 重み配列（正規化済み、合計=1）
   * @returns 重み付き平均ベクトル
   */
  private weightedAverageVectors(vectors: number[][], weights: number[]): number[] {
    if (vectors.length === 0) {
      throw new Error('Cannot average empty vector array');
    }
    if (vectors.length !== weights.length) {
      throw new Error('Vectors and weights must have the same length');
    }

    const dim = vectors[0].length;
    const sum = new Array(dim).fill(0);

    for (let i = 0; i < vectors.length; i++) {
      const vec = vectors[i];
      const weight = weights[i];
      for (let j = 0; j < dim; j++) {
        sum[j] += vec[j] * weight;
      }
    }

    return sum; // 既に正規化された重みを使用しているため、そのまま返す
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
