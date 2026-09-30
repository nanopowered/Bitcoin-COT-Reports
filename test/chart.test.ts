import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyCarry } from '../src/analysis/carry.ts';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../src/analysis/tracker.ts';
import { loadDataset, loadMarket, loadTff } from '../src/config.ts';
import { buildChartData, jsonForScript } from '../src/report/chart/build.ts';
import { asFragment, asStandalone, renderChartPage } from '../src/report/chart/page.ts';

const ds = loadDataset('133741');
const market = loadMarket();
const tracker = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
const carry = {
  weeks: weeklyCarry(
    tracker.map((r) => r.asOf),
    market.futures,
    market.rates,
  ),
  source: 'test',
};
const data = buildChartData(ds, tracker, carry, loadTff(ds), 500);

test('données du graphique : semaines, passages net short, éditions, périodes', () => {
  assert.equal(data.weeks.length, 442);
  assert.equal(data.closes.length, 3124);
  assert.equal(data.crossings.length, 21);
  assert.deepEqual(
    data.editions.map((e) => e.asOf),
    ['2026-08-11', '2026-08-18', '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'],
  );
  assert.deepEqual(
    data.ranges.map((r) => r.key),
    ['all', 'shortEra', 'oscillation', 'y2026', 'mcclellan'],
  );
  for (const r of data.ranges) assert.ok(r.from < r.to, r.key);
  // Une paire prime / taux par semaine, arrondie au centième.
  assert.equal(data.carry.length, data.weeks.length);
  for (const [c, r] of data.carry) {
    assert.ok(c !== null && Number.isFinite(c) && Math.abs(c * 100 - Math.round(c * 100)) < 1e-9, String(c));
    assert.ok(r !== null && Number.isFinite(r), String(r));
  }
  assert.deepEqual(data.carry.at(-1), [5.45, 4.11]);
  // Shorts des hedge funds (TFF) : un par semaine, valeur publiée du 22/09/2026.
  assert.equal(data.lfShort.length, data.weeks.length);
  assert.equal(data.lfShort.at(-1), 12698);
  assert.ok(data.guide.some((g) => g.period === 'prime des futures'));
  // Les trois nets que le navigateur calcule à partir des tuples se somment à zéro.
  for (const [, , ncL, ncS, , cL, cS, nrL, nrS] of data.weeks) assert.equal(ncL - ncS + (cL - cS) + (nrL - nrS), 0);
});

test('jsonForScript neutralise « </script> » et les séparateurs de ligne Unicode', () => {
  const lineSep = String.fromCharCode(0x2028);
  const value = { a: '</script><b>', b: `x${lineSep}y` };
  const s = jsonForScript(value);
  assert.ok(!s.includes('</'));
  assert.ok(!s.includes(lineSep));
  assert.deepEqual(JSON.parse(s), value);
});

test('page : fragment sans squelette, page autonome complète, deux scripts valides', () => {
  const page = renderChartPage(data);
  const fragment = asFragment(page);
  assert.ok(!/<!doctype|<html|<body/i.test(fragment));
  assert.match(fragment.slice(0, 8192), /<title>Positions COT du bitcoin<\/title>/);
  assert.ok(asStandalone(page).startsWith('<!doctype html>'));
  const scripts = [...fragment.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
  assert.equal(scripts.length, 2);
  for (const js of scripts) assert.doesNotThrow(() => new Function(js));
});
