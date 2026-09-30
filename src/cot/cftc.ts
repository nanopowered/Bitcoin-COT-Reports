// Téléchargement du rapport CFTC « Legacy — Futures Only » via l'API Socrata de publicreporting.cftc.gov
// (jeu de données 6dca-aqww), et lecture des trois formats rencontrés en pratique :
//   1. JSON de l'API Socrata (clés en minuscules : noncomm_positions_long_all, …)
//   2. CSV exporté depuis le site (en-têtes NonComm_Positions_Long_All, …)
//   3. fichiers historiques annual.txt des archives deacotAAAA.zip (« Noncommercial Positions-Long (All) », …)
// La colonne spread s'écrit « Postions » (sic) dans le jeu Socrata : les deux orthographes sont acceptées.

import type { CotLegacyRow } from '../types.ts';
import { parseCsvRecords } from '../util/csv.ts';
import { assertISODate } from '../util/dates.ts';
import { sortAndDedupe } from './legacy.ts';

export const SOCRATA_BASE = 'https://publicreporting.cftc.gov/resource';
export const LEGACY_FUTURES_ONLY_DATASET = '6dca-aqww';

/** Codes CFTC utiles. McClellan suit le contrat standard (133741), pas le Micro. */
export const CFTC_CODES = {
  BITCOIN_CME: '133741',
  MICRO_BITCOIN_CME: '133742',
} as const;

type Field = keyof CotLegacyRow | 'code';

const FIELD_ALIASES: Record<Field, readonly string[]> = {
  asOf: ['reportdateasyyyymmdd', 'asofdateinformyyyymmdd'],
  code: ['cftccontractmarketcode'],
  openInterest: ['openinterestall'],
  nonCommLong: ['noncommpositionslongall', 'noncommercialpositionslongall'],
  nonCommShort: ['noncommpositionsshortall', 'noncommercialpositionsshortall'],
  nonCommSpread: ['noncommpostionsspreadall', 'noncommpositionsspreadall', 'noncommercialpositionsspreadingall'],
  commLong: ['commpositionslongall', 'commercialpositionslongall'],
  commShort: ['commpositionsshortall', 'commercialpositionsshortall'],
  nonReptLong: ['nonreptpositionslongall', 'nonreportablepositionslongall'],
  nonReptShort: ['nonreptpositionsshortall', 'nonreportablepositionsshortall'],
};

const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

function resolveKeys(sample: Record<string, unknown>): Record<Field, string | undefined> {
  const byNorm = new Map(Object.keys(sample).map((k) => [normalizeKey(k), k]));
  const out = {} as Record<Field, string | undefined>;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [Field, readonly string[]][]) {
    out[field] = aliases.map((a) => byNorm.get(a)).find((k) => k !== undefined);
  }
  return out;
}

/** « 2026-09-22T00:00:00.000 », « 2026-09-22 » ou « 09/22/2026 12:00:00 AM » (export `format=true`) → AAAA-MM-JJ. */
export function normalizeCftcDate(raw: string): string {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return assertISODate(`${iso[1]}-${iso[2]}-${iso[3]}`);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (us) return assertISODate(`${us[3]}-${(us[1] as string).padStart(2, '0')}-${(us[2] as string).padStart(2, '0')}`);
  throw new Error(`Date CFTC non reconnue : « ${raw} »`);
}

function toNumber(v: unknown, what: string): number {
  const n = Number(String(v ?? '').replace(/[,\s]/g, ''));
  if (String(v ?? '').trim() === '' || !Number.isFinite(n)) throw new Error(`Valeur non numérique pour ${what} : « ${String(v)} »`);
  return n;
}

/**
 * Convertit des enregistrements CFTC (n'importe lequel des trois formats) en lignes Legacy.
 * Si une colonne de code contrat existe, seules les lignes de `code` sont gardées.
 */
export function parseCftcRecords(records: readonly Record<string, unknown>[], code: string): CotLegacyRow[] {
  const first = records[0];
  if (!first) return [];
  const keys = resolveKeys(first);
  const missing = (Object.keys(FIELD_ALIASES) as Field[]).filter((f) => f !== 'code' && keys[f] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Colonnes CFTC introuvables : ${missing.join(', ')}.\nColonnes reçues : ${Object.keys(first).join(', ')}`,
    );
  }
  const k = keys as Record<Field, string>;
  const rows: CotLegacyRow[] = [];
  for (const rec of records) {
    if (keys.code !== undefined && String(rec[k.code] ?? '').trim() !== code) continue;
    const asOf = normalizeCftcDate(String(rec[k.asOf] ?? ''));
    const num = (f: Field) => toNumber(rec[k[f]], `${String(f)} au ${asOf}`);
    rows.push({
      asOf,
      openInterest: num('openInterest'),
      nonCommLong: num('nonCommLong'),
      nonCommShort: num('nonCommShort'),
      nonCommSpread: num('nonCommSpread'),
      commLong: num('commLong'),
      commShort: num('commShort'),
      nonReptLong: num('nonReptLong'),
      nonReptShort: num('nonReptShort'),
    });
  }
  return sortAndDedupe(rows);
}

/** Lit un CSV exporté depuis publicreporting.cftc.gov ou un annual.txt des archives historiques. */
export function parseCftcCsv(text: string, code: string): CotLegacyRow[] {
  return parseCftcRecords(parseCsvRecords(text), code);
}

export function socrataUrl(code: string, offset: number, limit: number): string {
  const params = new URLSearchParams({
    $where: `cftc_contract_market_code='${code}'`,
    $order: 'report_date_as_yyyy_mm_dd ASC',
    $limit: String(limit),
    $offset: String(offset),
  });
  return `${SOCRATA_BASE}/${LEGACY_FUTURES_ONLY_DATASET}.json?${params.toString()}`;
}

/** Télécharge tout l'historique Legacy Futures Only d'un contrat (pagination Socrata). */
export async function fetchLegacyFuturesOnly(code: string, fetchImpl: typeof fetch = fetch): Promise<CotLegacyRow[]> {
  const limit = 5000;
  const all: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += limit) {
    const url = socrataUrl(code, offset, limit);
    const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`CFTC ${res.status} ${res.statusText} pour ${url}`);
    const page = (await res.json()) as Record<string, unknown>[];
    all.push(...page);
    if (page.length < limit) break;
  }
  if (all.length === 0) throw new Error(`Aucune ligne CFTC pour le code ${code}`);
  return parseCftcRecords(all, code);
}
