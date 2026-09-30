// Rendements du Trésor américain, % par an : bon à 3 mois et obligation à 10 ans (TradingView TVC:US03MY
// et TVC:US10Y). Valeurs de la source ; une cellule vide signale une séance sans cotation pour ce taux.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsvRecords, toCsv } from '../util/csv.ts';
import { assertISODate } from '../util/dates.ts';

export interface RateDay {
  date: string;
  /** Bon du Trésor à 3 mois. */
  us03m: number | null;
  /** Obligation du Trésor à 10 ans. */
  us10y: number | null;
}

function cell(path: string, date: string, raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new Error(`${path} : taux invalide le ${date}`);
  return v;
}

export function readRatesCsv(path: string): RateDay[] {
  return parseCsvRecords(readFileSync(path, 'utf8'))
    .map((r) => {
      const date = assertISODate(r['date'] ?? '');
      return { date, us03m: cell(path, date, r['us03m']), us10y: cell(path, date, r['us10y']) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function writeRatesCsv(path: string, days: readonly RateDay[]): void {
  writeFileSync(
    path,
    toCsv(
      ['date', 'us03m', 'us10y'],
      days.map((d) => [d.date, d.us03m, d.us10y]),
    ),
  );
}
