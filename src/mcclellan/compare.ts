// Faits COT et prix correspondant à chaque édition : ce que montrait la donnée le mardi d'arrêté
// commenté. Tous les rangs sont calculés parmi les semaines connues à cette date (pas de look-ahead).

import type { TrackerRow } from '../analysis/tracker.ts';
import type { PriceIndex } from '../price/prices.ts';
import { closeOn } from '../price/prices.ts';
import { addDays } from '../util/dates.ts';
import type { Edition } from './editions.ts';

export interface SeriesRecord {
  value: number;
  asOf: string;
}

export interface EditionFacts {
  edition: Edition;
  row: TrackerRow;
  /** Rang du net NC (contrats) parmi toutes les semaines ≤ arrêté, 1 = le plus élevé. */
  rankNcNet: number;
  rankNcNetPct: number;
  weeksKnown: number;
  recordNcNet: SeriesRecord;
  recordNcNetPct: SeriesRecord;
  dNcNet2w: number | null;
  dNcNet3w: number | null;
  dNcNetPp2w: number | null;
  dNcNetPp3w: number | null;
  closeAsOf: number | undefined;
  closePrevAsOf: number | undefined;
  closeEdition: number | undefined;
  /** Variations quotidiennes (%) du bitcoin sur les 7 jours qui précèdent l'édition (inclus). */
  dailyBefore: { date: string; ret: number }[];
}

function rankOf(values: readonly number[], x: number): number {
  return values.filter((v) => v > x).length + 1;
}

function recordOf(rows: readonly TrackerRow[], key: 'ncNet' | 'ncNetPctOi'): SeriesRecord {
  let best = rows[0] as TrackerRow;
  for (const r of rows) if (r[key] > best[key]) best = r;
  return { value: best[key], asOf: best.asOf };
}

export function editionFacts(t: readonly TrackerRow[], px: PriceIndex, e: Edition): EditionFacts {
  const i = t.findIndex((r) => r.publication === e.edition);
  if (i < 0) throw new Error(`Aucune semaine COT publiée le ${e.edition}`);
  const row = t[i] as TrackerRow;
  const known = t.slice(0, i + 1);
  const back = (k: number) => t[i - k];
  const diff = (k: number, key: 'ncNet' | 'ncNetPctOi') => {
    const b = back(k);
    return b ? row[key] - b[key] : null;
  };
  const dailyBefore: { date: string; ret: number }[] = [];
  for (let k = 6; k >= 0; k--) {
    const d = addDays(e.edition, -k);
    const c = closeOn(px, d);
    const p = closeOn(px, addDays(d, -1));
    if (c !== undefined && p !== undefined) dailyBefore.push({ date: d, ret: (c / p - 1) * 100 });
  }
  const prev = back(1);
  return {
    edition: e,
    row,
    rankNcNet: rankOf(
      known.map((r) => r.ncNet),
      row.ncNet,
    ),
    rankNcNetPct: rankOf(
      known.map((r) => r.ncNetPctOi),
      row.ncNetPctOi,
    ),
    weeksKnown: known.length,
    recordNcNet: recordOf(known, 'ncNet'),
    recordNcNetPct: recordOf(known, 'ncNetPctOi'),
    dNcNet2w: diff(2, 'ncNet'),
    dNcNet3w: diff(3, 'ncNet'),
    dNcNetPp2w: diff(2, 'ncNetPctOi'),
    dNcNetPp3w: diff(3, 'ncNetPctOi'),
    closeAsOf: closeOn(px, row.asOf),
    closePrevAsOf: prev ? closeOn(px, prev.asOf) : undefined,
    closeEdition: closeOn(px, e.edition),
    dailyBefore,
  };
}
