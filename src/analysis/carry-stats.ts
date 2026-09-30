// Statistiques descriptives sur la prime des futures CME : médianes annuelles, lien avec la part des shorts
// non commerciaux dans l'OI, et passages net short selon la prime du moment. Tout est calculé.

import { entryDate } from './backtest.ts';
import type { WeeklyCarry } from './carry.ts';
import { crossingEvents, firstNetLongIndex } from './events.ts';
import type { TrackerRow } from './tracker.ts';
import { forwardReturn, type PriceIndex } from '../price/prices.ts';
import { median, permutationPValue, spearman } from '../util/stats.ts';

export type CarryMeasure = 'carry' | 'excess3m' | 'excess10y';
export const CARRY_MEASURES: readonly { key: CarryMeasure; label: string }[] = [
  { key: 'carry', label: 'Prime brute' },
  { key: 'excess3m', label: 'Prime − taux à 3 mois' },
  { key: 'excess10y', label: 'Prime − taux à 10 ans' },
];

/** Part des positions courtes non commerciales dans l'intérêt ouvert, en % (calculée). */
export const ncShortPctOi = (r: TrackerRow) => (r.nonCommShort / r.openInterest) * 100;

export interface AnnualCarry {
  year: string;
  weeks: number;
  carry: number | null;
  us03m: number | null;
  us10y: number | null;
  excess3m: number | null;
  excess10y: number | null;
  ncShortPctOi: number;
}

export interface CorrelationRow {
  measure: CarryMeasure;
  /** Spearman entre niveaux hebdomadaires (séries autocorrélées : descriptif, pas de test). */
  levels: number;
  levelsN: number;
  /** Spearman entre variations sur 13 semaines, fenêtres qui ne se chevauchent pas. */
  changes13: number;
  changes13N: number;
}

export interface CorrelationPeriod {
  label: string;
  from: string;
  to: string;
  rows: CorrelationRow[];
}

export interface CrossingCarry {
  asOf: string;
  entry: string | null;
  carry: number | null;
  us03m: number | null;
  excess3m: number | null;
  /** Rendement du bitcoin 13 semaines après la publication, % ; null si inconnu. */
  ret13: number | null;
}

export interface CrossingSplit {
  /** Excès médian qui sépare les deux groupes. */
  threshold: number;
  thin: number[];
  wide: number[];
  thinMedian: number;
  wideMedian: number;
  /** p unilatérale : le groupe « excès faible » fait-il moins bien qu'une moitié tirée au hasard ? */
  pThinLower: number;
}

export interface CarryStats {
  annual: AnnualCarry[];
  correlations: CorrelationPeriod[];
  crossings: CrossingCarry[];
  split: CrossingSplit | null;
}

const med = (xs: readonly (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? median(v) : null;
};

function correlations(t: readonly TrackerRow[], w: readonly WeeklyCarry[], idx: readonly number[]): CorrelationRow[] {
  return CARRY_MEASURES.map(({ key }) => {
    const lv = idx.flatMap((i) => {
      const x = (w[i] as WeeklyCarry)[key];
      return x === null ? [] : [[x, ncShortPctOi(t[i] as TrackerRow)] as const];
    });
    const ch: (readonly [number, number])[] = [];
    for (let k = 13; k < idx.length; k += 13) {
      const i = idx[k] as number;
      const j = idx[k - 13] as number;
      const a = (w[i] as WeeklyCarry)[key];
      const b = (w[j] as WeeklyCarry)[key];
      if (a === null || b === null) continue;
      ch.push([a - b, ncShortPctOi(t[i] as TrackerRow) - ncShortPctOi(t[j] as TrackerRow)]);
    }
    return {
      measure: key,
      levels: spearman(
        lv.map(([x]) => x),
        lv.map(([, y]) => y),
      ),
      levelsN: lv.length,
      changes13: spearman(
        ch.map(([x]) => x),
        ch.map(([, y]) => y),
      ),
      changes13N: ch.length,
    };
  });
}

export function carryStats(
  t: readonly TrackerRow[],
  w: readonly WeeklyCarry[],
  px: PriceIndex,
  permutation: { draws?: number; seed?: number } = {},
): CarryStats {
  if (t.length !== w.length || t.some((r, i) => r.asOf !== (w[i] as WeeklyCarry).asOf)) {
    throw new Error('Prime hebdomadaire et suivi COT non alignés');
  }

  const years = [...new Set(t.map((r) => r.asOf.slice(0, 4)))];
  const annual = years.map((year) => {
    const idx = t.flatMap((r, i) => (r.asOf.startsWith(year) ? [i] : []));
    const pick = (k: CarryMeasure | 'us03m' | 'us10y') => med(idx.map((i) => (w[i] as WeeklyCarry)[k]));
    return {
      year,
      weeks: idx.length,
      carry: pick('carry'),
      us03m: pick('us03m'),
      us10y: pick('us10y'),
      excess3m: pick('excess3m'),
      excess10y: pick('excess10y'),
      ncShortPctOi: median(idx.map((i) => ncShortPctOi(t[i] as TrackerRow))),
    };
  });

  const regimeStart = firstNetLongIndex(t);
  const all = t.map((_, i) => i);
  const periods: { label: string; idx: number[] }[] = [
    { label: 'Toute la série', idx: all },
    { label: 'Nets courts en permanence', idx: all.slice(0, regimeStart) },
    { label: 'Oscillation autour de zéro', idx: all.slice(regimeStart) },
  ];
  const correlationPeriods = periods
    .filter((p) => p.idx.length > 26)
    .map((p) => ({
      label: p.label,
      from: (t[p.idx[0] as number] as TrackerRow).asOf,
      to: (t[p.idx[p.idx.length - 1] as number] as TrackerRow).asOf,
      rows: correlations(t, w, p.idx),
    }));

  // Mêmes conventions que le backtest : entrée à la clôture du jour de publication, 13 semaines = 91 jours.
  const crossings: CrossingCarry[] = crossingEvents(t).map((i) => {
    const row = t[i] as TrackerRow;
    const c = w[i] as WeeklyCarry;
    const entry = entryDate(row, 'publication');
    const ret13 = entry === null ? null : (forwardReturn(px, entry, 91) ?? null);
    return { asOf: row.asOf, entry, carry: c.carry, us03m: c.us03m, excess3m: c.excess3m, ret13 };
  });

  const usable = crossings.filter((c): c is CrossingCarry & { excess3m: number; ret13: number } => c.excess3m !== null && c.ret13 !== null);
  let split: CrossingSplit | null = null;
  if (usable.length >= 6) {
    const sorted = [...usable].sort((a, b) => a.excess3m - b.excess3m);
    const half = Math.floor(sorted.length / 2);
    const thin = sorted.slice(0, half).map((c) => c.ret13);
    const wide = sorted.slice(half).map((c) => c.ret13);
    split = {
      threshold: median(usable.map((c) => c.excess3m)),
      thin,
      wide,
      thinMedian: median(thin),
      wideMedian: median(wide),
      pThinLower: permutationPValue(thin, [...thin, ...wide], median, 'lower', permutation),
    };
  }

  return { annual, correlations: correlationPeriods, crossings, split };
}
