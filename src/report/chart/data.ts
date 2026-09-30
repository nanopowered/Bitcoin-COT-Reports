// Données embarquées dans le graphique interactif. Types seulement : ce fichier est partagé entre le
// générateur (Node) et le script du navigateur, qui ne l'importe qu'en `import type`.

/**
 * [arrêté, OI, NC long, NC short, NC spread, C long, C short, NR long, NR short, publication].
 * Les positions sont les valeurs publiées ; la publication est null quand sa date est inconnue (shutdown).
 */
export type WeekTuple = [string, number, number, number, number, number, number, number, number, string | null];

/**
 * [prime des futures CME annualisée (calculée), taux du Trésor à 3 mois (source)], en % par an, à la date
 * d'arrêté de la semaine de même rang dans `weeks` ; null si la donnée manque.
 */
export type CarryTuple = [number | null, number | null];

export type RangeKey = 'all' | 'shortEra' | 'oscillation' | 'y2026' | 'mcclellan';

export interface RangePreset {
  key: RangeKey;
  /** Libellé court du bouton. */
  label: string;
  from: string;
  to: string;
}

export interface GuideItem {
  /** Période affichée par le bouton de l'encadré, ou null pour une remarque générale. */
  range: RangeKey | null;
  period: string;
  text: string;
}

export interface ChartEdition {
  /** Mardi d'arrêté commenté. */
  asOf: string;
  /** Vendredi de l'édition. */
  edition: string;
  lecture: string;
  sens: string;
}

export interface ChartData {
  code: string;
  cotSource: string;
  priceSource: string;
  lastAsOf: string;
  lastPublication: string | null;
  weeks: WeekTuple[];
  /** Une paire par semaine de `weeks`. */
  carry: CarryTuple[];
  carrySource: string;
  /** Date de la première clôture de `closes` ; les clôtures sont quotidiennes et consécutives. */
  priceStart: string;
  closes: number[];
  /** Dates d'arrêté des passages net short des non-commerciaux (calculés). */
  crossings: string[];
  editions: ChartEdition[];
  ranges: RangePreset[];
  guide: GuideItem[];
}
