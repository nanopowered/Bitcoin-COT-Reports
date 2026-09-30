import { readFileSync, writeFileSync } from 'node:fs';
import type { CotLegacyRow } from '../types.ts';
import { parseCsvRecords, toCsv } from '../util/csv.ts';
import { assertISODate, daysBetween } from '../util/dates.ts';

/** Colonnes du fichier normalisé `data/cot_legacy_<code>.csv` — uniquement des valeurs publiées par la CFTC. */
export const COT_CSV_HEADER = [
  'as_of',
  'open_interest',
  'nc_long',
  'nc_short',
  'nc_spread',
  'c_long',
  'c_short',
  'nr_long',
  'nr_short',
] as const;

export function readCotCsv(path: string): CotLegacyRow[] {
  const recs = parseCsvRecords(readFileSync(path, 'utf8'));
  const num = (rec: Record<string, string>, k: string) => {
    const v = Number(rec[k]);
    if (!Number.isFinite(v)) throw new Error(`${path} : valeur non numérique pour ${k} (${rec['as_of']})`);
    return v;
  };
  const rows = recs.map((r) => ({
    asOf: assertISODate(r['as_of'] ?? ''),
    openInterest: num(r, 'open_interest'),
    nonCommLong: num(r, 'nc_long'),
    nonCommShort: num(r, 'nc_short'),
    nonCommSpread: num(r, 'nc_spread'),
    commLong: num(r, 'c_long'),
    commShort: num(r, 'c_short'),
    nonReptLong: num(r, 'nr_long'),
    nonReptShort: num(r, 'nr_short'),
  }));
  return sortAndDedupe(rows);
}

export function writeCotCsv(path: string, rows: readonly CotLegacyRow[]): void {
  writeFileSync(
    path,
    toCsv(
      COT_CSV_HEADER,
      rows.map((r) => [
        r.asOf,
        r.openInterest,
        r.nonCommLong,
        r.nonCommShort,
        r.nonCommSpread,
        r.commLong,
        r.commShort,
        r.nonReptLong,
        r.nonReptShort,
      ]),
    ),
  );
}

export function sortAndDedupe(rows: readonly CotLegacyRow[]): CotLegacyRow[] {
  const byDate = new Map<string, CotLegacyRow>();
  for (const r of rows) {
    const prev = byDate.get(r.asOf);
    if (prev && JSON.stringify(prev) !== JSON.stringify(r)) {
      throw new Error(`Deux lignes différentes pour la même date d'arrêté ${r.asOf}`);
    }
    byDate.set(r.asOf, r);
  }
  return [...byDate.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
}

export interface IntegrityIssue {
  asOf: string;
  kind: 'identite-long' | 'identite-short' | 'ecart-dates';
  detail: string;
}

/**
 * Contrôles d'intégrité du rapport Legacy :
 *  - côté long  : OI = NC long + NC spread + C long + NR long
 *  - côté short : OI = NC short + NC spread + C short + NR short
 *  - écart entre deux dates d'arrêté consécutives compris entre 6 et 8 jours (lundi férié toléré).
 * Les deux identités impliquent que les trois positions nettes se somment à zéro.
 */
export function checkIntegrity(rows: readonly CotLegacyRow[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  rows.forEach((r, i) => {
    const longSide = r.nonCommLong + r.nonCommSpread + r.commLong + r.nonReptLong;
    const shortSide = r.nonCommShort + r.nonCommSpread + r.commShort + r.nonReptShort;
    if (longSide !== r.openInterest) {
      issues.push({ asOf: r.asOf, kind: 'identite-long', detail: `OI ${r.openInterest} ≠ somme des longs ${longSide}` });
    }
    if (shortSide !== r.openInterest) {
      issues.push({ asOf: r.asOf, kind: 'identite-short', detail: `OI ${r.openInterest} ≠ somme des shorts ${shortSide}` });
    }
    const prev = rows[i - 1];
    if (prev) {
      const gap = daysBetween(prev.asOf, r.asOf);
      if (gap < 6 || gap > 8) {
        issues.push({ asOf: r.asOf, kind: 'ecart-dates', detail: `${gap} jours depuis ${prev.asOf}` });
      }
    }
  });
  return issues;
}
