// Futures bitcoin CME : clôtures quotidiennes des deux premiers contrats (séries continues TradingView
// CME:BTC1! et CME:BTC2!). Valeurs de la source ; rien n'est calculé ici.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsvRecords, toCsv } from '../util/csv.ts';
import { assertISODate } from '../util/dates.ts';

export interface FuturesDay {
  /** Date de séance CME. */
  date: string;
  /** Clôture du contrat le plus proche de l'échéance. */
  f1: number;
  /** Clôture du contrat suivant. */
  f2: number;
}

export function readFuturesCsv(path: string): FuturesDay[] {
  const days = parseCsvRecords(readFileSync(path, 'utf8')).map((r) => ({
    date: assertISODate(r['date'] ?? ''),
    f1: Number(r['f1_close']),
    f2: Number(r['f2_close']),
  }));
  for (const d of days) {
    if (!(Number.isFinite(d.f1) && d.f1 > 0 && Number.isFinite(d.f2) && d.f2 > 0)) throw new Error(`${path} : clôture invalide le ${d.date}`);
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function writeFuturesCsv(path: string, days: readonly FuturesDay[]): void {
  writeFileSync(
    path,
    toCsv(
      ['date', 'f1_close', 'f2_close'],
      days.map((d) => [d.date, d.f1, d.f2]),
    ),
  );
}
