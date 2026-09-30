import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageRanks, median, midRank, permutationPValue, quantile, spearman } from '../src/util/stats.ts';

test('median et quantile (interpolation type 7)', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(quantile([0, 10], 0.25), 2.5);
  assert.ok(Number.isNaN(median([])));
});

test('midRank : ex æquo comptés pour moitié, bornes 0 et 1', () => {
  assert.equal(midRank([1, 2, 3, 4], 0), 0);
  assert.equal(midRank([1, 2, 3, 4], 5), 1);
  assert.equal(midRank([1, 2, 2, 4], 2), 0.5);
});

test('permutationPValue : petite si les événements sont nettement plus bas, grande sinon', () => {
  const base = Array.from({ length: 200 }, (_, i) => i);
  const low = [0, 1, 2, 3, 4, 5];
  assert.ok(permutationPValue(low, base, median, 'lower', { draws: 2000 }) < 0.01);
  assert.ok(permutationPValue(low, base, median, 'higher', { draws: 2000 }) > 0.99);
  // déterministe : même graine, même résultat
  const p1 = permutationPValue([50, 60, 70], base, median, 'lower', { draws: 500, seed: 1 });
  const p2 = permutationPValue([50, 60, 70], base, median, 'lower', { draws: 500, seed: 1 });
  assert.equal(p1, p2);
});

test('spearman : rangs moyens pour les ex æquo', () => {
  assert.deepEqual(averageRanks([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
});
