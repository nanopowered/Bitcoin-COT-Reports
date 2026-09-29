// Étude d'événements : rendement du bitcoin 4, 13 et 26 semaines après un événement COT, comparé à
// l'ensemble des semaines de la même période (la « base »).
//
// Dates : l'événement est daté au MARDI d'arrêté des positions (c'est l'état du marché qu'il décrit).
// L'entrée se fait à la clôture du jour de PUBLICATION (vendredi en temps normal) : c'est la première
// clôture où l'information était connue. Entrer au mardi serait un look-ahead de trois jours ;
// cette variante est calculée à part, uniquement pour mesurer ce biais.

import type { TrackerRow } from './tracker.ts';
import type { PriceIndex } from '../price/prices.ts';
import { closeOn, forwardReturn, maxDrawdownAfter } from '../price/prices.ts';
import { scheduledPublication } from '../calendar/cot-calendar.ts';
import { addDays } from '../util/dates.ts';
import { median, mean, permutationPValue, shareAbove } from '../util/stats.ts';

export type EntryConvention = 'publication' | 'arrete';
export type Hypothesis = 'baisse' | 'hausse';

export const HORIZONS_WEEKS = [4, 13, 26] as const;

export interface Variant {
  id: string;
  label: string;
  /** Sens annoncé par la lecture de McClellan. */
  hypothesis: Hypothesis;
  events: number[];
  /** Semaines de référence (même régime), dont les événements eux-mêmes. */
  baseline: number[];
  /** Paramètres propres à la variante, affichés tels quels. */
  params?: string;
}

/** Entrée d'un ÉVÉNEMENT : la date où l'information était réellement publique (null si inconnue). */
export function entryDate(row: TrackerRow, conv: EntryConvention): string | null {
  return conv === 'arrete' ? row.asOf : row.publication;
}

/**
 * Entrée d'une semaine de BASE : le vendredi prévu, même en cas de publication retardée. La base mesure
 * le comportement du prix sur la période, qui ne dépend pas de la publication du COT ; exclure les
 * semaines de shutdown la biaiserait (en 2025, elles précèdent une forte baisse).
 */
export function baselineEntryDate(row: TrackerRow, conv: EntryConvention): string {
  return conv === 'arrete' ? row.asOf : scheduledPublication(row.asOf);
}

export interface HorizonStats {
  weeks: number;
  n: number;
  nIndependent: number;
  eventMedian: number;
  eventMean: number;
  eventShareUp: number;
  eventMddMedian: number;
  baseN: number;
  baseMedian: number;
  baseMean: number;
  baseShareUp: number;
  baseMddMedian: number;
  /** p unilatérale (permutation, médiane) dans le sens de l'hypothèse de McClellan. */
  pValue: number;
  /** p unilatérale dans le sens contraire : l'effet observé va-t-il à l'inverse de sa lecture ? */
  pValueOpposite: number;
}

export interface EventDetail {
  index: number;
  asOf: string;
  entry: string | null;
  entryClose: number | null;
  ncNet: number;
  ncNetPctOi: number;
  returns: (number | null)[];
  drawdowns: (number | null)[];
}

export interface VariantResult {
  variant: Omit<Variant, 'events' | 'baseline'>;
  entry: EntryConvention;
  excludedDelayed: string[];
  horizons: HorizonStats[];
  details: EventDetail[];
}

/** Nombre d'événements dont les fenêtres ne se chevauchent pas (sélection gloutonne chronologique). */
export function countIndependent(entries: readonly string[], days: number): number {
  let n = 0;
  let nextFree = '';
  for (const e of [...entries].sort()) {
    if (e >= nextFree) {
      n++;
      nextFree = addDays(e, days);
    }
  }
  return n;
}

export function runVariant(
  t: readonly TrackerRow[],
  px: PriceIndex,
  v: Variant,
  entry: EntryConvention,
  permutation: { draws?: number; seed?: number } = {},
): VariantResult {
  const excludedDelayed = v.events.filter((i) => entryDate(t[i] as TrackerRow, entry) === null).map((i) => (t[i] as TrackerRow).asOf);

  const details: EventDetail[] = v.events.map((i) => {
    const row = t[i] as TrackerRow;
    const e = entryDate(row, entry);
    return {
      index: i,
      asOf: row.asOf,
      entry: e,
      entryClose: e === null ? null : (closeOn(px, e) ?? null),
      ncNet: row.ncNet,
      ncNetPctOi: row.ncNetPctOi,
      returns: HORIZONS_WEEKS.map((w) => (e === null ? null : (forwardReturn(px, e, w * 7) ?? null))),
      drawdowns: HORIZONS_WEEKS.map((w) => (e === null ? null : (maxDrawdownAfter(px, e, w * 7) ?? null))),
    };
  });

  const horizons = HORIZONS_WEEKS.map((w, h) => {
    const days = w * 7;
    const ev = details.filter((d) => d.returns[h] !== null);
    const evRet = ev.map((d) => d.returns[h] as number);
    const evMdd = ev.map((d) => d.drawdowns[h] as number);
    const base = v.baseline
      .map((i) => baselineEntryDate(t[i] as TrackerRow, entry))
      .map((e) => ({ r: forwardReturn(px, e, days), m: maxDrawdownAfter(px, e, days) }))
      .filter((x): x is { r: number; m: number } => x.r !== undefined && x.m !== undefined);
    const baseRet = base.map((x) => x.r);
    return {
      weeks: w,
      n: evRet.length,
      nIndependent: countIndependent(
        ev.map((d) => d.entry as string),
        days,
      ),
      eventMedian: median(evRet),
      eventMean: mean(evRet),
      eventShareUp: shareAbove(evRet),
      eventMddMedian: median(evMdd),
      baseN: baseRet.length,
      baseMedian: median(baseRet),
      baseMean: mean(baseRet),
      baseShareUp: shareAbove(baseRet),
      baseMddMedian: median(base.map((x) => x.m)),
      pValue: permutationPValue(evRet, baseRet, median, v.hypothesis === 'baisse' ? 'lower' : 'higher', permutation),
      pValueOpposite: permutationPValue(evRet, baseRet, median, v.hypothesis === 'baisse' ? 'higher' : 'lower', permutation),
    };
  });

  const { events: _e, baseline: _b, ...meta } = v;
  return { variant: meta, entry, excludedDelayed, horizons, details };
}
