import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossingEvents, firstNetLongIndex, markedNetShortEvents, speedEvents } from '../src/analysis/events.ts';
import { buildTracker } from '../src/analysis/tracker.ts';
import { syntheticCot } from './helpers.ts';

const opts = { minHistory: 2, tail: 0.2 };

test('crossingEvents et firstNetLongIndex', () => {
  const t = buildTracker(syntheticCot([-5, -5, 3, -1, 2, -2]), opts);
  assert.deepEqual(crossingEvents(t), [3, 5]);
  assert.equal(firstNetLongIndex(t), 2);
});

test('net short marqué : épisode ouvert par un passage, un seul événement, premier franchissement du seuil', () => {
  //            0   1   2   3   4    5    6    7   8    9
  const nets = [10, 20, 30, 40, -5, -80, -90, 10, -1, -100];
  const t = buildTracker(syntheticCot(nets), opts);
  // fenêtre 4, q = 0,25 : semaine 4 (−5) n'est pas sous le 25e centile de [10,20,30,40]… si : −5 < tout → rang 0
  assert.deepEqual(markedNetShortEvents(t, { window: 4, q: 0.25 }), [4, 9]);
  // q plus strict (−5 reste rang 0) : mêmes événements, un seul par épisode
  assert.deepEqual(markedNetShortEvents(t, { window: 4, q: 0 }), [4, 9]);
});

test('net short marqué : pas d’événement pour un épisode sans passage (série qui commence net short)', () => {
  const t = buildTracker(syntheticCot([-10, -20, -30, -40, -50, -60]), opts);
  assert.deepEqual(markedNetShortEvents(t, { window: 2, q: 0.5 }), []);
});

test('net short marqué : l’événement peut arriver plusieurs semaines après le passage', () => {
  const nets = [0, 0, 0, 0, -1, -1, -50];
  const t = buildTracker(syntheticCot(nets), opts);
  // fenêtre 3 : à la semaine 4, −1 < [0,0,0] → rang 0 ≤ 0 → événement immédiat
  assert.deepEqual(markedNetShortEvents(t, { window: 3, q: 0 }), [4]);
  // avec un historique qui contient déjà −1, seul −50 franchit : événement en semaine 6
  const t2 = buildTracker(syntheticCot([-1, -1, -1, 5, -1, -1, -50]), opts);
  assert.deepEqual(markedNetShortEvents(t2, { window: 3, q: 0.1 }), [6]);
});

test('speedEvents lit les queues du rang de variation', () => {
  const t = buildTracker(syntheticCot([0, 1, 2, 3, 100, -200]), opts);
  assert.deepEqual(speedEvents(t, 'hausse', 0.2), [4]);
  assert.deepEqual(speedEvents(t, 'baisse', 0.2), [5]);
});
