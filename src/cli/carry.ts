// npm run carry [-- --code 133741 --draws 20000]
// Prime des futures CME face au taux sans risque : quand les shorts non commerciaux peuvent-ils être
// de l'arbitrage cash-and-carry ? Écrit output/prime.md et output/prime.csv.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { carryStats, CARRY_MEASURES, ncShortPctOi } from '../analysis/carry-stats.ts';
import { DEFAULT_CARRY_OPTIONS, weeklyCarry } from '../analysis/carry.ts';
import { buildTracker, DEFAULT_TRACKER_OPTIONS, type TrackerRow } from '../analysis/tracker.ts';
import { loadDataset, loadMarket, OUTPUT_DIR } from '../config.ts';
import { mdTable, num, pctS, pValue, signed } from '../report/format.ts';
import { toCsv } from '../util/csv.ts';
import { frDate } from '../util/dates.ts';

const { values } = parseArgs({
  options: {
    code: { type: 'string', default: '133741' },
    draws: { type: 'string', default: '20000' },
  },
});

const ds = loadDataset(values.code);
const market = loadMarket();
const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
const w = weeklyCarry(
  t.map((r) => r.asOf),
  market.futures,
  market.rates,
);
const stats = carryStats(t, w, ds.px, { draws: Number(values.draws), seed: 20_260_929 });

const pct = (x: number | null) => (x === null ? '—' : `${x < 0 ? '−' : ''}${num(Math.abs(x), 1)} %`);
const pts = (x: number | null) => (x === null ? '—' : `${signed(x, 1)} pt`);
const rho = (x: number, n: number) => `${signed(x, 2)} (${n})`;
const measureLabel = (k: string) => CARRY_MEASURES.find((m) => m.key === k)?.label ?? k;

const last = w[w.length - 1];
const lastRow = t[t.length - 1] as TrackerRow;
const split = stats.split;

/** 2020 et 2023 : primes médianes voisines, taux à 3 mois opposés. */
function sameCarryOtherRate(): string {
  const a = stats.annual.find((x) => x.year === '2020');
  const b = stats.annual.find((x) => x.year === '2023');
  if (!a || !b) return '';
  return (
    `Une même prime ne rapporte pas la même chose selon les taux. En 2020, prime médiane ${pct(a.carry)}, ` +
    `taux à 3 mois ${pct(a.us03m)}, excès ${pts(a.excess3m)}. En 2023, prime ${pct(b.carry)}, mais taux ` +
    `${pct(b.us03m)} : excès ${pts(b.excess3m)} seulement.`
  );
}

const md = `# Prime des futures CME et arbitrage cash-and-carry

Toutes les valeurs de ce fichier sont **calculées**, sauf les taux du Trésor (valeurs de la source).

## Méthode

- **Prime** : (F2 / F1 − 1) × 365 / jours entre les deux échéances × 100, en % par an. F1 et F2 sont les clôtures du même jour des deux premiers contrats CME ; échéance = dernier vendredi du mois. C'est ce qu'encaisse, d'une échéance à la suivante, un vendeur de futures couvert au comptant.
- **Semaine** : médiane des ${DEFAULT_CARRY_OPTIONS.sessions} dernières séances jusqu'au mardi d'arrêté inclus ; aucune séance postérieure (pas de look-ahead). Taux : dernière cotation au plus tard le mardi.
- **Excès** : prime − rendement du bon du Trésor à 3 mois. L'arbitrage dure un à deux mois et se finance à court terme : c'est le bon taux de référence. Le 10 ans est donné pour comparaison.
- **Ce que l'excès ne compte pas** : frais (ETF, CME, courtage), marge à immobiliser sur la jambe future, surcoût de financement d'un fonds par rapport au Trésor, risque d'appel de marge si le prix monte brutalement. Le seuil de rentabilité réel est donc au-dessus de zéro, propre à chaque acteur, et n'est pas observable ici.
- Sources : ${market.futuresSource} ; ${market.ratesSource}.

## Dernière semaine

Arrêté du ${frDate(lastRow.asOf)} : prime ${pct(last?.carry ?? null)}, taux à 3 mois ${pct(last?.us03m ?? null)}, excès ${pts(last?.excess3m ?? null)}. Shorts non commerciaux : ${num(ncShortPctOi(lastRow), 1)} % de l'OI.

## Médianes annuelles

${mdTable(
  ['Année', 'Semaines', 'Prime', 'Taux 3 mois', 'Taux 10 ans', 'Excès / 3 mois', 'Excès / 10 ans', 'Shorts NC, % de l’OI'],
  stats.annual.map((a) => [a.year, String(a.weeks), pct(a.carry), pct(a.us03m), pct(a.us10y), pts(a.excess3m), pts(a.excess10y), `${num(a.ncShortPctOi, 1)} %`]),
  ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
)}

${sameCarryOtherRate()}

## Quel taux retenir ?

Corrélation de rang (Spearman) entre la part des shorts non commerciaux dans l'OI et chaque mesure de la prime. Entre parenthèses : nombre de semaines, ou de paires de variations.

${stats.correlations
  .map(
    (p) =>
      `### ${p.label} (${frDate(p.from)} – ${frDate(p.to)})\n\n` +
      mdTable(
        ['Mesure', 'Niveaux', 'Variations sur 13 semaines'],
        p.rows.map((r) => [measureLabel(r.measure), rho(r.levels, r.levelsN), rho(r.changes13, r.changes13N)]),
        ['l', 'r', 'r'],
      ),
  )
  .join('\n\n')}

- Les niveaux hebdomadaires sont très autocorrélés : ces coefficients décrivent, ils ne testent rien.
- Les variations sur 13 semaines ne se chevauchent pas, mais elles sont peu nombreuses.
- Avant 2022, taux courts et longs sont bas et bougent ensemble : les trois mesures sont presque confondues.

## Passages net short et prime du moment

Mêmes conventions que le backtest : entrée à la clôture du jour de publication, rendement à 13 semaines.

${mdTable(
  ['Arrêté', 'Publication', 'Prime', 'Taux 3 mois', 'Excès', 'Bitcoin 13 sem. après'],
  stats.crossings.map((c) => [frDate(c.asOf), c.entry ? frDate(c.entry) : 'retardée (exclue)', pct(c.carry), pct(c.us03m), pts(c.excess3m), pctS(c.ret13)]),
  ['l', 'l', 'r', 'r', 'r', 'r'],
)}

${
  split
    ? `- Excès inférieur ou égal à ${pts(split.threshold)} (${split.thin.length} passages) : médiane ${pctS(split.thinMedian)} à 13 semaines.
- Excès supérieur (${split.wide.length} passages) : médiane ${pctS(split.wideMedian)}.
- p unilatérale (permutation, ${num(Number(values.draws))} tirages) que le groupe à excès faible fasse moins bien qu'une moitié tirée au hasard : ${pValue(split.pThinLower)}.
- Les fenêtres de 13 semaines se chevauchent et les deux groupes sont petits : c'est une description, pas une règle.`
    : 'Trop peu de passages exploitables pour comparer deux groupes.'
}

## Limites

- **Contrats continus TradingView.** La date de roulement n'est pas documentée : on suppose que le 1er contrat est celui de la prochaine échéance. Autour des échéances, quelques séances peuvent être mal appariées ; la médiane sur ${DEFAULT_CARRY_OPTIONS.sessions} séances l'amortit.
- **Clôtures.** TradingView ne dit pas s'il s'agit du règlement. Le 2e contrat traite peu : sa clôture peut dater de quelques heures.
- **Pas de cotation.** Le contrat cote par pas de 5 $. Quand le bitcoin valait 3 500 à 7 000 $ (2018-2019), un seul pas représentait 1 à 2 points de prime annualisée : les premières années sont imprécises.
- **Motif.** Le COT ne dit pas pourquoi un fonds est vendeur. Le lien avec la prime est une corrélation, compatible avec l'arbitrage, pas une preuve.
`;

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'prime.md'), md);
writeFileSync(
  join(OUTPUT_DIR, 'prime.csv'),
  toCsv(
    ['as_of', 'calc_prime_ann_pct', 'calc_seances', 'us03m', 'us10y', 'calc_exces_3m_pt', 'calc_exces_10y_pt', 'calc_nc_short_pct_oi'],
    w.map((x, i) => {
      const r4 = (v: number | null) => (v === null ? null : Math.round(v * 1e4) / 1e4);
      return [x.asOf, r4(x.carry), x.sessions, x.us03m, x.us10y, r4(x.excess3m), r4(x.excess10y), r4(ncShortPctOi(t[i] as TrackerRow))];
    }),
  ),
);
console.log(`${join(OUTPUT_DIR, 'prime.md')} et prime.csv (${w.length} semaines)`);
