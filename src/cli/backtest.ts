// npm run backtest [-- --code 133741 --draws 20000]
// Que fait le bitcoin 4, 13 et 26 semaines après un passage des non-commerciaux en net short ?
// Écrit output/backtest.md, output/backtest_evenements.csv et output/backtest.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { baselineEntryDate, HORIZONS_WEEKS, runVariant, type EntryConvention, type Variant, type VariantResult } from '../analysis/backtest.ts';
import { crossingEvents, firstNetLongIndex, markedNetShortEvents, speedEvents } from '../analysis/events.ts';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../analysis/tracker.ts';
import { DELAYED_WINDOWS, KNOWN_DELAYED_PUBLICATIONS } from '../calendar/cot-calendar.ts';
import { loadDataset, OUTPUT_DIR } from '../config.ts';
import { forwardReturn } from '../price/prices.ts';
import { mdTable, num, pctS, pValue, share, signed } from '../report/format.ts';
import { toCsv } from '../util/csv.ts';
import { frDate } from '../util/dates.ts';
import { median } from '../util/stats.ts';

const { values } = parseArgs({
  options: {
    code: { type: 'string', default: '133741' },
    draws: { type: 'string', default: '20000' },
  },
});
const permutation = { draws: Number(values.draws), seed: 20_260_929 };

const ds = loadDataset(values.code);
const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
const regimeStart = firstNetLongIndex(t);
const regime = t.map((_, i) => i).slice(regimeStart);
const withSpeedRank = t.flatMap((r, i) => (r.pctlDNcNetPp !== null ? [i] : []));

const netShortVariants: Variant[] = [
  {
    id: 'croisement',
    label: 'Passage net short (tout croisement)',
    hypothesis: 'baisse',
    params: 'aucun',
    events: crossingEvents(t),
    baseline: regime,
  },
  ...[52, 156].flatMap((window) =>
    [0.25, 0.1].map(
      (q): Variant => ({
        id: `marque-${window}s-q${q * 100}`,
        label: `Net short « marqué » (${window} sem., ${num(q * 100)}e centile)`,
        hypothesis: 'baisse',
        params: `fenêtre ${window} semaines, rang ≤ ${num(q * 100)} %`,
        events: markedNetShortEvents(t, { window, q }),
        baseline: regime,
      }),
    ),
  ),
];

const speedVariants: Variant[] = [0.05, 0.1].flatMap((tail) => [
  {
    id: `debouclage-q${tail * 100}`,
    label: `Débouclage extrême (queue basse ${num(tail * 100)} %)`,
    hypothesis: 'baisse' as const,
    params: `rang de Δ (pt d'OI) ≤ ${num(tail * 100)} %`,
    events: speedEvents(t, 'baisse', tail),
    baseline: withSpeedRank,
  },
  {
    id: `reconstruction-q${tail * 100}`,
    label: `Reconstruction extrême (queue haute ${num(tail * 100)} %)`,
    hypothesis: 'hausse' as const,
    params: `rang de Δ (pt d'OI) ≥ ${num(100 - tail * 100)} %`,
    events: speedEvents(t, 'hausse', tail),
    baseline: withSpeedRank,
  },
]);

const run = (vs: Variant[], entry: EntryConvention) => vs.map((v) => runVariant(t, ds.px, v, entry, permutation));
const results = {
  netShort: { publication: run(netShortVariants, 'publication'), arrete: run(netShortVariants, 'arrete') },
  speed: { publication: run(speedVariants, 'publication'), arrete: run(speedVariants, 'arrete') },
};

// --- Rendu ---
const hLabel = (w: number) => `${w} sem.`;
function summaryTable(rs: readonly VariantResult[]): string {
  return mdTable(
    [
      'Variante',
      'Horizon',
      'n (indép.)',
      'Médiane év.',
      'Médiane base',
      '% hausse év. / base',
      'Moyenne év. / base',
      'Pire baisse méd. év. / base',
      'p (sens McClellan)',
      'p (sens inverse)',
    ],
    rs.flatMap((r) =>
      r.horizons.map((h, k) => [
        k === 0 ? r.variant.label : '',
        hLabel(h.weeks),
        `${h.n} (${h.nIndependent})`,
        pctS(h.eventMedian),
        pctS(h.baseMedian),
        `${share(h.eventShareUp)} / ${share(h.baseShareUp)}`,
        `${pctS(h.eventMean)} / ${pctS(h.baseMean)}`,
        `${pctS(h.eventMddMedian)} / ${pctS(h.baseMddMedian)}`,
        pValue(h.pValue),
        pValue(h.pValueOpposite),
      ]),
    ),
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
  );
}

function detailTable(pub: VariantResult, tue: VariantResult): string {
  return mdTable(
    ['Arrêté', 'Entrée (publication)', 'Net NC', '% OI', 'Clôture entrée', '+4 sem.', '+13 sem.', '+26 sem.', 'Pire baisse 26 sem.', '+13 sem. si entrée mardi'],
    pub.details.map((d, i) => [
      frDate(d.asOf),
      d.entry ? frDate(d.entry) : 'publication retardée (exclue)',
      signed(d.ncNet),
      signed(d.ncNetPctOi, 2),
      d.entryClose === null ? '—' : num(d.entryClose),
      pctS(d.returns[0]),
      pctS(d.returns[1]),
      pctS(d.returns[2]),
      pctS(d.drawdowns[2]),
      pctS(tue.details[i]?.returns[1]),
    ]),
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
  );
}

/** Même ensemble d'événements des deux côtés (ceux qui ont une date de publication connue). */
function lookAheadTable(pub: readonly VariantResult[], tue: readonly VariantResult[]): string {
  return mdTable(
    ['Variante', 'Horizon', 'n', 'Médiane entrée vendredi (publication)', 'Médiane entrée mardi (look-ahead)', 'Écart'],
    pub.flatMap((r, i) =>
      HORIZONS_WEEKS.map((w, k) => {
        const pairs = r.details
          .map((d, j) => [d.returns[k], tue[i]?.details[j]?.returns[k]] as const)
          .filter((x): x is readonly [number, number] => typeof x[0] === 'number' && typeof x[1] === 'number');
        const fri = median(pairs.map((x) => x[0]));
        const mar = median(pairs.map((x) => x[1]));
        return [k === 0 ? r.variant.label : '', hLabel(w), String(pairs.length), pctS(fri), pctS(mar), `${signed(mar - fri, 1)} pt`];
      }),
    ),
    ['l', 'l', 'r', 'r', 'r', 'r'],
  );
}

const fullSampleBase = HORIZONS_WEEKS.map((w) => {
  const rets = t.map((r) => forwardReturn(ds.px, baselineEntryDate(r, 'publication'), w * 7)).filter((x): x is number => x !== undefined);
  return `${hLabel(w)} ${pctS(median(rets))} (n = ${rets.length})`;
}).join(' · ');

const cross = results.netShort.publication[0] as VariantResult;
const crossTue = results.netShort.arrete[0] as VariantResult;
const netShortWeeks = t.filter((r) => r.ncNet < 0).length;
const beforeRegime = t.slice(0, regimeStart);
const firstWeek = t[0]!;
const lastBefore = beforeRegime.at(-1) ?? firstWeek;
const closesBefore = [...ds.px.closes].filter(([d]) => d <= lastBefore.asOf).map(([, c]) => c);

const md = `# Backtest — la règle de sommet de McClellan sur le COT bitcoin

*Fichier généré par \`npm run backtest\` — ne pas éditer à la main.*
Données COT : ${ds.cotSource}. Prix : ${ds.priceSource}, clôtures quotidiennes UTC.

## Conventions

- **Événement daté au mardi d'arrêté** des positions (état du marché décrit par le rapport).
- **Entrée à la clôture du jour de publication** (vendredi, 15 h 30 à New York, soit avant la clôture UTC) : première clôture où l'information était publique. Semaines de shutdown : date réelle quand la CFTC l'a documentée (${Object.entries(
  KNOWN_DELAYED_PUBLICATIONS,
)
  .map(([a, p]) => `${frDate(a)} → ${frDate(p)}`)
  .join(', ')}), sinon semaine exclue (${DELAYED_WINDOWS.map((w) => `${frDate(w.from)}–${frDate(w.to)}`).join(', ')}).
- Variante « entrée mardi » calculée **uniquement pour mesurer le biais de look-ahead** (section 3).
- Horizons : 4, 13 et 26 semaines (28, 91, 182 jours calendaires). « Pire baisse » = plus bas des clôtures de la fenêtre rapporté à l'entrée.
- **Base** = toutes les semaines de la même période, entrée au vendredi prévu (même en cas de shutdown : le prix existe, seule la publication manquait). Pour le passage net short : depuis la première semaine où les non-commerciaux ont été nets longs (${frDate(t[regimeStart]!.asOf)}) ; avant, aucun passage n'était possible.
- **p unilat.** : test de permutation (${num(permutation.draws)} tirages, graine fixe) sur la médiane, dans le sens annoncé par McClellan (plus bas que la base pour un signal baissier). Il suppose des semaines échangeables : les fenêtres qui se chevauchent et les événements groupés le rendent **optimiste**.
- **n (indép.)** : nombre d'événements dont les fenêtres ne se chevauchent pas.
- « Marqué » n'est **pas chiffré par McClellan**. Les variantes « marqué » sont une traduction de « crossed over to the net short side in a big way » : première semaine d'un épisode net short (ouvert par un passage net long → net short) où le niveau en % de l'OI tombe dans le q-ième centile inférieur des N semaines précédentes (sa règle 3 : juger le niveau contre la plage normale). Les paramètres N et q sont les miens ; ils sont montrés en grille, pas choisis.

## Contexte indispensable

- Les non-commerciaux sont nets courts **${netShortWeeks} semaines sur ${t.length}** (${num((netShortWeeks / t.length) * 100)} %).
- De ${frDate(firstWeek.asOf)} à ${frDate(lastBefore.asOf)}, ils sont nets courts **toutes les semaines** (${beforeRegime.length} sur ${beforeRegime.length}), jusqu'à ${signed(Math.min(...beforeRegime.map((r) => r.ncNetPctOi)), 1)} % de l'OI. Sur cette période, le bitcoin passe de ${num(ds.px.closes.get(firstWeek.asOf))} $ à ${num(ds.px.closes.get(lastBefore.asOf))} $, avec un sommet de clôture à ${num(Math.max(...closesBefore))} $. Un net short « marqué » y est l'état permanent : la règle ne peut rien y dire.
- Base sur tout l'échantillon (entrée à la publication) : ${fullSampleBase}.

## 1. Passage net short — entrée à la publication

${summaryTable(results.netShort.publication)}

## 2. Détail des passages net short (tout croisement)

Exclus pour publication retardée : ${cross.excludedDelayed.length ? cross.excludedDelayed.map(frDate).join(', ') : 'aucun'}.

${detailTable(cross, crossTue)}

### Événements des variantes « marqué »

${results.netShort.publication
  .slice(1)
  .map((r, i) => `**${r.variant.label}**\n\n${detailTable(r, results.netShort.arrete[i + 1] as VariantResult)}`)
  .join('\n\n')}

## 3. Biais de look-ahead : entrée au mardi d'arrêté vs au vendredi de publication

Calculé sur les mêmes événements des deux côtés. Un écart négatif signifie que l'entrée au mardi — impossible en temps réel — rend la règle plus baissière qu'elle ne l'était pour quelqu'un qui lisait le rapport le vendredi.

${lookAheadTable(results.netShort.publication, results.netShort.arrete)}

## 4. Règle de vitesse (analyse complémentaire)

Même protocole, événements = semaines où la variation du net (en points d'OI) tombe dans la queue basse (débouclage, lu comme baissier par McClellan le 04/09) ou haute (reconstruction, lue comme haussière le 11 et le 18/09). Base : toutes les semaines ayant au moins ${DEFAULT_TRACKER_OPTIONS.minHistory} variations d'historique.

${summaryTable(results.speed.publication)}
`;

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'backtest.md'), md);

const all = [...results.netShort.publication, ...results.netShort.arrete, ...results.speed.publication, ...results.speed.arrete];
writeFileSync(
  join(OUTPUT_DIR, 'backtest_evenements.csv'),
  toCsv(
    ['variante', 'entree_convention', 'as_of', 'calc_entree', 'calc_nc_net', 'calc_nc_net_pct_oi', 'close_entree', ...HORIZONS_WEEKS.flatMap((w) => [`calc_ret_${w}s_pct`, `calc_pire_baisse_${w}s_pct`])],
    all.flatMap((r) =>
      r.details.map((d) => [
        r.variant.id,
        r.entry,
        d.asOf,
        d.entry,
        d.ncNet,
        Math.round(d.ncNetPctOi * 100) / 100,
        d.entryClose,
        ...d.returns.flatMap((x, k) => [x === null ? null : Math.round(x * 100) / 100, d.drawdowns[k] === null ? null : Math.round((d.drawdowns[k] as number) * 100) / 100]),
      ]),
    ),
  ),
);
writeFileSync(join(OUTPUT_DIR, 'backtest.json'), JSON.stringify(results, null, 2) + '\n');

for (const r of results.netShort.publication) {
  console.log(
    `${r.variant.label.padEnd(44)} ` +
      r.horizons.map((h) => `${h.weeks}s n=${h.n} méd ${h.eventMedian.toFixed(1)} vs ${h.baseMedian.toFixed(1)} p=${h.pValue.toFixed(3)}`).join(' | '),
  );
}
