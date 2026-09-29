// Calendrier du COT : date de publication à partir de la date d'arrêté, publications retardées
// (shutdowns), échéances mensuelles des futures bitcoin du CME.

import { addDays, lastDayOfMonth, weekday } from '../util/dates.ts';

export type PublicationStatus = 'normale' | 'retard-connu' | 'retard-inconnu';

export interface Publication {
  /** Date de publication retenue (clôture UTC de ce jour = première entrée possible), ou null si inconnue. */
  date: string | null;
  status: PublicationStatus;
  note?: string;
}

/**
 * Publications décalées dont la date exacte est documentée par la CFTC.
 *  - 24/12/2018 : premier rapport du rattrapage après le shutdown de 2018-2019, publié le 01/02/2019
 *    (communiqué CFTC 7864-19).
 *  - 30/09/2025 : premier rapport du rattrapage après le shutdown de 2025, publié le mercredi 19/11/2025
 *    (communiqué CFTC 9138-25).
 */
export const KNOWN_DELAYED_PUBLICATIONS: Readonly<Record<string, string>> = {
  '2018-12-24': '2019-02-01',
  '2025-09-30': '2025-11-19',
};

/**
 * Fenêtres de dates d'arrêté publiées en rattrapage, sans date exacte vérifiée ici.
 *  - Shutdown 22/12/2018 → 25/01/2019 : rattrapage chronologique terminé le 08/03/2019.
 *  - Shutdown 01/10/2025 → 12/11/2025 : rattrapage du 19/11/2025, terminé le 29/12/2025.
 * Pour ces semaines, une entrée « au vendredi » serait fictive : le backtest les exclut.
 */
export const DELAYED_WINDOWS: readonly { from: string; to: string; note: string }[] = [
  { from: '2018-12-24', to: '2019-02-26', note: 'shutdown 2018-2019, rattrapage jusqu’au 08/03/2019' },
  { from: '2025-09-30', to: '2025-12-16', note: 'shutdown 2025, rattrapage du 19/11 au 29/12/2025' },
];

/** Vendredi de la semaine d'arrêté (mardi + 3 j ; lundi férié + 4 j). */
export function scheduledPublication(asOf: string): string {
  return addDays(asOf, (5 - weekday(asOf) + 7) % 7);
}

/**
 * Date de publication effective. Hors shutdown, la CFTC publie le vendredi à 15 h 30 (heure de New York),
 * soit avant la clôture quotidienne UTC du même vendredi : la clôture du vendredi est la première
 * clôture exploitable. Les semaines à jour férié peuvent décaler la publication d'un à trois jours ;
 * ce décalage n'est pas modélisé.
 */
export function publicationOf(asOf: string): Publication {
  const known = KNOWN_DELAYED_PUBLICATIONS[asOf];
  if (known) return { date: known, status: 'retard-connu', note: 'publication documentée par la CFTC' };
  const w = DELAYED_WINDOWS.find((x) => asOf >= x.from && asOf <= x.to);
  if (w) return { date: null, status: 'retard-inconnu', note: w.note };
  return { date: scheduledPublication(asOf), status: 'normale' };
}

/** Dernier vendredi du mois : échéance des futures bitcoin CME (BTC), hors ajustement jour férié. */
export function cmeBtcExpiry(year: number, month: number): string {
  let d = lastDayOfMonth(year, month);
  while (weekday(d) !== 5) d = addDays(d, -1);
  return d;
}

/**
 * Échéance CME tombant dans la semaine qui sépare deux dates d'arrêté : (prevAsOf, asOf].
 * Un jour férié CME avance l'échéance au jeudi, qui reste dans la même fenêtre.
 */
export function cmeExpiryBetween(prevAsOf: string, asOf: string): string | null {
  let [y, m] = prevAsOf.split('-').map(Number) as [number, number];
  const [y1, m1] = asOf.split('-').map(Number) as [number, number];
  while (y < y1 || (y === y1 && m <= m1)) {
    const e = cmeBtcExpiry(y, m);
    if (e > prevAsOf && e <= asOf) return e;
    if (m === 12) {
      y++;
      m = 1;
    } else {
      m++;
    }
  }
  return null;
}
