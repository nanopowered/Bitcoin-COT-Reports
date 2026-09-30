// Prépare les données du graphique interactif et les textes de l'encadré de lecture.
// Tous les chiffres des textes sont recalculés depuis les données : ils restent justes après `npm run fetch`.

import { runVariant } from '../../analysis/backtest.ts';
import { carryStats } from '../../analysis/carry-stats.ts';
import type { WeeklyCarry } from '../../analysis/carry.ts';
import { crossingEvents, firstNetLongIndex } from '../../analysis/events.ts';
import type { TrackerRow } from '../../analysis/tracker.ts';
import type { Dataset } from '../../config.ts';
import { EDITIONS } from '../../mcclellan/editions.ts';
import { addDays, daysBetween, frDate } from '../../util/dates.ts';
import { num, pctS, pValue, signed } from '../format.ts';
import type { CarryTuple, ChartData, ChartEdition, GuideItem, RangePreset, WeekTuple } from './data.ts';

/** Prime hebdomadaire alignée sur le suivi, et sa provenance. */
export interface CarryInput {
  weeks: readonly WeeklyCarry[];
  source: string;
}

const pctOi = (x: number) => `${signed(x, 1)} %`;

function minBy<T>(xs: readonly T[], f: (x: T) => number): T {
  return xs.reduce((best, x) => (f(x) < f(best) ? x : best));
}
function maxBy<T>(xs: readonly T[], f: (x: T) => number): T {
  return xs.reduce((best, x) => (f(x) > f(best) ? x : best));
}

export function buildChartData(ds: Dataset, t: readonly TrackerRow[], carry: CarryInput, permutationDraws = 20_000): ChartData {
  const first = t[0] as TrackerRow;
  const last = t[t.length - 1] as TrackerRow;
  const closes = [...ds.px.closes.values()];
  const closeOn = (d: string) => ds.px.closes.get(d);
  const pricesBetween = (from: string, to: string) => [...ds.px.closes].filter(([d]) => d >= from && d <= to);

  // --- Périodes ---
  const regimeStart = firstNetLongIndex(t);
  const beforeRegime = t.slice(0, regimeStart);
  const lastShortEra = beforeRegime[beforeRegime.length - 1] ?? first;
  const firstNetLong = t[regimeStart] as TrackerRow;
  const editions: ChartEdition[] = EDITIONS.map((e) => {
    const row = t.find((r) => r.publication === e.edition);
    if (!row) throw new Error(`Édition ${e.edition} sans arrêté COT correspondant`);
    return { asOf: row.asOf, edition: e.edition, lecture: e.lecture, sens: e.sens };
  });
  const firstEdition = editions[0] as ChartEdition;
  const lastEdition = editions[editions.length - 1] as ChartEdition;
  const mccEnd = [ds.px.last, addDays(lastEdition.edition, 7)].sort()[0] as string;
  const ranges: RangePreset[] = [
    { key: 'all', label: 'Tout', from: first.asOf, to: ds.px.last },
    { key: 'shortEra', label: '2018-2021', from: first.asOf, to: lastShortEra.asOf },
    { key: 'oscillation', label: '2022-2025', from: firstNetLong.asOf, to: '2025-12-31' },
    { key: 'y2026', label: '2026', from: '2026-01-01', to: ds.px.last },
    { key: 'mcclellan', label: 'Août-sept. 2026', from: addDays(firstEdition.asOf, -14), to: mccEnd },
  ];

  // --- Encadré de lecture ---
  const guide: GuideItem[] = [];

  const eraPrices = pricesBetween(first.asOf, lastShortEra.asOf);
  const eraMax = maxBy(eraPrices, ([, c]) => c);
  guide.push({
    range: 'shortEra',
    period: `${frDate(first.asOf)} – ${frDate(lastShortEra.asOf)}`,
    text:
      `Les non-commerciaux sont nets courts toutes les semaines (${beforeRegime.length} sur ${beforeRegime.length}), ` +
      `jusqu’à ${pctOi(minBy(beforeRegime, (r) => r.ncNetPctOi).ncNetPctOi)} de l’OI. Le bitcoin passe de ` +
      `${num(closeOn(first.asOf))} $ à ${num(closeOn(lastShortEra.asOf))} $, avec un sommet de clôture à ` +
      `${num(eraMax[1])} $ le ${frDate(eraMax[0])}. Être net short « en grand » est alors l’état normal de la série, pas un signal.`,
  });

  const crossings = crossingEvents(t).map((i) => (t[i] as TrackerRow).asOf);
  const crossingVariant = runVariant(
    t,
    ds.px,
    {
      id: 'croisement',
      label: 'Passage net short',
      hypothesis: 'baisse',
      events: crossingEvents(t),
      baseline: t.map((_, i) => i).slice(regimeStart),
    },
    'publication',
    { draws: permutationDraws },
  );
  const h13 = crossingVariant.horizons[1];
  if (!h13) throw new Error('Horizon 13 semaines absent du backtest');
  guide.push({
    range: 'oscillation',
    period: `depuis le ${frDate(firstNetLong.asOf)}`,
    text:
      `Ils oscillent autour de zéro : ${crossings.length} passages en net short (points sur la courbe bleue), ` +
      `du ${frDate(crossings[0] ?? '')} au ${frDate(crossings[crossings.length - 1] ?? '')}. Treize semaines après la publication, ` +
      `le bitcoin fait en médiane ${pctS(h13.eventMedian)}, contre ${pctS(h13.baseMedian)} pour une semaine quelconque de la période ` +
      `(p = ${pValue(h13.pValue)}, ${h13.pValue < 0.05 ? 'écart significatif au seuil de 5 %' : 'écart non significatif'}).`,
  });

  const lastLong = last.ncNet >= 0;
  let streakStart = t.length - 1;
  while (streakStart > 0 && ((t[streakStart - 1] as TrackerRow).ncNet >= 0) === lastLong) streakStart--;
  const streak = t.slice(streakStart);
  const streakFirst = streak[0] as TrackerRow;
  const record = lastLong ? maxBy(streak, (r) => r.ncNetPctOi) : minBy(streak, (r) => r.ncNetPctOi);
  const fromPub = streakFirst.publication ?? streakFirst.asOf;
  const low = minBy(pricesBetween(fromPub, ds.px.last), ([, c]) => c);
  const pubClose = closeOn(fromPub);
  guide.push({
    range: 'y2026',
    period: `depuis le ${frDate(streakFirst.asOf)}`,
    text:
      `Nets ${lastLong ? 'longs' : 'courts'} chaque semaine (${streak.length} semaines d’affilée). ` +
      `Le bitcoin valait ${num(pubClose)} $ à la publication du premier de ces rapports ; il tombe ensuite à ` +
      `${num(low[1])} $ le ${frDate(low[0])} (${pctS(pubClose ? (low[1] / pubClose - 1) * 100 : null)}). ` +
      `${lastLong ? 'Record' : 'Plus bas'} du net en % de l’OI : ${pctOi(record.ncNetPctOi)} au ${frDate(record.asOf)}` +
      `${record.asOf === low[0] ? ', le jour même du plus bas du bitcoin.' : '.'}`,
  });

  const edRows = editions.map((e) => t.find((r) => r.asOf === e.asOf) as TrackerRow);
  const start = edRows[0] as TrackerRow;
  const trough = minBy(edRows, (r) => r.ncNetPctOi);
  const end = edRows[edRows.length - 1] as TrackerRow;
  guide.push({
    range: 'mcclellan',
    period: `${frDate(firstEdition.edition)} – ${frDate(lastEdition.edition)}`,
    text:
      `Pendant les six éditions de McClellan (losanges), le net des non-commerciaux passe de ${pctOi(start.ncNetPctOi)} ` +
      `à ${pctOi(trough.ncNetPctOi)} de l’OI en ${daysBetween(start.asOf, trough.asOf) / 7} semaines (arrêtés du ` +
      `${frDate(start.asOf)} au ${frDate(trough.asOf)}), puis revient à ${pctOi(end.ncNetPctOi)}. Les commerciaux font ` +
      `l’inverse : ${pctOi(start.cNetPctOi)}, ${pctOi(trough.cNetPctOi)}, puis ${pctOi(end.cNetPctOi)}.`,
  });

  // --- Prime des futures ---
  const cs = carryStats(t, carry.weeks, ds.px, { draws: permutationDraws });
  const year = (y: string) => cs.annual.find((a) => a.year === y);
  const lastYear = cs.annual[cs.annual.length - 1];
  const pt = (x: number | null | undefined) => `${signed(x, 1)} pt`;
  const excessLevels = cs.correlations[0]?.rows.find((r) => r.measure === 'excess3m');
  const yearly = [year('2020'), year('2023'), lastYear]
    .filter((a, i, xs): a is NonNullable<typeof a> => a !== undefined && xs.indexOf(a) === i)
    .map((a) => `${pt(a.excess3m)} en ${a.year}`);
  guide.push({
    range: null,
    period: 'prime des futures',
    text:
      `Troisième panneau : la prime des futures CME (calculée : 2e contrat contre 1er, annualisée) et le taux du ` +
      `Trésor américain à 3 mois. L’écart ombré entre les deux est ce que rapporte un arbitrage cash-and-carry : ` +
      `acheter le bitcoin au comptant, vendre le future. En médiane, il vaut ${yearly.join(', ')} (calc.).` +
      (excessLevels && excessLevels.levels > 0
        ? ` Plus il est large, plus les shorts non commerciaux pèsent dans l’OI (corrélation de rang ` +
          `${signed(excessLevels.levels, 2)} depuis ${t[0]?.asOf.slice(0, 4) ?? ''}) : un net short peut alors n’être ` +
          `que la jambe couverte d’un arbitrage.`
        : ''),
  });
  if (cs.split) {
    const s = cs.split;
    guide.push({
      range: 'oscillation',
      period: 'passages net short et prime',
      text:
        `Les ${s.thin.length + s.wide.length} passages net short exploitables depuis 2022, classés selon l’écart du moment. ` +
        `Écart faible (${pt(s.threshold)} ou moins) : le bitcoin fait en médiane ${pctS(s.thinMedian)} à 13 semaines. ` +
        `Écart large : ${pctS(s.wideMedian)}. ` +
        (s.pThinLower < 0.05
          ? `Différence significative (p = ${pValue(s.pThinLower)}), sur deux petits groupes.`
          : `Différence non significative (p = ${pValue(s.pThinLower)}) : deux groupes de ${s.thin.length} ne font pas une règle.`),
    });
  }

  guide.push({
    range: null,
    period: 'chaque semaine',
    text:
      `Les trois positions nettes s’additionnent à zéro : ce qu’une catégorie achète en net, les deux autres le vendent. ` +
      `Au ${frDate(last.asOf)} : non-commerciaux ${pctOi(last.ncNetPctOi)}, commerciaux ${pctOi(last.cNetPctOi)}, ` +
      `non-déclarants ${pctOi(last.nrNetPctOi)} de l’OI.`,
  });

  const weeks: WeekTuple[] = t.map((r) => [
    r.asOf,
    r.openInterest,
    r.nonCommLong,
    r.nonCommShort,
    r.nonCommSpread,
    r.commLong,
    r.commShort,
    r.nonReptLong,
    r.nonReptShort,
    r.publication,
  ]);

  const round2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
  const carryTuples: CarryTuple[] = t.map((r, i) => {
    const c = carry.weeks[i];
    if (!c || c.asOf !== r.asOf) throw new Error(`Prime absente ou décalée pour l’arrêté du ${r.asOf}`);
    return [round2(c.carry), round2(c.us03m)];
  });

  return {
    code: ds.code,
    cotSource: ds.cotSource,
    priceSource: ds.priceSource,
    lastAsOf: last.asOf,
    lastPublication: last.publication,
    weeks,
    carry: carryTuples,
    carrySource: carry.source,
    priceStart: ds.px.first,
    closes,
    crossings,
    editions,
    ranges,
    guide,
  };
}

/** JSON sûr à l'intérieur d'une balise <script> (pas de « </script> », pas de séparateurs de ligne Unicode). */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
