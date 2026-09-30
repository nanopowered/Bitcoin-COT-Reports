// Non-régression sur les données versionnées : si le snapshot change, ces valeurs publiées doivent
// être revérifiées à la main contre la CFTC (deacmelf.htm / API 6dca-aqww).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../src/analysis/tracker.ts';
import { checkIntegrity } from '../src/cot/legacy.ts';
import { loadDataset, loadTff } from '../src/config.ts';

const ds = loadDataset('133741');

test('snapshot COT : 442 semaines du 10/04/2018 au 22/09/2026, identités vérifiées', () => {
  assert.equal(ds.cot.length, 442);
  assert.equal(ds.cot[0]!.asOf, '2018-04-10');
  assert.equal(ds.cot.at(-1)!.asOf, '2026-09-22');
  assert.deepEqual(checkIntegrity(ds.cot), []);
});

test('snapshot COT : semaines commentées par McClellan (valeurs publiées)', () => {
  const at = (d: string) => ds.cot.find((r) => r.asOf === d)!;
  assert.deepEqual([at('2026-08-11').nonCommLong, at('2026-08-11').nonCommShort], [18184, 14319]);
  assert.deepEqual([at('2026-09-01').nonCommLong, at('2026-09-01').nonCommShort, at('2026-09-01').openInterest], [16530, 15827, 19697]);
});

test('snapshot prix : série quotidienne sans trou jusqu’au 28/09/2026', () => {
  assert.equal(ds.px.last, '2026-09-28');
  assert.equal(ds.px.closes.get('2026-09-21'), 86620);
});

test('suivi : les non-commerciaux ne sont jamais nets courts sur août-septembre 2026', () => {
  const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
  const recent = t.filter((r) => r.asOf >= '2026-08-01');
  assert.ok(recent.every((r) => r.ncNet > 0));
  assert.equal(Math.min(...recent.map((r) => r.ncNet)), 703);
});

test('snapshot TFF : shorts des Leveraged Funds, mêmes 442 dates que le Legacy (valeurs publiées)', () => {
  const tff = loadTff(ds);
  assert.equal(tff.rows.length, 442);
  assert.deepEqual(tff.rows.map((r) => r.asOf), ds.cot.map((r) => r.asOf));
  const at = (d: string) => tff.rows.find((r) => r.asOf === d)?.levMoneyShort;
  assert.equal(at('2018-04-10'), 1108);
  assert.equal(at('2024-12-17'), 26850);
  assert.equal(at('2026-09-22'), 12698);
});
