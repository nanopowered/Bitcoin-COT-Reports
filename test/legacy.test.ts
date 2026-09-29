import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIntegrity, sortAndDedupe } from '../src/cot/legacy.ts';
import { syntheticCot } from './helpers.ts';

test('checkIntegrity accepte des semaines cohérentes', () => {
  assert.deepEqual(checkIntegrity(syntheticCot([100, -50, 0])), []);
});

test('checkIntegrity signale une identité violée de chaque côté', () => {
  const rows = syntheticCot([100]);
  rows[0]!.nonCommLong += 1;
  rows[0]!.commShort += 2;
  assert.deepEqual(
    checkIntegrity(rows).map((x) => x.kind),
    ['identite-long', 'identite-short'],
  );
});

test('checkIntegrity tolère 6 à 8 jours entre deux arrêtés (lundi férié), pas davantage', () => {
  const rows = syntheticCot([0, 0, 0]);
  rows[1]!.asOf = '2022-01-10'; // lundi : 6 j puis 8 j
  assert.deepEqual(checkIntegrity(rows), []);
  rows[2]!.asOf = '2022-01-25';
  assert.equal(checkIntegrity(rows)[0]?.kind, 'ecart-dates');
});

test('sortAndDedupe trie, dédoublonne, et refuse deux versions différentes d’une même semaine', () => {
  const [a, b] = syntheticCot([1, 2]);
  assert.deepEqual(sortAndDedupe([b!, a!, b!]).map((r) => r.asOf), [a!.asOf, b!.asOf]);
  assert.throws(() => sortAndDedupe([a!, { ...a!, openInterest: 999 }]));
});
