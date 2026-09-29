import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTracker } from '../src/analysis/tracker.ts';
import { syntheticCot } from './helpers.ts';

test('net, % de l’OI et variations', () => {
  const t = buildTracker(syntheticCot([100, -50]), { minHistory: 1, tail: 0.05 });
  assert.equal(t[0]!.ncNet, 100);
  assert.equal(t[0]!.ncNetPctOi, 10);
  assert.equal(t[0]!.dNcNet, null);
  assert.equal(t[1]!.dNcNet, -150);
  assert.equal(t[1]!.dNcNetPp, -15);
  assert.equal(t[1]!.dNcLong, -100);
  assert.equal(t[1]!.dNcShort, 50);
  // les trois nets se somment à zéro
  for (const r of t) assert.equal(r.ncNet + r.cNet + r.nrNet, 0);
});

test('passage net short / net long : ≥ 0 → < 0 et inversement', () => {
  const t = buildTracker(syntheticCot([10, 0, -1, -5, 3]), { minHistory: 1, tail: 0.05 });
  assert.deepEqual(t.map((r) => r.crossNetShort), [false, false, true, false, false]);
  assert.deepEqual(t.map((r) => r.crossNetLong), [false, false, false, false, true]);
});

test('aucun look-ahead : modifier le futur ne change aucun rang passé', () => {
  const nets = Array.from({ length: 80 }, (_, i) => Math.round(200 * Math.sin(i / 3)));
  const a = buildTracker(syntheticCot(nets), { minHistory: 10, tail: 0.05 });
  const altered = [...nets.slice(0, 60), ...nets.slice(60).map((x) => x * 7 - 3000)];
  const b = buildTracker(syntheticCot(altered), { minHistory: 10, tail: 0.05 });
  for (let i = 0; i < 60; i++) {
    assert.equal(a[i]!.pctlDNcNetPp, b[i]!.pctlDNcNetPp);
    assert.equal(a[i]!.pctlNcNetPctOi, b[i]!.pctlNcNetPctOi);
    assert.equal(a[i]!.speedLow, b[i]!.speedLow);
  }
});

test('rang percentile : absent avant minHistory, puis variation la plus forte = rang 1', () => {
  const nets = [0, 1, 2, 3, 4, 50];
  const t = buildTracker(syntheticCot(nets), { minHistory: 3, tail: 0.05 });
  assert.equal(t[3]!.pctlDNcNetPp, null); // 2 variations passées seulement
  assert.equal(t[5]!.pctlDNcNetPp, 1);
  assert.equal(t[5]!.speedHigh, true);
  assert.equal(t[5]!.speedLow, false);
});
