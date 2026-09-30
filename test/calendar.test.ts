import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cmeBtcExpiry, cmeExpiryBetween, publicationOf, scheduledPublication } from '../src/calendar/cot-calendar.ts';

test('publication prévue : vendredi de la semaine d’arrêté (mardi + 3, lundi férié + 4)', () => {
  assert.equal(scheduledPublication('2026-09-22'), '2026-09-25');
  assert.equal(scheduledPublication('2025-11-10'), '2025-11-14');
});

test('publications retardées : date documentée, sinon inconnue', () => {
  assert.deepEqual(publicationOf('2026-09-01'), { date: '2026-09-04', status: 'normale' });
  assert.equal(publicationOf('2025-09-30').date, '2025-11-19');
  assert.equal(publicationOf('2025-09-30').status, 'retard-connu');
  assert.equal(publicationOf('2025-11-18').date, null);
  assert.equal(publicationOf('2019-01-08').status, 'retard-inconnu');
  assert.equal(publicationOf('2018-12-18').status, 'normale');
});

test('échéance CME : dernier vendredi du mois, et détection dans la semaine d’arrêté', () => {
  assert.equal(cmeBtcExpiry(2026, 8), '2026-08-28');
  assert.equal(cmeBtcExpiry(2026, 9), '2026-09-25');
  assert.equal(cmeExpiryBetween('2026-08-25', '2026-09-01'), '2026-08-28');
  assert.equal(cmeExpiryBetween('2026-09-15', '2026-09-22'), null);
  assert.equal(cmeExpiryBetween('2019-12-24', '2019-12-31'), '2019-12-27');
  assert.equal(cmeExpiryBetween('2021-12-28', '2022-01-04'), '2021-12-31');
});
