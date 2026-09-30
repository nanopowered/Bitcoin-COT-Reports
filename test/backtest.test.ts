import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baselineEntryDate, countIndependent, entryDate, runVariant } from '../src/analysis/backtest.ts';
import { buildTracker } from '../src/analysis/tracker.ts';
import { forwardReturn, indexPrices, maxDrawdownAfter } from '../src/price/prices.ts';
import { syntheticCot, syntheticPrices } from './helpers.ts';

const close = (a: number | undefined, b: number) => assert.ok(a !== undefined && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test('forwardReturn et maxDrawdownAfter', () => {
  const px = indexPrices(syntheticPrices(10, (k) => [100, 90, 80, 120, 130, 110, 100, 100, 100, 100][k]!));
  close(forwardReturn(px, '2022-01-01', 4), 30);
  close(maxDrawdownAfter(px, '2022-01-01', 4), -20);
  assert.equal(forwardReturn(px, '2022-01-08', 5), undefined); // hors série
});

test('indexPrices refuse un trou', () => {
  const bars = syntheticPrices(5, () => 1);
  bars.splice(2, 1);
  assert.throws(() => indexPrices(bars), /Trou/);
});

test('countIndependent : fenêtres qui ne se chevauchent pas', () => {
  assert.equal(countIndependent(['2022-01-01', '2022-01-10', '2022-02-15', '2022-02-20'], 28), 2);
  assert.equal(countIndependent([], 28), 0);
});

test('entrée : publication pour les événements, vendredi prévu pour la base, même en shutdown', () => {
  const rows = syntheticCot([0, 0], '2025-11-11'); // 2025-11-18 : publication de date inconnue
  const t = buildTracker(rows, { minHistory: 1, tail: 0.05 });
  assert.equal(entryDate(t[1]!, 'publication'), null);
  assert.equal(baselineEntryDate(t[1]!, 'publication'), '2025-11-21');
  assert.equal(entryDate(t[1]!, 'arrete'), '2025-11-18');
});

test('runVariant : entrée au vendredi, pas au mardi (le saut du mercredi n’est capté qu’au mardi)', () => {
  // Prix : 100 jusqu'au mardi 04/01/2022, saut à 200 le mercredi 05/01, puis plat.
  const px = indexPrices(syntheticPrices(400, (k) => (k < 4 ? 100 : 200), '2022-01-01'));
  const t = buildTracker(syntheticCot([10, -10, 5, 5, 5, 5], '2021-12-28'), { minHistory: 1, tail: 0.05 });
  const v = { id: 'x', label: 'x', hypothesis: 'baisse' as const, events: [1], baseline: [0, 1, 2, 3, 4, 5] };
  const fri = runVariant(t, px, v, 'publication', { draws: 200 });
  const tue = runVariant(t, px, v, 'arrete', { draws: 200 });
  assert.equal(fri.details[0]!.entry, '2022-01-07');
  assert.equal(fri.details[0]!.returns[0], 0); // information connue après le saut
  assert.equal(tue.details[0]!.entry, '2022-01-04');
  assert.equal(tue.details[0]!.returns[0], 100); // le mardi « voit » un saut qu'on ne pouvait pas trader
});
