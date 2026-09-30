// Séries de marché TradingView (get_ohlcv, intervalle 1D) : à quelle séance appartient chaque barre ?
//
// Futures CME : jusqu'au 28/05/2026, TradingView horodate la barre à l'ouverture Globex, la veille au soir
// (22:00 ou 23:00 UTC, du dimanche au jeudi) ; depuis le 29/05/2026, à la clôture de la séance précédente
// (21:00 UTC, du lundi au vendredi). Dans les deux cas, la séance est le jour ouvré suivant : une barre
// horodatée vendredi 21:00 UTC est celle du lundi (vérifié contre le spot Binance, écart médian 0,4 %).
// Rendements TVC : barre horodatée à minuit en Europe (23:00 ou 00:00 UTC), séance du jour même.
// Règle commune : premier jour ouvré (lundi-vendredi) à partir de la date UTC de t + 6 h.
// Limite : une séance qui suit un jour férié peut être datée du jour férié. Sans effet sur une médiane
// hebdomadaire, qui prend les séances jusqu'au mardi inclus.

import type { TvSeries } from '../cot/tradingview.ts';
import { addDays, fromUnixSeconds, weekday } from '../util/dates.ts';

const SIX_HOURS = 6 * 3600;

/** Date de séance (AAAA-MM-JJ) d'une barre quotidienne TradingView de futures CME ou de rendement TVC. */
export function sessionDate(t: number): string {
  let d = fromUnixSeconds(t + SIX_HOURS);
  while (weekday(d) === 0 || weekday(d) === 6) d = addDays(d, 1);
  return d;
}

/**
 * Clôtures par date de séance. Écarte les séances à partir de `cutoff` (celle qui était en cours au moment
 * de la récupération) et refuse deux barres pour une même séance.
 */
export function closesBySession(s: TvSeries, cutoff: string): Map<string, number> {
  if (s.interval !== '1D') throw new Error(`${s.symbol} : intervalle ${s.interval}, attendu 1D`);
  const out = new Map<string, number>();
  for (const b of s.bars) {
    const d = sessionDate(b.t);
    if (d >= cutoff) continue;
    if (out.has(d)) throw new Error(`${s.symbol} : deux barres pour la séance du ${d}`);
    if (!Number.isFinite(b.c)) throw new Error(`${s.symbol} : clôture invalide pour la séance du ${d}`);
    out.set(d, b.c);
  }
  return out;
}
