import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../src/analysis/tracker.ts';
import { loadDataset } from '../src/config.ts';
import { buildChartData, jsonForScript } from '../src/report/chart/build.ts';
import { asFragment, asStandalone, renderChartPage } from '../src/report/chart/page.ts';

const ds = loadDataset('133741');
const data = buildChartData(ds, buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS), 500);

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
