import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCftcDate, parseCftcCsv, parseCftcRecords, socrataUrl } from '../src/cot/cftc.ts';
import { checkIntegrity } from '../src/cot/legacy.ts';

const fixture = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const EXPECTED_0922 = {
  asOf: '2026-09-22',
  openInterest: 22315,
  nonCommLong: 17658,
  nonCommShort: 14902,
  nonCommSpread: 3307,
  commLong: 66,
  commShort: 3175,
  nonReptLong: 1284,
  nonReptShort: 931,
};

test('JSON Socrata : colonne « postions » (sic), filtrage par code, tri chronologique', () => {
  const rows = parseCftcRecords(JSON.parse(fixture('socrata-legacy.json')), '133741');
  assert.deepEqual(rows.map((r) => r.asOf), ['2026-09-15', '2026-09-22']);
  assert.deepEqual(rows[1], EXPECTED_0922);
  assert.deepEqual(checkIntegrity(rows), []);
});

test('Export CSV du site (format=true) : BOM, séparateurs de milliers, date américaine', () => {
  assert.deepEqual(parseCftcCsv(fixture('export-format-true.csv'), '133741'), [EXPECTED_0922]);
});

test('Archive historique annual.txt (deacotAAAA.zip) : en-têtes longs et espaces', () => {
  const rows = parseCftcCsv(fixture('annual-legacy.txt'), '133741');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], EXPECTED_0922);
});

test('Colonnes manquantes : erreur explicite listant les colonnes reçues', () => {
  assert.throws(() => parseCftcRecords([{ report_date_as_yyyy_mm_dd: '2026-09-22', open_interest_all: '1' }], '133741'), /Colonnes CFTC introuvables/);
});

test('normalizeCftcDate et URL Socrata', () => {
  assert.equal(normalizeCftcDate('2026-09-22T00:00:00.000'), '2026-09-22');
  assert.equal(normalizeCftcDate('9/1/2026 12:00:00 AM'), '2026-09-01');
  assert.throws(() => normalizeCftcDate('260922'));
  const url = new URL(socrataUrl('133741', 0, 5000));
  assert.equal(url.pathname, '/resource/6dca-aqww.json');
  assert.equal(url.searchParams.get('$where'), "cftc_contract_market_code='133741'");
});
