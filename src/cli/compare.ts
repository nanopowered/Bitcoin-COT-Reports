// npm run compare [-- --code 133741]
// Pour chacune des six éditions du vendredi (août-septembre 2026) : ce qu'il écrit, et ce que montrait
// le rapport COT qu'il commentait (arrêté au mardi précédent). Écrit output/comparaison.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildTracker, DEFAULT_TRACKER_OPTIONS, type TrackerRow } from '../analysis/tracker.ts';
import { loadDataset, OUTPUT_DIR } from '../config.ts';
import { commercialsForwardCorrelation, majorPivots } from '../mcclellan/commercials.ts';
import { editionFacts } from '../mcclellan/compare.ts';
import { EDITIONS } from '../mcclellan/editions.ts';
import { closeOn } from '../price/prices.ts';
import { centile, mdTable, num, pctS, signed } from '../report/format.ts';
import { frDate } from '../util/dates.ts';

const { values } = parseArgs({ options: { code: { type: 'string', default: '133741' } } });
const ds = loadDataset(values.code);
const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
const facts = EDITIONS.map((e) => editionFacts(t, ds.px, e));

// Vue d'ensemble : toutes les semaines de la période, y compris celle sans commentaire (28/08).
const first = t.findIndex((r) => r.asOf >= '2026-07-01');
const period = t.slice(first);
const commented = new Set(EDITIONS.map((e) => e.edition));
const overview = mdTable(
  ['Arrêté', 'Publié', 'Édition McClellan', 'OI', 'NC long', 'NC short', 'Net NC', '% OI', 'Δ net', 'Δ pt OI', 'Rang Δ', 'Net comm. % OI', 'Δ comm. pt', 'Rang Δ comm.', 'Échéance CME', 'BTC clôture arrêté'],
  period.map((r: TrackerRow) => [
    frDate(r.asOf),
    r.publication ? frDate(r.publication) : '—',
    r.publication && commented.has(r.publication) ? 'oui' : 'non',
    num(r.openInterest),
    num(r.nonCommLong),
    num(r.nonCommShort),
    signed(r.ncNet),
    signed(r.ncNetPctOi, 2),
    signed(r.dNcNet),
    signed(r.dNcNetPp, 2),
    centile(r.pctlDNcNetPp),
    signed(r.cNetPctOi, 2),
    signed(r.dCNetPp, 2),
    centile(r.pctlDCNetPp),
    r.cmeExpiry ? frDate(r.cmeExpiry) : '',
    num(closeOn(ds.px, r.asOf)),
  ]),
  ['l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'l', 'r'],
);

const lastClose = ds.px.closes.get(ds.px.last) as number;
const sections = facts.map((f) => {
  const r = f.row;
  const e = f.edition;
  const lines = [
    `### ${frDate(e.edition)} — rapport arrêté au ${frDate(r.asOf)}`,
    '',
    `**Ce qu'il écrit** — lecture (résumé de Cyril) : ${e.lecture}. Conclusion ${
      e.conclusionLitterale ? `(citation littérale) : « ${e.conclusion} »` : `(résumé, pas de citation) : ${e.conclusion}`
    }. Sens : ${e.sens}.${e.autresCitations ? ` Dans la même édition : ${e.autresCitations.join(' ; ')}.` : ''}`,
    '',
    '**Ce que montre la donnée** (valeurs calculées sauf OI et positions brutes) :',
    '',
    mdTable(
      ['Mesure', 'Valeur'],
      [
        ['Net non-commerciaux', `${signed(r.ncNet)} contrats · ${signed(r.ncNetPctOi, 2)} % de l’OI`],
        [
          'Rang du net parmi les semaines connues',
          `${f.rankNcNet}e sur ${f.weeksKnown} en contrats (record ${signed(f.recordNcNet.value)} le ${frDate(f.recordNcNet.asOf)}) · ${f.rankNcNetPct}e en % de l’OI (record ${signed(f.recordNcNetPct.value, 2)} % le ${frDate(f.recordNcNetPct.asOf)})`,
        ],
        ['Variation sur 1 semaine', `${signed(r.dNcNet)} contrats · ${signed(r.dNcNetPp, 2)} pt · ${centile(r.pctlDNcNetPp)} (contrats : ${centile(r.pctlDNcNet)})`],
        ['Dont longs / shorts NC', `${signed(r.dNcLong)} / ${signed(r.dNcShort)}`],
        ['Variation sur 2 et 3 semaines', `${signed(f.dNcNet2w)} et ${signed(f.dNcNet3w)} contrats · ${signed(f.dNcNetPp2w, 2)} et ${signed(f.dNcNetPp3w, 2)} pt`],
        ['Commerciaux', `${signed(r.cNet)} contrats · ${signed(r.cNetPctOi, 2)} % de l’OI · Δ ${signed(r.dCNet)} (${signed(r.dCNetPp, 2)} pt, ${centile(r.pctlDCNetPp)})`],
        ['Intérêt ouvert', `${num(r.openInterest)} (Δ ${signed(r.dOi)})${r.cmeExpiry ? ` · échéance CME le ${frDate(r.cmeExpiry)} dans la semaine` : ''}`],
        [
          'BTC',
          `${num(f.closePrevAsOf)} → ${num(f.closeAsOf)} $ sur la semaine d’arrêté (${pctS(f.closeAsOf && f.closePrevAsOf ? (f.closeAsOf / f.closePrevAsOf - 1) * 100 : null)}) · ${num(f.closeEdition)} $ à la clôture de l’édition · ${pctS(f.closeEdition ? (lastClose / f.closeEdition - 1) * 100 : null)} jusqu’au ${frDate(ds.px.last)}`,
        ],
        ['BTC, 7 dernières séances avant l’édition', f.dailyBefore.map((d) => `${frDate(d.date).slice(0, 5)} ${pctS(d.ret)}`).join(' · ')],
      ],
    ),
  ];
  return lines.join('\n');
});

// Règle 2 : les commerciaux comme contre-indicateur.
const HALF_WINDOW = 26;
const pivots = majorPivots(t, ds.px, HALF_WINDOW);
const pivotTable = mdTable(
  ['Arrêté', 'Pivot', 'BTC', 'Commerciaux long / short (publié)', 'Net comm. % OI', 'Net NC % OI'],
  pivots.map((p) => [
    frDate(p.asOf),
    p.kind,
    num(p.close),
    `${num(p.row.commLong)} / ${num(p.row.commShort)}`,
    signed(p.row.cNetPctOi, 2),
    signed(p.row.ncNetPctOi, 2),
  ]),
  ['l', 'l', 'r', 'r', 'r', 'r'],
);
const corrRows = ['2018-04-10', '2021-01-01'].flatMap((from) =>
  [13, 26].map((w) => {
    const c = commercialsForwardCorrelation(t, ds.px, from, w);
    return [`depuis le ${frDate(from)}`, `${w} sem.`, String(c.n), signed(c.rho, 2)];
  }),
);

const md = `# McClellan et le COT bitcoin — ses commentaires face aux chiffres (août-septembre 2026)

*Fichier généré par \`npm run compare\` — ne pas éditer à la main.* Données COT : ${ds.cotSource}.

L'édition du vendredi commente le rapport publié le jour même (15 h 30 à New York), arrêté au mardi précédent.
« Rang Δ » = rang percentile de la variation hebdomadaire du net parmi toutes les variations antérieures
(fenêtre expansive, calculé). Le 28/08 n'a pas d'édition bitcoin : la semaine arrêtée au 25/08 n'a pas été commentée.

## Les semaines de la période

${overview}

## Édition par édition

${sections.join('\n\n')}

## Sa règle 2 : les commerciaux « more reliably wrong » ?

Sommets et creux majeurs du bitcoin, identifiés **après coup** (clôture d'arrêté la plus haute ou la plus basse
sur ± ${HALF_WINDOW} semaines — fenêtre de description, pas un signal). Positions des commerciaux ce jour-là :

${pivotTable}

Corrélation de rang (calculée) entre le net des commerciaux en % de l'OI et le rendement du bitcoin après publication.
Un contre-indicateur fiable donnerait une valeur nettement négative. Fenêtres chevauchantes : mesure descriptive, sans p-valeur.

${mdTable(['Période', 'Horizon', 'n', 'ρ de Spearman'], corrRows, ['l', 'l', 'r', 'r'])}
`;
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'comparaison.md'), md);
for (const f of facts) {
  console.log(
    `${f.edition.edition} (arrêté ${f.row.asOf}) net ${f.row.ncNet} (${f.row.ncNetPctOi.toFixed(2)} %), Δ ${f.row.dNcNet} rang ${f.row.pctlDNcNetPp?.toFixed(3)}, comm Δ ${f.row.dCNet} rang ${f.row.pctlDCNetPp?.toFixed(3)}`,
  );
}
