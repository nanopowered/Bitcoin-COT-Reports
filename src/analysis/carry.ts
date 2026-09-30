// Prime des futures bitcoin CME (calculée) et comparaison au taux sans risque.
//
// Prime annualisée d'un jour = (F2 / F1 − 1) × 365 / (jours entre les deux échéances) × 100, avec F1 et F2 les
// clôtures du même jour des deux premiers contrats. C'est le portage qu'encaisse, d'une échéance à la suivante,
// un vendeur de futures couvert au comptant : la rémunération brute d'un arbitrage cash-and-carry. Deux
// contrats du même marché clôturés au même instant évitent le décalage horaire entre la clôture CME (après-midi
// à Chicago) et une clôture au comptant à minuit UTC.
//
// Semaine : médiane des 5 dernières séances jusqu'au mardi d'arrêté inclus (jamais de séance postérieure).
// Excès = prime − taux du Trésor à 3 mois, l'horizon de l'arbitrage ; le 10 ans est gardé pour comparaison.

import { cmeBtcExpiry } from '../calendar/cot-calendar.ts';
import type { FuturesDay } from '../market/futures.ts';
import type { RateDay } from '../market/rates.ts';
import { addDays, daysBetween } from '../util/dates.ts';
import { median } from '../util/stats.ts';

export interface CarryOptions {
  /** Séances prises dans la médiane hebdomadaire. */
  sessions: number;
  /** Minimum de séances pour publier une valeur. */
  minSessions: number;
  /** Ancienneté maximale d'une séance ou d'un taux, en jours avant l'arrêté. */
  maxStaleDays: number;
}

export const DEFAULT_CARRY_OPTIONS: CarryOptions = { sessions: 5, minSessions: 3, maxStaleDays: 9 };

/** Échéances des deux premiers contrats à une date de séance : dernier vendredi du mois (échéance du jour incluse). */
export function contractExpiries(date: string): { e1: string; e2: string } {
  let [y, m] = date.split('-').map(Number) as [number, number];
  const next = () => {
    if (m === 12) {
      y++;
      m = 1;
    } else {
      m++;
    }
  };
  let e1 = cmeBtcExpiry(y, m);
  if (e1 < date) {
    next();
    e1 = cmeBtcExpiry(y, m);
  }
  next();
  return { e1, e2: cmeBtcExpiry(y, m) };
}

/** Prime annualisée d'une séance, en % par an (calculée). */
export function annualizedCarry(day: FuturesDay): number {
  const { e1, e2 } = contractExpiries(day.date);
  return (day.f2 / day.f1 - 1) * (365 / daysBetween(e1, e2)) * 100;
}

export interface WeeklyCarry {
  asOf: string;
  /** Médiane des primes annualisées des dernières séances, % par an ; null si trop peu de séances récentes. */
  carry: number | null;
  sessions: number;
  us03m: number | null;
  us10y: number | null;
  /** Prime − taux à 3 mois, en points. */
  excess3m: number | null;
  /** Prime − taux à 10 ans, en points. */
  excess10y: number | null;
}

/** Index de la dernière entrée datée au plus tard `date` (tableau trié), −1 sinon. */
function lastAtOrBefore<T extends { date: string }>(xs: readonly T[], date: string): number {
  let lo = 0;
  let hi = xs.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((xs[mid] as T).date <= date) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

function rateAt(rates: readonly RateDay[], asOf: string, key: 'us03m' | 'us10y', oldest: string): number | null {
  for (let i = lastAtOrBefore(rates, asOf); i >= 0; i--) {
    const r = rates[i] as RateDay;
    if (r.date < oldest) return null;
    if (r[key] !== null) return r[key];
  }
  return null;
}

/** Prime et taux à chaque date d'arrêté, à partir des seules données disponibles ce jour-là. */
export function weeklyCarry(
  asOfs: readonly string[],
  futures: readonly FuturesDay[],
  rates: readonly RateDay[],
  opts: CarryOptions = DEFAULT_CARRY_OPTIONS,
): WeeklyCarry[] {
  return asOfs.map((asOf) => {
    const oldest = addDays(asOf, -opts.maxStaleDays);
    const end = lastAtOrBefore(futures, asOf);
    const window = futures.slice(Math.max(0, end - opts.sessions + 1), end + 1).filter((d) => d.date >= oldest);
    const carry = window.length >= opts.minSessions ? median(window.map(annualizedCarry)) : null;
    const us03m = rateAt(rates, asOf, 'us03m', oldest);
    const us10y = rateAt(rates, asOf, 'us10y', oldest);
    return {
      asOf,
      carry,
      sessions: window.length,
      us03m,
      us10y,
      excess3m: carry !== null && us03m !== null ? carry - us03m : null,
      excess10y: carry !== null && us10y !== null ? carry - us10y : null,
    };
  });
}
