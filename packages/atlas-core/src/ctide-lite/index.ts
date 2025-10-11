// packages/ctide-lite/src/index.ts
// CTIDE-Lite（学習なし・リアルタイム） TypeScript実装
// - 直近k文のΔスコア算出
// - 帰無（シャッフル/ダミー）からp値化→BH-FDR
// - 時間減衰、MMR多様化、重要アンカーメモリ
// - LLM適合の抽象アダプタ（loss, maskedLoss, embed）
// Claude Code（Anthropic）/ OpenAI / ローカル埋め込み いずれでも適合可能

import type { Utterance as CoreUtterance } from '../types';

// CTIDE-Lite uses string IDs internally for flexibility
type Utterance = {
  id: string; // 一意ID（タイムスタンプでも可）
  text: string; // 発話本文
  ts?: number; // ms epoch（任意）
  speaker?: string; // 発話者（任意）
};

// CoreUtterance → CTIDE Utterance変換ヘルパー
export const toCTIDEUtterance = (u: CoreUtterance): Utterance => ({
  id: String(u.id),
  text: u.text,
  ts: u.timestamp,
  speaker: u.speaker,
});

// CTIDE Utterance → CoreUtterance変換ヘルパー
export const fromCTIDEUtterance = (u: Utterance, numericId?: number): CoreUtterance => ({
  id: numericId ?? Number.parseInt(u.id, 10),
  text: u.text,
  timestamp: u.ts ?? Date.now(),
  speaker: u.speaker ?? 'Unknown',
});

export type ScoreDetail = {
  baseLoss: number;
  maskedLoss: number;
  deltaLoss: number; // D_i = maskedLoss - baseLoss
  surprisalDelta?: number; // 任意
  ageWeight: number; // e^{-lambda * age}
  rawScore: number; // mix: 0.6*D + 0.4*surprisal
  finalScore: number; // rawScore * ageWeight
  pValue?: number; // 帰無から算出
};

export type ScoredUtterance = Utterance & {
  rank: number;
  score: number; // finalScore
  p?: number; // pValue
  detail: ScoreDetail;
};

export type CTIDEOptions = {
  k?: number; // 直近k文の厳密評価
  alphaMix?: number; // 損失/サプライザルの混合 (0..1)
  halfLifeTurns?: number; // 何発話で半減させるか
  nullSamples?: number; // 帰無サンプル数
  fdrAlpha?: number; // BHのFDR
  minTokensForSingle?: number; // 短文統合の閾値（トークン数相当、ざっくり）
  mmrLambda?: number; // 多様化強度 (0..1)
};

export const defaultOptions: Required<CTIDEOptions> = {
  k: 6,
  alphaMix: 0.6,
  halfLifeTurns: 20,
  nullSamples: 8,
  fdrAlpha: 0.1,
  minTokensForSingle: 5,
  mmrLambda: 0.7,
};

// ---- モデル適合アダプタ ----
// Claude Code などLLMに合わせて実装して注入する
export type ModelAdapter = {
  // 損失: L(Y | H)
  lossWithHistory: (history: Utterance[], current: Utterance) => Promise<number>;
  // マスク近似損失: L(Y | H \ {u})
  maskedLoss: (history: Utterance[], current: Utterance, masked: Utterance) => Promise<number>;
  // 埋め込み（MMR/類似検索用）
  embed: (text: string) => Promise<number[]>;
};

// フォールバック: 埋め込みのみ使って"なんちゃって"損失を近似（LLM未接続時の動作確認用）
export class CosineFallbackAdapter implements ModelAdapter {
  async lossWithHistory(history: Utterance[], current: Utterance): Promise<number> {
    const hText = history.map(h => h.text).join('\n');
    const [hVec, yVec] = await Promise.all([this.embed(hText), this.embed(current.text)]);
    const sim = cosine(hVec, yVec);
    return 1 - sim; // 擬似損失
  }
  async maskedLoss(history: Utterance[], current: Utterance, masked: Utterance): Promise<number> {
    const hText = history
      .filter(h => h.id !== masked.id)
      .map(h => h.text)
      .join('\n');
    const [hVec, yVec] = await Promise.all([this.embed(hText), this.embed(current.text)]);
    const sim = cosine(hVec, yVec);
    return 1 - sim;
  }
  async embed(text: string): Promise<number[]> {
    // 非依存・ダミー: 文字コードヒストグラムで固定次元に
    const dim = 128;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) vec[text.charCodeAt(i) % dim] += 1;
    const n = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map(v => (n ? v / n : 0));
  }
}

// ---- ユーティリティ ----
export const cosine = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
};

export const robustZ = (values: number[]): number[] => {
  const med = median(values);
  const abs = values.map(v => Math.abs(v - med));
  const mad = median(abs) || 1e-9;
  return values.map(v => 0.6745 * ((v - med) / mad));
};

export const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

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
    return lo / s.length; // F(x) = P(X ≤ x)
  };

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

export const timeDecayWeight = (ageTurns: number, halfLifeTurns: number): number => {
  const lambda = Math.log(2) / Math.max(1, halfLifeTurns);
  return Math.exp(-lambda * ageTurns);
};

export const mmrDiversify = async (
  items: ScoredUtterance[],
  embedder: (text: string) => Promise<number[]>,
  k: number,
  lambda = 0.7
): Promise<ScoredUtterance[]> => {
  const vecs = await Promise.all(items.map(i => embedder(i.text)));
  const chosen: number[] = [];
  const pool = new Set(items.map((_, idx) => idx));
  while (chosen.length < k && pool.size) {
    let bestIdx = -1;
    let bestScore = -Number.POSITIVE_INFINITY;
    for (const idx of pool) {
      const relevance = items[idx].score;
      let diversity = 0;
      for (const j of chosen) diversity = Math.max(diversity, cosine(vecs[idx], vecs[j]));
      const mmr = lambda * relevance - (1 - lambda) * diversity;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = idx;
      }
    }
    if (bestIdx === -1) break;
    chosen.push(bestIdx);
    pool.delete(bestIdx);
  }
  return chosen.map(i => items[i]);
};

// ---- 重要アンカーメモリ ----
export type Anchor = {
  id: string;
  text: string;
  score: number;
  ts?: number;
  topic?: string;
};

export class AnchorMemory {
  private anchors: Anchor[] = [];
  constructor(private maxSize = 200) {}
  add(a: Anchor) {
    this.anchors.push(a);
    this.anchors.sort((x, y) => y.score - x.score);
    if (this.anchors.length > this.maxSize) this.anchors.pop();
  }
  top(n = 10) {
    return this.anchors.slice(0, n);
  }
  all() {
    return [...this.anchors];
  }
}

// ---- コア：スコアリング & 選別 ----
export const ctideLite = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  opts: CTIDEOptions = {}
): Promise<{ important: ScoredUtterance[]; scored: ScoredUtterance[]; nullScores: number[] }> => {
  const o = { ...defaultOptions, ...opts };
  const recent = history.slice(-o.k);
  const baseLoss = await adapter.lossWithHistory(history, current);

  // 候補集合：直近k + （任意）外部のアンカー/要約ノードは上位層から別注入
  const candidates = [...recent];

  // 各候補のスコア
  const details: ScoreDetail[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const u = candidates[i];
    const masked = await adapter.maskedLoss(history, current, u);
    const delta = masked - baseLoss; // 劣化量
    const surpr = 0; // 実装する場合はここで差分を入れる
    const ageTurns = history.length - history.indexOf(u); // 新しいほど小
    const ageW = timeDecayWeight(ageTurns, o.halfLifeTurns);
    const raw = o.alphaMix * delta + (1 - o.alphaMix) * surpr;
    const final = raw * ageW;
    details.push({
      baseLoss,
      maskedLoss: masked,
      deltaLoss: delta,
      surprisalDelta: surpr,
      ageWeight: ageW,
      rawScore: raw,
      finalScore: final,
    });
  }

  // 帰無サンプル生成（シャッフル/ダミー）。ここでは簡易にシャッフルのみ。
  const nullScores: number[] = [];
  for (let s = 0; s < o.nullSamples; s++) {
    const shuffled = shuffle(history);
    const baseNull = await adapter.lossWithHistory(shuffled, current);
    // 直近k相当を適当に抜粋
    const sample = shuffled.slice(-Math.min(o.k, shuffled.length));
    for (const u of sample) {
      const ml = await adapter.maskedLoss(shuffled, current, u);
      nullScores.push(ml - baseNull);
    }
  }

  // 正規化 → p値化 → BH
  const finals = details.map(d => d.finalScore);
  const z = robustZ([...finals, ...nullScores]);
  const zFinals = z.slice(0, finals.length);
  const zNull = z.slice(finals.length);
  const F0 = ecdf(zNull);
  const pvals = zFinals.map(v => 1 - F0(v));

  const scored: ScoredUtterance[] = candidates
    .map((u, i) => ({
      ...u,
      rank: 0,
      score: details[i].finalScore,
      p: pvals[i],
      detail: details[i],
    }))
    .sort((a, b) => b.score - a.score);
  // Assign ranks
  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i + 1;
  }

  const idx = benjaminiHochberg(pvals, o.fdrAlpha);
  const important = idx
    .sort((a, b) => details[b].finalScore - details[a].finalScore)
    .map(i => {
      const found = scored.find(s => s.id === candidates[i].id);
      if (!found) throw new Error(`Scored utterance not found for candidate ${i}`);
      return found;
    });

  return { important, scored, nullScores };
};

// ---- ヘルパ ----
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- 重要アンカー統合パイプ ----
export const ctideWithAnchors = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  anchorMemory: AnchorMemory,
  opts: CTIDEOptions = {}
) => {
  const base = await ctideLite(adapter, history, current, opts);
  // アンカー上位Nも候補に含めて再評価（軽量版：コサイン類似でブースト）
  const anchors = anchorMemory.top(10);
  if (anchors.length) {
    const [yVec, ...aVecs] = await Promise.all([
      adapter.embed(current.text),
      ...anchors.map(a => adapter.embed(a.text)),
    ]);
    const boost = anchors.map((a, i) => ({ a, sim: cosine(aVecs[i], yVec) }));
    // ブーストは擬似的に finalScore へ加算
    const boosted = base.scored.map(s => ({ ...s }));
    for (const b of boost) {
      // アンカーに近いテキストは+sim*0.2 を加点
      for (const s of boosted) {
        s.score += 0.2 * b.sim;
      }
    }
    boosted.sort((x, y) => y.score - x.score);
    // Assign ranks
    for (let i = 0; i < boosted.length; i++) {
      boosted[i].rank = i + 1;
    }
    return { ...base, scored: boosted };
  }
  return base;
};
