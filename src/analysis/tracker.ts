// Suivi hebdomadaire : position nette des non-commerciaux (contrats et % de l'OI), variation
// hebdomadaire, rang percentile de cette variation dans son propre historique, et les deux événements
// que McClellan surveille : passage net short, variation extrême.
//
// Tout ce qui est calculé ici est préfixé « calc_ » dans le CSV de sortie.
// Les rangs percentiles n'utilisent que les semaines ANTÉRIEURES (fenêtre expansive) : pas de look-ahead.

import type { CotLegacyRow } from '../types.ts';
import { cmeExpiryBetween, publicationOf, type PublicationStatus } from '../calendar/cot-calendar.ts';
import { midRank } from '../util/stats.ts';

export interface TrackerOptions {
  /** Nombre minimal de variations passées avant de calculer un rang percentile (convention de l'outil). */
  minHistory: number;
  /**
   * Queue retenue pour signaler une variation « extrême » : rang ≤ tail ou ≥ 1 − tail.
   * Paramètre de l'outil, PAS un seuil de McClellan (il n'en publie aucun sur le bitcoin).
   */
  tail: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = { minHistory: 52, tail: 0.05 };

export interface TrackerRow extends CotLegacyRow {
  publication: string | null;
  publicationStatus: PublicationStatus;
  ncNet: number;
  ncNetPctOi: number;
  cNet: number;
  cNetPctOi: number;
  nrNet: number;
  nrNetPctOi: number;
  dOi: number | null;
  dNcLong: number | null;
  dNcShort: number | null;
  dNcNet: number | null;
  dNcNetPp: number | null;
  dCNet: number | null;
  dCNetPp: number | null;
  /** Rang percentile (0-1) de dNcNetPp parmi les variations antérieures. */
  pctlDNcNetPp: number | null;
  /** Rang percentile (0-1) de dNcNet (contrats) parmi les variations antérieures. */
  pctlDNcNet: number | null;
  /** Rang percentile (0-1) du niveau ncNetPctOi parmi les semaines antérieures. */
  pctlNcNetPctOi: number | null;
  /** Rang percentile (0-1) de dCNetPp (commerciaux) parmi les variations antérieures. */
  pctlDCNetPp: number | null;
  cmeExpiry: string | null;
  crossNetShort: boolean;
  crossNetLong: boolean;
  speedLow: boolean;
  speedHigh: boolean;
}

// Arrondi à 1e-9 : évite que le bruit flottant (0,3 − 0,2 = 0,0999…) casse des égalités dans les rangs.
const clean = (x: number) => Math.round(x * 1e9) / 1e9;
const pct = (x: number, oi: number) => (oi === 0 ? 0 : clean((x / oi) * 100));

export function buildTracker(rows: readonly CotLegacyRow[], opts: TrackerOptions = DEFAULT_TRACKER_OPTIONS): TrackerRow[] {
  const out: TrackerRow[] = [];
  const pastDNcNetPp: number[] = [];
  const pastDNcNet: number[] = [];
  const pastLevel: number[] = [];
  const pastDCNetPp: number[] = [];
  const rank = (hist: number[], x: number | null) => (x !== null && hist.length >= opts.minHistory ? midRank(hist, x) : null);

  rows.forEach((r, i) => {
    const pub = publicationOf(r.asOf);
    const ncNet = r.nonCommLong - r.nonCommShort;
    const cNet = r.commLong - r.commShort;
    const nrNet = r.nonReptLong - r.nonReptShort;
    const ncNetPctOi = pct(ncNet, r.openInterest);
    const cNetPctOi = pct(cNet, r.openInterest);
    const prev = out[i - 1];
    const dNcNet = prev ? ncNet - prev.ncNet : null;
    const dNcNetPp = prev ? clean(ncNetPctOi - prev.ncNetPctOi) : null;
    const dCNetPp = prev ? clean(cNetPctOi - prev.cNetPctOi) : null;

    const pctlDNcNetPp = rank(pastDNcNetPp, dNcNetPp);
    const row: TrackerRow = {
      ...r,
      publication: pub.date,
      publicationStatus: pub.status,
      ncNet,
      ncNetPctOi,
      cNet,
      cNetPctOi,
      nrNet,
      nrNetPctOi: pct(nrNet, r.openInterest),
      dOi: prev ? r.openInterest - prev.openInterest : null,
      dNcLong: prev ? r.nonCommLong - prev.nonCommLong : null,
      dNcShort: prev ? r.nonCommShort - prev.nonCommShort : null,
      dNcNet,
      dNcNetPp,
      dCNet: prev ? cNet - prev.cNet : null,
      dCNetPp,
      pctlDNcNetPp,
      pctlDNcNet: rank(pastDNcNet, dNcNet),
      pctlNcNetPctOi: rank(pastLevel, ncNetPctOi),
      pctlDCNetPp: rank(pastDCNetPp, dCNetPp),
      cmeExpiry: prev ? cmeExpiryBetween(prev.asOf, r.asOf) : null,
      crossNetShort: prev !== undefined && prev.ncNet >= 0 && ncNet < 0,
      crossNetLong: prev !== undefined && prev.ncNet < 0 && ncNet >= 0,
      speedLow: pctlDNcNetPp !== null && pctlDNcNetPp <= opts.tail,
      speedHigh: pctlDNcNetPp !== null && pctlDNcNetPp >= 1 - opts.tail,
    };
    out.push(row);
    // L'historique n'est alimenté qu'APRÈS le calcul des rangs de la semaine courante.
    pastLevel.push(ncNetPctOi);
    if (dNcNetPp !== null && dNcNet !== null && dCNetPp !== null) {
      pastDNcNetPp.push(dNcNetPp);
      pastDNcNet.push(dNcNet);
      pastDCNetPp.push(dCNetPp);
    }
  });
  return out;
}

/** En-têtes du CSV de suivi : colonnes CFTC d'abord, puis colonnes calculées préfixées « calc_ ». */
export const TRACKER_CSV_HEADER = [
  'as_of',
  'open_interest',
  'nc_long',
  'nc_short',
  'nc_spread',
  'c_long',
  'c_short',
  'nr_long',
  'nr_short',
  'calc_publication',
  'calc_publication_status',
  'calc_nc_net',
  'calc_nc_net_pct_oi',
  'calc_c_net',
  'calc_c_net_pct_oi',
  'calc_nr_net',
  'calc_nr_net_pct_oi',
  'calc_d_oi',
  'calc_d_nc_long',
  'calc_d_nc_short',
  'calc_d_nc_net',
  'calc_d_nc_net_pp',
  'calc_pctl_d_nc_net_pp',
  'calc_pctl_d_nc_net',
  'calc_pctl_nc_net_pct_oi',
  'calc_d_c_net',
  'calc_d_c_net_pp',
  'calc_pctl_d_c_net_pp',
  'calc_cme_expiry_in_week',
  'calc_flag_cross_net_short',
  'calc_flag_cross_net_long',
  'calc_flag_speed_low',
  'calc_flag_speed_high',
] as const;

const r2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
const r3 = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 1000);
const flag = (b: boolean) => (b ? 1 : 0);

export function trackerCsvRows(rows: readonly TrackerRow[]) {
  return rows.map((t) => [
    t.asOf,
    t.openInterest,
    t.nonCommLong,
    t.nonCommShort,
    t.nonCommSpread,
    t.commLong,
    t.commShort,
    t.nonReptLong,
    t.nonReptShort,
    t.publication,
    t.publicationStatus,
    t.ncNet,
    r2(t.ncNetPctOi),
    t.cNet,
    r2(t.cNetPctOi),
    t.nrNet,
    r2(t.nrNetPctOi),
    t.dOi,
    t.dNcLong,
    t.dNcShort,
    t.dNcNet,
    r2(t.dNcNetPp),
    r3(t.pctlDNcNetPp),
    r3(t.pctlDNcNet),
    r3(t.pctlNcNetPctOi),
    t.dCNet,
    r2(t.dCNetPp),
    r3(t.pctlDCNetPp),
    t.cmeExpiry,
    flag(t.crossNetShort),
    flag(t.crossNetLong),
    flag(t.speedLow),
    flag(t.speedHigh),
  ]);
}
