// npm run chart [-- --code 133741 --fragment <chemin>]
// Écrit output/graphique.html : graphique interactif autonome (données et script embarqués, aucune dépendance).
// --fragment écrit en plus la version sans squelette html/head/body, utilisée pour publier la page.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { weeklyCarry } from '../analysis/carry.ts';
import { buildTracker, DEFAULT_TRACKER_OPTIONS } from '../analysis/tracker.ts';
import { loadDataset, loadMarket, OUTPUT_DIR } from '../config.ts';
import { buildChartData } from '../report/chart/build.ts';
import { asFragment, asStandalone, renderChartPage } from '../report/chart/page.ts';

const { values } = parseArgs({
  options: {
    code: { type: 'string', default: '133741' },
    fragment: { type: 'string' },
  },
});

const ds = loadDataset(values.code);
const market = loadMarket();
const t = buildTracker(ds.cot, DEFAULT_TRACKER_OPTIONS);
const carry = {
  weeks: weeklyCarry(
    t.map((r) => r.asOf),
    market.futures,
    market.rates,
  ),
  source: `${market.futuresSource} ; taux : ${market.ratesSource}`,
};
const page = renderChartPage(buildChartData(ds, t, carry));
mkdirSync(OUTPUT_DIR, { recursive: true });
const out = join(OUTPUT_DIR, 'graphique.html');
const html = asStandalone(page);
writeFileSync(out, html);
console.log(`${out} (${Math.round(html.length / 1024)} Ko)`);
if (values.fragment) {
  writeFileSync(values.fragment, asFragment(page));
  console.log(`Fragment : ${values.fragment}`);
}
