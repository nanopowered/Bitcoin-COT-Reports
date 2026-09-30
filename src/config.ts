import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { CotLegacyRow } from './types.ts';
import { checkIntegrity, readCotCsv } from './cot/legacy.ts';
import { readTffCsv, type TffRow } from './cot/tff.ts';
import { readFuturesCsv, type FuturesDay } from './market/futures.ts';
import { readRatesCsv, type RateDay } from './market/rates.ts';
import { indexPrices, readPriceCsv, type PriceIndex } from './price/prices.ts';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DATA_DIR = join(ROOT, 'data');
export const OUTPUT_DIR = join(ROOT, 'output');

export const cotCsvPath = (code: string) => join(DATA_DIR, `cot_legacy_${code}.csv`);
export const cotMetaPath = (code: string) => join(DATA_DIR, `cot_legacy_${code}.meta.json`);
export const tffCsvPath = (code: string) => join(DATA_DIR, `cot_tff_${code}.csv`);
export const tffMetaPath = (code: string) => join(DATA_DIR, `cot_tff_${code}.meta.json`);
export const PRICE_CSV = join(DATA_DIR, 'btc_usdt_daily.csv');
export const PRICE_META = join(DATA_DIR, 'btc_usdt_daily.meta.json');
export const FUTURES_CSV = join(DATA_DIR, 'cme_btc_futures_daily.csv');
export const FUTURES_META = join(DATA_DIR, 'cme_btc_futures_daily.meta.json');
export const RATES_CSV = join(DATA_DIR, 'us_rates_daily.csv');
export const RATES_META = join(DATA_DIR, 'us_rates_daily.meta.json');

export interface Dataset {
  code: string;
  cot: CotLegacyRow[];
  px: PriceIndex;
  cotSource: string;
  priceSource: string;
}

function sourceOf(metaPath: string): string {
  try {
    return (JSON.parse(readFileSync(metaPath, 'utf8')) as { source: string }).source;
  } catch {
    return 'inconnue (pas de fichier .meta.json)';
  }
}

/** Charge COT + prix et refuse de continuer si une identité CFTC est violée. */
export function loadDataset(code = '133741'): Dataset {
  const cot = readCotCsv(cotCsvPath(code));
  const issues = checkIntegrity(cot).filter((x) => x.kind !== 'ecart-dates');
  if (issues.length > 0) {
    throw new Error(`Identités CFTC violées :\n${issues.map((x) => `  ${x.asOf} ${x.kind} : ${x.detail}`).join('\n')}`);
  }
  return {
    code,
    cot,
    px: indexPrices(readPriceCsv(PRICE_CSV)),
    cotSource: sourceOf(cotMetaPath(code)),
    priceSource: sourceOf(PRICE_META),
  };
}

export interface TffData {
  rows: TffRow[];
  source: string;
}

/**
 * Positions courtes des Leveraged Funds (TFF), une par semaine du rapport Legacy. Refuse une date d'arrêté
 * absente de l'un des deux rapports, ou une position supérieure à l'intérêt ouvert.
 */
export function loadTff(ds: Dataset): TffData {
  const rows = readTffCsv(tffCsvPath(ds.code));
  const byDate = new Map(rows.map((r) => [r.asOf, r]));
  const problems: string[] = [];
  for (const c of ds.cot) {
    const r = byDate.get(c.asOf);
    if (!r) problems.push(`${c.asOf} : absent du TFF`);
    else if (r.levMoneyShort > c.openInterest) problems.push(`${c.asOf} : shorts LF ${r.levMoneyShort} > OI ${c.openInterest}`);
  }
  if (rows.length !== ds.cot.length) problems.push(`${rows.length} semaines TFF pour ${ds.cot.length} semaines Legacy`);
  if (problems.length > 0) throw new Error(`TFF incohérent avec le Legacy :\n  ${problems.slice(0, 10).join('\n  ')}`);
  return { rows: ds.cot.map((c) => byDate.get(c.asOf) as TffRow), source: sourceOf(tffMetaPath(ds.code)) };
}

/** Futures CME (deux premiers contrats) et taux du Trésor américain : entrées du calcul de la prime. */
export interface MarketData {
  futures: FuturesDay[];
  rates: RateDay[];
  futuresSource: string;
  ratesSource: string;
}

export function loadMarket(): MarketData {
  return {
    futures: readFuturesCsv(FUTURES_CSV),
    rates: readRatesCsv(RATES_CSV),
    futuresSource: sourceOf(FUTURES_META),
    ratesSource: sourceOf(RATES_META),
  };
}
