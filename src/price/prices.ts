import { readFileSync, writeFileSync } from 'node:fs';
import type { PriceBar } from '../types.ts';
import { parseCsvRecords, toCsv } from '../util/csv.ts';
import { addDays, assertISODate, daysBetween } from '../util/dates.ts';

export function readPriceCsv(path: string): PriceBar[] {
  const bars = parseCsvRecords(readFileSync(path, 'utf8')).map((r) => ({
    date: assertISODate(r['date'] ?? ''),
    open: Number(r['open']),
    high: Number(r['high']),
    low: Number(r['low']),
    close: Number(r['close']),
  }));
  for (const b of bars) {
    if (![b.open, b.high, b.low, b.close].every((v) => Number.isFinite(v) && v > 0)) {
      throw new Error(`${path} : prix invalide au ${b.date}`);
    }
  }
  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

export function writePriceCsv(path: string, bars: readonly PriceBar[]): void {
  writeFileSync(
    path,
    toCsv(
      ['date', 'open', 'high', 'low', 'close'],
      bars.map((b) => [b.date, b.open, b.high, b.low, b.close]),
    ),
  );
}

/** Index des clôtures quotidiennes ; refuse les trous (BTC cote 7 j / 7). */
export interface PriceIndex {
  first: string;
  last: string;
  closes: ReadonlyMap<string, number>;
}

export function indexPrices(bars: readonly PriceBar[]): PriceIndex {
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (!first || !last) throw new Error('Série de prix vide');
  const closes = new Map<string, number>();
  bars.forEach((b, i) => {
    const prev = bars[i - 1];
    if (prev && daysBetween(prev.date, b.date) !== 1) throw new Error(`Trou dans les prix entre ${prev.date} et ${b.date}`);
    closes.set(b.date, b.close);
  });
  return { first: first.date, last: last.date, closes };
}

export function closeOn(px: PriceIndex, date: string): number | undefined {
  return px.closes.get(date);
}

/** Rendement (%) de la clôture de `entry` à la clôture de `entry + days`. `undefined` si hors série. */
export function forwardReturn(px: PriceIndex, entry: string, days: number): number | undefined {
  const a = px.closes.get(entry);
  const b = px.closes.get(addDays(entry, days));
  if (a === undefined || b === undefined) return undefined;
  return (b / a - 1) * 100;
}

/**
 * Pire écart (%) entre la clôture d'entrée et les clôtures des `days` jours suivants.
 * Négatif ou nul par construction. `undefined` si la fenêtre n'est pas entièrement connue.
 */
export function maxDrawdownAfter(px: PriceIndex, entry: string, days: number): number | undefined {
  const a = px.closes.get(entry);
  if (a === undefined || !px.closes.has(addDays(entry, days))) return undefined;
  let worst = 0;
  for (let k = 1; k <= days; k++) {
    const c = px.closes.get(addDays(entry, k)) as number;
    worst = Math.min(worst, (c / a - 1) * 100);
  }
  return worst;
}
