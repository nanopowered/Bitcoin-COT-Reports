// Assemble la page du graphique : gabarit HTML + données JSON + script client débarrassé de ses types.

import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { jsonForScript } from './build.ts';
import type { ChartData } from './data.ts';

const TEMPLATE_URL = new URL('./template.html', import.meta.url);
const CLIENT_URL = new URL('./client.ts', import.meta.url);

/** Le script client en JavaScript : les annotations de type sont effacées (même mécanisme que Node pour les .ts). */
export function clientScript(): string {
  const js = stripTypeScriptTypes(readFileSync(CLIENT_URL, 'utf8'));
  if (/<\/script/i.test(js)) throw new Error('Le script client contient « </script » : insertion impossible');
  return js;
}

export interface ChartPage {
  head: string;
  body: string;
}

export function renderChartPage(data: ChartData): ChartPage {
  const [head, body] = readFileSync(TEMPLATE_URL, 'utf8').split('<!--HEAD-END-->');
  if (head === undefined || body === undefined) throw new Error('Gabarit sans marqueur <!--HEAD-END-->');
  // Remplacements par fonction : un « $& » dans les données ne doit pas être interprété.
  const filled = body
    .replace('<!--DATA-->', () => `<script>const DATA = ${jsonForScript(data)};</script>`)
    .replace('<!--CLIENT-->', () => `<script>\n${clientScript()}\n</script>`);
  return { head: head.trim(), body: filled.trim() };
}

/** Version sans squelette html/head/body, pour une page Artifact (le squelette est ajouté à la publication). */
export const asFragment = (p: ChartPage): string => `${p.head}\n${p.body}\n`;

/** Page HTML autonome, à ouvrir directement dans un navigateur. */
export const asStandalone = (p: ChartPage): string =>
  '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  `${p.head}\n</head>\n<body>\n${p.body}\n</body>\n</html>\n`;
