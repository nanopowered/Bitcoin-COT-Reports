// Statistiques descriptives et test de permutation. Aucune dépendance.

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5);
}

/** Quantile par interpolation linéaire (type 7, celui de R et de numpy par défaut). */
export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = s[lo] as number;
  const b = s[hi] as number;
  return a + (b - a) * (pos - lo);
}

/**
 * Rang percentile « mid-rank » de `x` dans `history` : (nb < x + ½ · nb = x) / n, dans [0, 1].
 * `history` ne doit contenir QUE des observations antérieures : c'est à l'appelant de garantir
 * l'absence de look-ahead.
 */
export function midRank(history: readonly number[], x: number): number {
  if (history.length === 0) return Number.NaN;
  let below = 0;
  let equal = 0;
  for (const v of history) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return (below + 0.5 * equal) / history.length;
}

export function shareAbove(xs: readonly number[], threshold = 0): number {
  if (xs.length === 0) return Number.NaN;
  return xs.filter((x) => x > threshold).length / xs.length;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : les p-valeurs sont reproductibles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface PermutationOptions {
  draws?: number;
  seed?: number;
}

/**
 * Test de permutation unilatéral : on tire au hasard, sans remise, autant de semaines dans
 * `baseline` qu'il y a d'événements, et on compte la fréquence à laquelle la statistique du
 * tirage est au moins aussi extrême que celle des événements.
 *
 * `direction = 'lower'` teste « les événements font moins bien que la base ».
 * Hypothèse implicite : semaines échangeables. Les fenêtres qui se chevauchent et les
 * événements groupés dans le temps violent cette hypothèse ; la p-valeur est donc optimiste.
 */
export function permutationPValue(
  events: readonly number[],
  baseline: readonly number[],
  stat: (xs: readonly number[]) => number,
  direction: 'lower' | 'higher',
  { draws = 20_000, seed = 20_260_929 }: PermutationOptions = {},
): number {
  const n = events.length;
  if (n === 0 || baseline.length < n) return Number.NaN;
  const observed = stat(events);
  const rand = mulberry32(seed);
  const pool = [...baseline];
  const sample = new Array<number>(n);
  let extreme = 0;
  for (let d = 0; d < draws; d++) {
    // Fisher-Yates partiel : les n premières cases forment un tirage sans remise.
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(rand() * (pool.length - i));
      const tmp = pool[i] as number;
      pool[i] = pool[j] as number;
      pool[j] = tmp;
      sample[i] = pool[i] as number;
    }
    const s = stat(sample);
    if (direction === 'lower' ? s <= observed : s >= observed) extreme++;
  }
  return (extreme + 1) / (draws + 1);
}

/** Rangs moyens (les ex æquo reçoivent la moyenne de leurs rangs), base 1. */
export function averageRanks(xs: readonly number[]): number[] {
  const order = xs.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(xs.length).fill(0);
  let k = 0;
  while (k < order.length) {
    let j = k;
    while (j + 1 < order.length && order[j + 1]!.value === order[k]!.value) j++;
    for (let m = k; m <= j; m++) ranks[order[m]!.index] = (k + j) / 2 + 1;
    k = j + 1;
  }
  return ranks;
}

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n !== ys.length || n < 3) return Number.NaN;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return cov / Math.sqrt(vx * vy);
}

/** Corrélation de rang de Spearman. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  return pearson(averageRanks(xs), averageRanks(ys));
}
