// Définitions d'événements pour le backtest. Chaque fonction renvoie des indices de semaines du tracker.
// Aucune ne regarde le futur : la décision de la semaine t n'utilise que les semaines ≤ t.

import type { TrackerRow } from './tracker.ts';
import { midRank } from '../util/stats.ts';

/** Passage net short : semaine t−1 nette longue (≥ 0), semaine t nette courte (< 0). Aucun paramètre. */
export function crossingEvents(t: readonly TrackerRow[]): number[] {
  return t.flatMap((row, i) => (row.crossNetShort ? [i] : []));
}

export interface MarkedOptions {
  /** Fenêtre glissante (en semaines) qui définit la « plage normale » du niveau. */
  window: number;
  /** Rang percentile maximal du niveau (% de l'OI) dans cette fenêtre pour parler de net short « marqué ». */
  q: number;
}

/**
 * Passage net short « marqué » — traduction opérationnelle de « crossed over to the net short side
 * in a big way », qui N'EST PAS chiffrée par McClellan :
 *   - l'épisode net short doit commencer par un passage net long → net short (« crossed over ») ;
 *   - l'événement est la première semaine de l'épisode où le niveau (% de l'OI) se classe dans le
 *     q-ième percentile inférieur des `window` semaines précédentes (« in a big way », jugé contre la
 *     plage normale, sa règle 3).
 * Au plus un événement par épisode. Les épisodes entamés avant le début de la série (2018-2021 :
 * jamais nets longs) ne comptent pas, faute de passage.
 */
export function markedNetShortEvents(t: readonly TrackerRow[], { window, q }: MarkedOptions): number[] {
  const events: number[] = [];
  let inCrossingSpell = false;
  let emitted = false;
  t.forEach((row, i) => {
    if (row.ncNet >= 0) {
      inCrossingSpell = false;
      return;
    }
    if (row.crossNetShort) {
      inCrossingSpell = true;
      emitted = false;
    }
    if (!inCrossingSpell || emitted || i < window) return;
    const past = t.slice(i - window, i).map((x) => x.ncNetPctOi);
    if (midRank(past, row.ncNetPctOi) <= q) {
      events.push(i);
      emitted = true;
    }
  });
  return events;
}

/** Variation hebdomadaire (points d'OI) dans la queue basse (débouclage) ou haute (reconstruction). */
export function speedEvents(t: readonly TrackerRow[], side: 'baisse' | 'hausse', tail: number): number[] {
  return t.flatMap((row, i) => {
    const p = row.pctlDNcNetPp;
    if (p === null) return [];
    return (side === 'baisse' ? p <= tail : p >= 1 - tail) ? [i] : [];
  });
}

/** Première semaine nette longue de la série : début du régime où un passage net short est possible. */
export function firstNetLongIndex(t: readonly TrackerRow[]): number {
  const i = t.findIndex((row) => row.ncNet >= 0);
  if (i < 0) throw new Error('Les non-commerciaux ne sont jamais nets longs dans la série');
  return i;
}
