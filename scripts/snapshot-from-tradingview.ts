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
import { rowsFromTradingView, TV_LEGACY_METRICS, tvSymbol, type TvMetric, type TvSeries } from '../src/cot/tradingview.ts';
import { cotCsvPath, cotMetaPath, DATA_DIR, PRICE_CSV, PRICE_META } from '../src/config.ts';
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
