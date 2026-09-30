// Rapport CFTC « Traders in Financial Futures » (TFF), futures seuls : positions courtes des « Leveraged Funds »
// (hedge funds, CTA), la jambe vendeuse typique d'un arbitrage cash-and-carry. Valeurs publiées, rien de calculé.

import { readFileSync, writeFileSync } from 'node:fs';
import type { TvSeries } from './tradingview.ts';
import { parseCsvRecords, toCsv } from '../util/csv.ts';
import { assertISODate, fromUnixSeconds } from '../util/dates.ts';

export interface TffRow {
  /** Date d'arrêté, la même que celle du rapport Legacy. */
  asOf: string;
  /** Positions courtes des Leveraged Funds, en contrats. */
  levMoneyShort: number;
}

/** Symbole TradingView d'une série TFF, futures seuls (préfixe COT3). */
export const tffSymbol = (code: string, metric: string) => `COT3:${code}_F_${metric}`;

export function readTffCsv(path: string): TffRow[] {
  return parseCsvRecords(readFileSync(path, 'utf8'))
    .map((r) => {
      const v = Number(r['lev_money_short']);
      if (!Number.isFinite(v) || v < 0) throw new Error(`${path} : lev_money_short invalide (${r['as_of']})`);
      return { asOf: assertISODate(r['as_of'] ?? ''), levMoneyShort: v };
    })
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

export function writeTffCsv(path: string, rows: readonly TffRow[]): void {
  writeFileSync(
    path,
    toCsv(
      ['as_of', 'lev_money_short'],
      rows.map((r) => [r.asOf, r.levMoneyShort]),
    ),
  );
}

/** Série TradingView en 1D : une barre constante par date d'arrêté, horodatée à 00:00 UTC. */
export function tffFromTradingView(s: TvSeries): TffRow[] {
  if (s.interval !== '1D') throw new Error(`${s.symbol} : intervalle ${s.interval}, attendu 1D (dates d'arrêté exactes)`);
  const rows = s.bars.map((b) => {
    if (!(b.o === b.h && b.h === b.l && b.l === b.c)) throw new Error(`${s.symbol} : barre non constante au ${b.t}`);
    return { asOf: fromUnixSeconds(b.t), levMoneyShort: b.c };
  });
  const dates = new Set(rows.map((r) => r.asOf));
  if (dates.size !== rows.length) throw new Error(`${s.symbol} : dates d'arrêté en double`);
  return rows.sort((a, b) => a.asOf.localeCompare(b.asOf));
}
