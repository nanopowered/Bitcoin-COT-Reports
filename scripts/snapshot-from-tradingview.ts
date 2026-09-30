// Reconstruit les fichiers de données versionnés à partir des réponses brutes de TradingView
// (outil get_ohlcv du serveur MCP tvremix) conservées telles quelles dans data/raw/tradingview/.
//
// Pourquoi TradingView et pas la CFTC ? Lors de la première analyse (29/09/2026), l'environnement
// d'exécution n'avait pas accès à cftc.gov. Les séries COT de TradingView reprennent le rapport CFTC
// Legacy Futures Only ; les deux identités CFTC (somme des longs = somme des shorts = OI) sont
// vérifiées sur chaque semaine. `npm run fetch` remplace ce snapshot par la source officielle.
//
// Usage : node scripts/snapshot-from-tradingview.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkIntegrity, writeCotCsv } from '../src/cot/legacy.ts';
import { tffFromTradingView, tffSymbol, writeTffCsv } from '../src/cot/tff.ts';
import { rowsFromTradingView, TV_LEGACY_METRICS, tvSymbol, type TvMetric, type TvSeries } from '../src/cot/tradingview.ts';
import {
  cotCsvPath,
  cotMetaPath,
  DATA_DIR,
  FUTURES_CSV,
  FUTURES_META,
  PRICE_CSV,
  PRICE_META,
  RATES_CSV,
  RATES_META,
  tffCsvPath,
  tffMetaPath,
} from '../src/config.ts';
import { writeFuturesCsv, type FuturesDay } from '../src/market/futures.ts';
import { writeRatesCsv, type RateDay } from '../src/market/rates.ts';
import { closesBySession } from '../src/market/tradingview.ts';
import { writePriceCsv } from '../src/price/prices.ts';
import type { PriceBar, SourceMeta } from '../src/types.ts';
import { fromUnixSeconds, weekday } from '../src/util/dates.ts';

const CODE = '133741';
const RAW = join(DATA_DIR, 'raw', 'tradingview');
/** Heure de récupération des réponses brutes (UTC) : la bougie BTC de ce jour-là était incomplète. */
const RETRIEVED_AT = '2026-09-29T20:51:13Z';

const readRaw = (file: string) => JSON.parse(readFileSync(join(RAW, file), 'utf8')) as TvSeries & { success: boolean };

// --- COT ---
const series = (Object.keys(TV_LEGACY_METRICS) as TvMetric[]).map((m) => readRaw(`${tvSymbol(CODE, m).replace(':', '_')}_1D.json`));
const cot = rowsFromTradingView(CODE, series);
const issues = checkIntegrity(cot);
if (issues.length > 0) throw new Error(`Contrôles d'intégrité en échec : ${JSON.stringify(issues, null, 2)}`);
writeCotCsv(cotCsvPath(CODE), cot);
const cotMeta: SourceMeta = {
  source: 'TradingView (séries COT CFTC Legacy Futures Only) via tvremix get_ohlcv, intervalle 1D',
  retrievedAt: RETRIEVED_AT,
  rows: cot.length,
  first: cot[0]?.asOf ?? '',
  last: cot[cot.length - 1]?.asOf ?? '',
  notes: [
    `Symboles : ${series.map((s) => s.symbol).join(', ')}`,
    'Barres horodatées à la date d’arrêté (mardi, ou lundi en semaine fériée), 00:00 UTC.',
    `Identités CFTC vérifiées sur ${cot.length} semaines. Dates d’arrêté un lundi (mardi férié) : ${cot
      .filter((r) => weekday(r.asOf) === 1)
      .map((r) => r.asOf)
      .join(', ')}.`,
    'Réponses brutes : data/raw/tradingview/. Source officielle : npm run fetch (API CFTC 6dca-aqww).',
  ],
};
writeFileSync(cotMetaPath(CODE), JSON.stringify(cotMeta, null, 2) + '\n');
console.log(`COT ${CODE} : ${cot.length} semaines, ${cotMeta.first} → ${cotMeta.last}`);

// --- Prix ---
const btc = readRaw('BINANCE_BTCUSDT_1D.json');
const cutoff = RETRIEVED_AT.slice(0, 10);
const bars: PriceBar[] = btc.bars
  .map((b) => ({ date: fromUnixSeconds(b.t), open: b.o, high: b.h, low: b.l, close: b.c }))
  .filter((b) => b.date < cutoff);
writePriceCsv(PRICE_CSV, bars);
const priceMeta: SourceMeta = {
  source: 'TradingView BINANCE:BTCUSDT 1D via tvremix get_ohlcv',
  retrievedAt: RETRIEVED_AT,
  rows: bars.length,
  first: bars[0]?.date ?? '',
  last: bars[bars.length - 1]?.date ?? '',
  notes: [
    'Bougie du jour J = 00:00 → 24:00 UTC ; clôture = prix à minuit UTC.',
    `Bougie du ${cutoff} (incomplète au moment de la récupération) écartée.`,
  ],
};
writeFileSync(PRICE_META, JSON.stringify(priceMeta, null, 2) + '\n');
console.log(`BTC : ${bars.length} jours, ${priceMeta.first} → ${priceMeta.last}`);

// --- Futures CME (deux premiers contrats) et taux du Trésor américain ---
// Récupérés le 30/09/2026 (heures UTC ci-dessous) : la séance du 30/09 était en cours, elle est écartée.
const MARKET_CUTOFF = '2026-09-30';
const MARKET_RAW = {
  f1: { file: 'CME_BTC1_1D.json', retrievedAt: '2026-09-30T09:42:22Z' },
  f2: { file: 'CME_BTC2_1D.json', retrievedAt: '2026-09-30T09:44:49Z' },
  us03m: { file: 'TVC_US03MY_1D.json', retrievedAt: '2026-09-30T10:20:35Z' },
  us10y: { file: 'TVC_US10Y_1D.json', retrievedAt: '2026-09-30T10:20:37Z' },
} as const;
const market = Object.fromEntries(
  Object.entries(MARKET_RAW).map(([k, { file }]) => {
    const s = readRaw(file);
    return [k, { symbol: s.symbol, closes: closesBySession(s, MARKET_CUTOFF) }];
  }),
) as Record<keyof typeof MARKET_RAW, { symbol: string; closes: Map<string, number> }>;

const futures: FuturesDay[] = [...market.f1.closes]
  .filter(([d]) => market.f2.closes.has(d))
  .map(([date, f1]) => ({ date, f1, f2: market.f2.closes.get(date) as number }))
  .sort((a, b) => a.date.localeCompare(b.date));
const onlyOne = [...market.f1.closes.keys(), ...market.f2.closes.keys()].filter((d) => !(market.f1.closes.has(d) && market.f2.closes.has(d)));
writeFuturesCsv(FUTURES_CSV, futures);
const futuresMeta: SourceMeta = {
  source: `TradingView ${market.f1.symbol} et ${market.f2.symbol} (contrats continus, 1D) via tvremix get_ohlcv`,
  retrievedAt: MARKET_RAW.f2.retrievedAt,
  rows: futures.length,
  first: futures[0]?.date ?? '',
  last: futures[futures.length - 1]?.date ?? '',
  notes: [
    'f1 = contrat le plus proche de l’échéance, f2 = contrat suivant ; clôture quotidienne telle que publiée par TradingView (la source ne précise pas si c’est le cours de règlement).',
    'Date = séance CME, déduite de l’horodatage TradingView (voir src/market/tradingview.ts : l’horodatage a changé le 29/05/2026).',
    `Séances du ${MARKET_CUTOFF} et après écartées (en cours à la récupération). Séances présentes dans une seule des deux séries, écartées : ${onlyOne.length ? [...new Set(onlyOne)].sort().join(', ') : 'aucune'}.`,
    'Aucune source officielle gratuite des règlements CME historiques : ce fichier ne se reconstruit qu’à partir de data/raw/tradingview/.',
  ],
};
writeFileSync(FUTURES_META, JSON.stringify(futuresMeta, null, 2) + '\n');
console.log(`Futures CME : ${futures.length} séances, ${futuresMeta.first} → ${futuresMeta.last}`);

const rateDates = [...new Set([...market.us03m.closes.keys(), ...market.us10y.closes.keys()])].sort();
const rates: RateDay[] = rateDates.map((date) => ({
  date,
  us03m: market.us03m.closes.get(date) ?? null,
  us10y: market.us10y.closes.get(date) ?? null,
}));
writeRatesCsv(RATES_CSV, rates);
const ratesMeta: SourceMeta = {
  source: `TradingView ${market.us03m.symbol} et ${market.us10y.symbol} (1D) via tvremix get_ohlcv`,
  retrievedAt: MARKET_RAW.us10y.retrievedAt,
  rows: rates.length,
  first: rates[0]?.date ?? '',
  last: rates[rates.length - 1]?.date ?? '',
  notes: [
    'Rendements en % par an : bon du Trésor à 3 mois (us03m) et obligation à 10 ans (us10y). Cellule vide : pas de cotation ce jour-là pour ce taux.',
    `Séances du ${MARKET_CUTOFF} et après écartées (en cours à la récupération).`,
    'Source officielle équivalente : FRED, séries DGS3MO et DGS10 (non branchée dans npm run fetch).',
  ],
};
writeFileSync(RATES_META, JSON.stringify(ratesMeta, null, 2) + '\n');
console.log(`Taux US : ${rates.length} séances, ${ratesMeta.first} → ${ratesMeta.last}`);

// --- TFF : positions courtes des Leveraged Funds (hedge funds) ---
// Récupérées le 30/09/2026 ; mêmes dates d'arrêté que le rapport Legacy.
const tffRaw = readRaw(`${tffSymbol(CODE, 'LMP_S').replace(':', '_')}_1D.json`);
const tff = tffFromTradingView(tffRaw);
const legacyDates = new Set(cot.map((r) => r.asOf));
const tffOnly = tff.filter((r) => !legacyDates.has(r.asOf)).map((r) => r.asOf);
const legacyOnly = cot.filter((r) => !tff.some((x) => x.asOf === r.asOf)).map((r) => r.asOf);
if (tffOnly.length || legacyOnly.length) throw new Error(`Dates TFF et Legacy différentes : ${[...tffOnly, ...legacyOnly].join(', ')}`);
writeTffCsv(tffCsvPath(CODE), tff);
const tffMeta: SourceMeta = {
  source: `TradingView ${tffRaw.symbol} (CFTC Traders in Financial Futures, futures seuls) via tvremix get_ohlcv, intervalle 1D`,
  retrievedAt: '2026-09-30T11:15:15Z',
  rows: tff.length,
  first: tff[0]?.asOf ?? '',
  last: tff[tff.length - 1]?.asOf ?? '',
  notes: [
    'lev_money_short = positions courtes des « Leveraged Funds » (hedge funds, CTA), en contrats, valeur publiée.',
    `Mêmes ${tff.length} dates d’arrêté que le rapport Legacy (vérifié).`,
    'Les catégories TFF ne recoupent pas celles du Legacy : une partie des dealers, classés à part dans le TFF, est non commerciale dans le Legacy.',
  ],
};
writeFileSync(tffMetaPath(CODE), JSON.stringify(tffMeta, null, 2) + '\n');
console.log(`TFF ${CODE} (shorts Leveraged Funds) : ${tff.length} semaines, ${tffMeta.first} → ${tffMeta.last}`);
