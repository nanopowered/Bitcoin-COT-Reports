/**
 * Une semaine du rapport CFTC « Legacy — Futures Only » pour un contrat.
 * Tous les champs sont publiés tels quels par la CFTC (rien n'est calculé ici).
 */
export interface CotLegacyRow {
  /** Date d'arrêté des positions (« as of »), AAAA-MM-JJ. Normalement un mardi. */
  asOf: string;
  openInterest: number;
  nonCommLong: number;
  nonCommShort: number;
  nonCommSpread: number;
  commLong: number;
  commShort: number;
  nonReptLong: number;
  nonReptShort: number;
}

/** Clôture quotidienne (UTC) d'une paire BTC. */
export interface PriceBar {
  /** AAAA-MM-JJ, jour UTC de la bougie. */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Métadonnées de provenance écrites à côté de chaque fichier de données. */
export interface SourceMeta {
  source: string;
  url?: string;
  retrievedAt: string;
  rows: number;
  first: string;
  last: string;
  notes?: string[];
}
