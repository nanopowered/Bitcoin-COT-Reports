import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annualizedCarry, contractExpiries, weeklyCarry } from '../src/analysis/carry.ts';
import { carryStats } from '../src/analysis/carry-stats.ts';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../src/analysis/tracker.ts';
import { loadDataset, loadMarket } from '../src/config.ts';
import type { FuturesDay } from '../src/market/futures.ts';
import type { RateDay } from '../src/market/rates.ts';
import { closesBySession, sessionDate } from '../src/market/tradingview.ts';
import { addDays } from '../src/util/dates.ts';

const ts = (iso: string) => Date.parse(`${iso}Z`) / 1000;

test('séance d’une barre TradingView : ouverture la veille, clôture précédente, rendements TVC', () => {
  // Futures CME jusqu'au 28/05/2026 : ouverture Globex la veille au soir.
  assert.equal(sessionDate(ts('2017-12-17T23:00:00')), '2017-12-18');
  assert.equal(sessionDate(ts('2024-03-24T22:00:00')), '2024-03-25');
  // Depuis le 29/05/2026 : clôture de la séance précédente ; vendredi soir → lundi.
  assert.equal(sessionDate(ts('2026-09-25T21:00:00')), '2026-09-28');
  assert.equal(sessionDate(ts('2026-09-28T21:00:00')), '2026-09-29');
  // Rendements TVC : minuit en Europe.
  assert.equal(sessionDate(ts('2026-09-29T23:00:00')), '2026-09-30');
  assert.equal(sessionDate(ts('2026-09-28T00:00:00')), '2026-09-28');
});

test('clôtures par séance : séance en cours écartée, doublon refusé', () => {
  const bars = [
    { t: ts('2026-09-24T21:00:00'), o: 1, h: 1, l: 1, c: 10 },
    { t: ts('2026-09-25T21:00:00'), o: 1, h: 1, l: 1, c: 11 },
    { t: ts('2026-09-29T21:00:00'), o: 1, h: 1, l: 1, c: 12 },
  ];
  const closes = closesBySession({ symbol: 'X', interval: '1D', bars }, '2026-09-30');
  assert.deepEqual([...closes], [
    ['2026-09-25', 10],
    ['2026-09-28', 11],
  ]);
  const dup = [...bars.slice(0, 1), { t: ts('2026-09-25T02:00:00'), o: 1, h: 1, l: 1, c: 9 }];
  assert.throws(() => closesBySession({ symbol: 'X', interval: '1D', bars: dup }, '2026-12-31'), /deux barres/);
});

test('échéances des deux premiers contrats, jour d’échéance et passage d’année compris', () => {
  assert.deepEqual(contractExpiries('2026-09-22'), { e1: '2026-09-25', e2: '2026-10-30' });
  assert.deepEqual(contractExpiries('2026-09-25'), { e1: '2026-09-25', e2: '2026-10-30' });
  assert.deepEqual(contractExpiries('2026-09-28'), { e1: '2026-10-30', e2: '2026-11-27' });
  assert.deepEqual(contractExpiries('2026-12-28'), { e1: '2027-01-29', e2: '2027-02-26' });
});

test('prime annualisée : 1 % sur 28 jours ≈ 13,04 % par an', () => {
  const c = annualizedCarry({ date: '2026-09-28', f1: 100, f2: 101 });
  assert.ok(Math.abs(c - (365 / 28)) < 1e-9, String(c));
});

// Séances synthétiques : prime croissante d'un jour à l'autre, taux constant.
const futures: FuturesDay[] = Array.from({ length: 20 }, (_, k) => ({ date: addDays('2026-06-01', k), f1: 100, f2: 100 + k * 0.1 }))
  .filter((d) => ![0, 6].includes(new Date(`${d.date}T00:00:00Z`).getUTCDay()));
const rates: RateDay[] = [
  { date: '2026-06-01', us03m: 4, us10y: 4.5 },
  { date: '2026-06-09', us03m: 4.1, us10y: 4.6 },
  { date: '2026-06-10', us03m: 4.2, us10y: null },
];

test('prime hebdomadaire : médiane des 5 dernières séances, sans rien après l’arrêté', () => {
  const [w] = weeklyCarry(['2026-06-16'], futures, rates);
  const expected = futures.filter((d) => d.date <= '2026-06-16').slice(-5).map(annualizedCarry).sort((a, b) => a - b)[2];
  assert.equal(w?.carry, expected);
  assert.equal(w?.sessions, 5);
  assert.equal(w?.us03m, 4.2);
  assert.equal(w?.us10y, 4.6, 'dernière cotation du 10 ans, même si la séance suivante n’en a pas');
  assert.equal(w?.excess3m, (expected as number) - 4.2);
  // Modifier le futur ne change rien.
  const altered = futures.map((d) => (d.date > '2026-06-16' ? { ...d, f2: 999 } : d));
  assert.deepEqual(weeklyCarry(['2026-06-16'], altered, rates), [w]);
});

test('prime hebdomadaire : null quand les données sont trop anciennes', () => {
  const [w] = weeklyCarry(['2026-07-14'], futures, rates);
  assert.equal(w?.carry, null);
  assert.equal(w?.us03m, null);
  assert.equal(w?.excess3m, null);
});

test('snapshot marché : séances CME et taux jusqu’au 29/09/2026, prime du 22/09/2026', () => {
  const m = loadMarket();
  assert.equal(m.futures[0]?.date, '2017-12-18');
  assert.equal(m.futures.at(-1)?.date, '2026-09-29');
  assert.equal(m.rates.at(-1)?.date, '2026-09-29');
  const ds = loadDataset('133741');
  const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
  const w = weeklyCarry(
    t.map((r) => r.asOf),
    m.futures,
    m.rates,
  );
  assert.equal(w.length, t.length);
  assert.ok(w.every((x) => x.carry !== null && x.us03m !== null));
  const last = w.at(-1)!;
  assert.equal(last.asOf, '2026-09-22');
  assert.ok(Math.abs((last.carry as number) - 5.4496) < 1e-3, String(last.carry));
  assert.equal(last.us03m, 4.105001);

  const s = carryStats(t, w, ds.px, { draws: 200 });
  assert.equal(s.crossings.length, 21);
  assert.equal(s.split?.thin.length, 10);
  assert.equal(s.split?.wide.length, 10);
});
