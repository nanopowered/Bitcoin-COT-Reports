// Vérification de sa règle 2 : les commerciaux, contre-indicateur « more reliably wrong » —
// nets longs aux sommets, nets courts aux creux, mesurés en % de l'intérêt ouvert.

import type { TrackerRow } from '../analysis/tracker.ts';
import { scheduledPublication } from '../calendar/cot-calendar.ts';
import { closeOn, forwardReturn, type PriceIndex } from '../price/prices.ts';
import { spearman } from '../util/stats.ts';

export interface Pivot {
  asOf: string;
  kind: 'sommet' | 'creux';
  close: number;
  row: TrackerRow;
}

/**
 * Sommets et creux majeurs, identifiés APRÈS COUP : clôture d'une date d'arrêté qui est le plus haut
 * (ou le plus bas) des clôtures d'arrêté sur ± `halfWindow` semaines. Descriptif uniquement : la
 * définition regarde le futur par construction et ne sert pas à trader.
 */
export function majorPivots(t: readonly TrackerRow[], px: PriceIndex, halfWindow = 26): Pivot[] {
  const closes = t.map((r) => closeOn(px, r.asOf));
  const out: Pivot[] = [];
  for (let i = halfWindow; i + halfWindow < t.length; i++) {
    const c = closes[i];
    const win = closes.slice(i - halfWindow, i + halfWindow + 1).filter((x): x is number => x !== undefined);
    if (c === undefined || win.length === 0) continue;
    if (c === Math.max(...win)) out.push({ asOf: (t[i] as TrackerRow).asOf, kind: 'sommet', close: c, row: t[i] as TrackerRow });
    else if (c === Math.min(...win)) out.push({ asOf: (t[i] as TrackerRow).asOf, kind: 'creux', close: c, row: t[i] as TrackerRow });
  }
  return out;
}

/**
 * Corrélation de rang entre le net des commerciaux (% OI) et le rendement du bitcoin sur `weeks`
 * semaines après la publication. Un contre-indicateur fiable donnerait une corrélation négative.
 * Fenêtres chevauchantes : aucune p-valeur n'est calculée, la mesure est descriptive.
 */
export function commercialsForwardCorrelation(t: readonly TrackerRow[], px: PriceIndex, from: string, weeks: number) {
  const pairs = t
    .filter((r) => r.asOf >= from)
    .map((r) => [r.cNetPctOi, forwardReturn(px, scheduledPublication(r.asOf), weeks * 7)] as const)
    .filter((p): p is readonly [number, number] => p[1] !== undefined);
  return {
    n: pairs.length,
    rho: spearman(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
    ),
  };
}
