// Reconstitution du rapport Legacy à partir des séries COT de TradingView (symboles « COT:<code>_F_<métrique> »),
// telles que renvoyées par get_ohlcv en intervalle 1D : une barre par date d'arrêté, horodatée au mardi 00:00 UTC,
// avec open = high = low = close = valeur publiée par la CFTC.

import type { CotLegacyRow } from '../types.ts';
import { fromUnixSeconds } from '../util/dates.ts';
import { sortAndDedupe } from './legacy.ts';

export interface TvBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface TvSeries {
  symbol: string;
  interval: string;
  bars: TvBar[];
}

/** Métrique TradingView (Legacy, futures seuls, « All ») → champ du rapport. */
export const TV_LEGACY_METRICS = {
  OI: 'openInterest',
  NCP_L: 'nonCommLong',
  NCP_S: 'nonCommShort',
  NCP_SPREAD: 'nonCommSpread',
  CP_L: 'commLong',
  CP_S: 'commShort',
  NRP_L: 'nonReptLong',
  NRP_S: 'nonReptShort',
} as const satisfies Record<string, keyof CotLegacyRow>;

export type TvMetric = keyof typeof TV_LEGACY_METRICS;

export function tvSymbol(code: string, metric: TvMetric): string {
  return `COT:${code}_F_${metric}`;
}

export function rowsFromTradingView(code: string, series: readonly TvSeries[]): CotLegacyRow[] {
  const values = new Map<string, Partial<CotLegacyRow>>();
  for (const metric of Object.keys(TV_LEGACY_METRICS) as TvMetric[]) {
    const symbol = tvSymbol(code, metric);
    const s = series.find((x) => x.symbol === symbol);
    if (!s) throw new Error(`Série TradingView manquante : ${symbol}`);
    if (s.interval !== '1D') throw new Error(`${symbol} : intervalle ${s.interval}, attendu 1D (dates d'arrêté exactes)`);
    for (const b of s.bars) {
      if (!(b.o === b.h && b.h === b.l && b.l === b.c)) throw new Error(`${symbol} : barre non constante au ${b.t}`);
      const asOf = fromUnixSeconds(b.t);
      const row = values.get(asOf) ?? { asOf };
      row[TV_LEGACY_METRICS[metric]] = b.c;
      values.set(asOf, row);
    }
  }
  const rows = [...values.values()].map((r) => {
    for (const field of Object.values(TV_LEGACY_METRICS)) {
      if (typeof r[field] !== 'number') throw new Error(`Date ${r.asOf} : ${field} absent d'une des séries`);
    }
    return r as CotLegacyRow;
  });
  return sortAndDedupe(rows);
}
