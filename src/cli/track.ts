// npm run track [-- --tail 0.05 --min-history 52 --code 133741]
// Écrit output/suivi.csv (toutes les semaines) et output/signaux.md (état courant + événements signalés).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildTracker, DEFAULT_TRACKER_OPTIONS, TRACKER_CSV_HEADER, trackerCsvRows, type TrackerRow } from '../analysis/tracker.ts';
import { loadDataset, OUTPUT_DIR } from '../config.ts';
import { centile, mdTable, num, signed } from '../report/format.ts';
import { toCsv } from '../util/csv.ts';
import { frDate } from '../util/dates.ts';

const { values } = parseArgs({
  options: {
    code: { type: 'string', default: '133741' },
    tail: { type: 'string', default: String(DEFAULT_TRACKER_OPTIONS.tail) },
    'min-history': { type: 'string', default: String(DEFAULT_TRACKER_OPTIONS.minHistory) },
  },
});
const opts = { tail: Number(values.tail), minHistory: Number(values['min-history']) };
if (!(opts.tail > 0 && opts.tail < 0.5) || !(opts.minHistory >= 1)) throw new Error('--tail ∈ ]0 ; 0,5[ et --min-history ≥ 1');

const ds = loadDataset(values.code);
const t = buildTracker(ds.cot, opts);
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'suivi.csv'), toCsv(TRACKER_CSV_HEADER, trackerCsvRows(t)));

const last = t[t.length - 1] as TrackerRow;
const pctl = (x: number | null) => centile(x);
const flagged = t.filter((r) => r.crossNetShort || r.crossNetLong || r.speedLow || r.speedHigh);
// Une variation de l'OI peut faire bouger le % de l'OI dans le sens opposé aux contrats : on le signale.
const unitsDisagree = (r: TrackerRow) =>
  r.dNcNet !== null && r.dNcNetPp !== null && Math.sign(r.dNcNet) !== 0 && Math.sign(r.dNcNet) !== Math.sign(r.dNcNetPp);
const what = (r: TrackerRow) =>
  [
    r.crossNetShort ? 'passage net short' : '',
    r.crossNetLong ? 'retour net long' : '',
    r.speedLow ? 'débouclage extrême' : '',
    r.speedHigh ? 'reconstruction extrême' : '',
    (r.speedLow || r.speedHigh) && unitsDisagree(r) ? '⚠ contrats en sens inverse (effet OI)' : '',
  ]
    .filter(Boolean)
    .join(' + ');

const md = `# Suivi COT bitcoin — CME ${ds.code} (Legacy, futures seuls)

Données COT : ${ds.cotSource}. Dernier arrêté : **${frDate(last.asOf)}** (publié le ${last.publication ? frDate(last.publication) : '—'}).

Toutes les valeurs ci-dessous sauf l'OI et les positions brutes sont **calculées** (colonnes \`calc_\` de \`suivi.csv\`).
Rangs percentiles : semaines antérieures uniquement (fenêtre expansive), au moins ${opts.minHistory} variations passées.
Seuil « extrême » = queue de ${num(opts.tail * 100, 1)} % de chaque côté : **paramètre de l'outil, pas un seuil de McClellan**.

## Dernière semaine

${mdTable(
  ['Mesure', 'Valeur'],
  [
    ['Intérêt ouvert (publié)', num(last.openInterest)],
    ['Non-commerciaux long / short (publié)', `${num(last.nonCommLong)} / ${num(last.nonCommShort)}`],
    ['Net non-commerciaux (calculé)', `${signed(last.ncNet)} contrats`],
    ['Net non-commerciaux en % de l’OI (calculé)', `${signed(last.ncNetPctOi, 2)} %`],
    ['Variation hebdo du net (calculé)', `${signed(last.dNcNet)} contrats · ${signed(last.dNcNetPp, 2)} pt d’OI`],
    ['Rang de cette variation dans l’historique (calculé)', pctl(last.pctlDNcNetPp)],
    ['Rang du niveau (% OI) dans l’historique (calculé)', pctl(last.pctlNcNetPctOi)],
    ['Net commerciaux en % de l’OI (calculé)', `${signed(last.cNetPctOi, 2)} %`],
    ['Échéance CME dans la semaine', last.cmeExpiry ? frDate(last.cmeExpiry) : 'non'],
    ['Signal', what(last) || 'aucun'],
  ],
)}

## Semaines signalées (${flagged.length})

${mdTable(
  ['Arrêté', 'Événement', 'Net NC', '% OI', 'Δ contrats', 'Δ pt OI', 'Rang Δ', 'Échéance CME'],
  flagged.map((r) => [
    frDate(r.asOf),
    what(r),
    signed(r.ncNet),
    signed(r.ncNetPctOi, 2),
    signed(r.dNcNet),
    signed(r.dNcNetPp, 2),
    pctl(r.pctlDNcNetPp),
    r.cmeExpiry ? frDate(r.cmeExpiry) : '',
  ]),
  ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'l'],
)}
`;
writeFileSync(join(OUTPUT_DIR, 'signaux.md'), md);
console.log(`suivi.csv : ${t.length} semaines · signaux.md : ${flagged.length} semaines signalées`);
console.log(`Dernier arrêté ${last.asOf} : net NC ${last.ncNet} (${last.ncNetPctOi.toFixed(2)} % OI), Δ ${last.dNcNet} · ${what(last) || 'aucun signal'}`);
