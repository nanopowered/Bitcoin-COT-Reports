import type { CotLegacyRow, PriceBar } from '../src/types.ts';
import { addDays } from '../src/util/dates.ts';

/**
 * Semaines synthétiques cohérentes (les deux identités CFTC tiennent) à partir d'une suite de nets NC.
 * Pas de commerciaux ; les non-déclarants portent la contrepartie.
 */
export function syntheticCot(nets: readonly number[], start = '2022-01-04', oi = 1000): CotLegacyRow[] {
  return nets.map((net, i) => {
    const ncLong = 400 + Math.max(net, 0);
    const ncShort = 400 + Math.max(-net, 0);
    const spread = 100;
    return {
      asOf: addDays(start, 7 * i),
      openInterest: oi,
      nonCommLong: ncLong,
      nonCommShort: ncShort,
      nonCommSpread: spread,
      commLong: 0,
      commShort: 0,
      nonReptLong: oi - ncLong - spread,
      nonReptShort: oi - ncShort - spread,
    };
  });
}

/** Prix quotidiens synthétiques : `f(k)` = clôture du k-ième jour à partir de `start`. */
export function syntheticPrices(days: number, f: (k: number) => number, start = '2022-01-01'): PriceBar[] {
  return Array.from({ length: days }, (_, k) => {
    const c = f(k);
    return { date: addDays(start, k), open: c, high: c, low: c, close: c };
  });
}
