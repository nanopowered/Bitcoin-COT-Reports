// npm run fetch [-- --code 133741 --from 2018-01-01 --skip-cot --skip-price --cot-csv <fichier>]
//
// Télécharge la source officielle :
//   - COT Legacy Futures Only depuis l'API Socrata de la CFTC (publicreporting.cftc.gov, jeu 6dca-aqww) ;
//     ou, avec --cot-csv, lit un export CSV du site CFTC / un annual.txt des archives historiques ;
//   - bougies quotidiennes BTCUSDT depuis l'API publique de Binance.
// Avant d'écraser un fichier existant, compare semaine par semaine et affiche les écarts : c'est le
// contrôle croisé entre le snapshot TradingView versionné et la CFTC.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fetchLegacyFuturesOnly, LEGACY_FUTURES_ONLY_DATASET, parseCftcCsv, SOCRATA_BASE } from '../cot/cftc.ts';
import { checkIntegrity, readCotCsv, writeCotCsv } from '../cot/legacy.ts';
import { cotCsvPath, cotMetaPath, PRICE_CSV, PRICE_META } from '../config.ts';
import { fetchBinanceDaily } from '../price/binance.ts';
import { readPriceCsv, writePriceCsv } from '../price/prices.ts';
import type { CotLegacyRow, SourceMeta } from '../types.ts';

const { values } = parseArgs({
  options: {
    code: { type: 'string', default: '133741' },
    from: { type: 'string', default: '2018-01-01' },
    'skip-cot': { type: 'boolean', default: false },
    'skip-price': { type: 'boolean', default: false },
    'cot-csv': { type: 'string' },
  },
});
const code = values.code;

function diffCot(old: readonly CotLegacyRow[], fresh: readonly CotLegacyRow[]): string[] {
  const byDate = new Map(old.map((r) => [r.asOf, r]));
  const out: string[] = [];
  for (const r of fresh) {
    const o = byDate.get(r.asOf);
    if (!o) continue;
    const fields = (Object.keys(r) as (keyof CotLegacyRow)[]).filter((k) => k !== 'asOf' && r[k] !== o[k]);
    if (fields.length > 0) out.push(`${r.asOf} : ${fields.map((k) => `${k} ${o[k]} → ${r[k]}`).join(', ')}`);
  }
  return out;
}

if (!values['skip-cot']) {
  const path = cotCsvPath(code);
  const fromFile = values['cot-csv'];
  const rows = fromFile ? parseCftcCsv(readFileSync(fromFile, 'utf8'), code) : await fetchLegacyFuturesOnly(code);
  const kept = rows.filter((r) => r.asOf >= values.from);
  const issues = checkIntegrity(kept);
  for (const x of issues) console.warn(`⚠ ${x.asOf} ${x.kind} : ${x.detail}`);
  if (issues.some((x) => x.kind !== 'ecart-dates')) throw new Error('Identités CFTC violées : fichier non écrit.');
  if (existsSync(path)) {
    const diffs = diffCot(readCotCsv(path), kept);
    console.log(diffs.length === 0 ? `Contrôle croisé : aucune différence avec ${path} sur les semaines communes.` : `Contrôle croisé : ${diffs.length} semaines diffèrent :\n  ${diffs.join('\n  ')}`);
  }
  writeCotCsv(path, kept);
  const meta: SourceMeta = {
    source: fromFile ? `Fichier CFTC importé : ${fromFile}` : `CFTC, API Socrata ${SOCRATA_BASE}/${LEGACY_FUTURES_ONLY_DATASET}`,
    retrievedAt: new Date().toISOString(),
    rows: kept.length,
    first: kept[0]?.asOf ?? '',
    last: kept[kept.length - 1]?.asOf ?? '',
  };
  writeFileSync(cotMetaPath(code), JSON.stringify(meta, null, 2) + '\n');
  console.log(`COT ${code} : ${kept.length} semaines (${meta.first} → ${meta.last}) écrites dans ${path}`);
}

if (!values['skip-price']) {
  const bars = await fetchBinanceDaily('BTCUSDT', values.from);
  if (existsSync(PRICE_CSV)) {
    const old = new Map(readPriceCsv(PRICE_CSV).map((b) => [b.date, b.close]));
    const diffs = bars.filter((b) => old.has(b.date) && Math.abs((old.get(b.date) as number) - b.close) > 1e-6);
    console.log(`Contrôle croisé prix : ${diffs.length} clôtures différentes sur ${bars.filter((b) => old.has(b.date)).length} jours communs.`);
  }
  writePriceCsv(PRICE_CSV, bars);
  const meta: SourceMeta = {
    source: 'Binance API publique /api/v3/klines BTCUSDT 1d',
    retrievedAt: new Date().toISOString(),
    rows: bars.length,
    first: bars[0]?.date ?? '',
    last: bars[bars.length - 1]?.date ?? '',
    notes: ['Bougie du jour en cours écartée.'],
  };
  writeFileSync(PRICE_META, JSON.stringify(meta, null, 2) + '\n');
  console.log(`BTC : ${bars.length} jours (${meta.first} → ${meta.last}) écrits dans ${PRICE_CSV}`);
}
