import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsFromTradingView, TV_LEGACY_METRICS, tvSymbol, type TvMetric, type TvSeries } from '../src/cot/tradingview.ts';

const T = 1790035200; // 2026-09-22 00:00 UTC
const VALUES: Record<TvMetric, number> = {
  OI: 22315,
  NCP_L: 17658,
  NCP_S: 14902,
  NCP_SPREAD: 3307,
  CP_L: 66,
  CP_S: 3175,
  NRP_L: 1284,
  NRP_S: 931,
};
const series = (skip?: TvMetric): TvSeries[] =>
  (Object.keys(TV_LEGACY_METRICS) as TvMetric[])
    .filter((m) => m !== skip)
    .map((m) => ({ symbol: tvSymbol('133741', m), interval: '1D', bars: [{ t: T, o: VALUES[m], h: VALUES[m], l: VALUES[m], c: VALUES[m] }] }));

test('rowsFromTradingView assemble les huit séries par date d’arrêté', () => {
  const [row] = rowsFromTradingView('133741', series());
  assert.deepEqual(row, {
    asOf: '2026-09-22',
    openInterest: 22315,
    nonCommLong: 17658,
    nonCommShort: 14902,
    nonCommSpread: 3307,
    commLong: 66,
    commShort: 3175,
    nonReptLong: 1284,
    nonReptShort: 931,
  });
});

test('rowsFromTradingView refuse une série manquante ou un intervalle hebdomadaire', () => {
  assert.throws(() => rowsFromTradingView('133741', series('NCP_SPREAD')), /manquante/);
  const weekly = series().map((s) => ({ ...s, interval: '1W' }));
  assert.throws(() => rowsFromTradingView('133741', weekly), /1D/);
});
