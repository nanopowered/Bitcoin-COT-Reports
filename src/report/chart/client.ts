// Script du graphique interactif (navigateur). Écrit en TypeScript, typé avec tsconfig.client.json,
// puis débarrassé de ses types par `npm run chart` et inséré tel quel dans la page.
// Aucune dépendance : SVG dessiné à la main.

import type { ChartData, ChartEdition, RangeKey } from './data.ts';

declare const DATA: ChartData;

(() => {
  /** 'lf' : positions courtes brutes des hedge funds (TFF), pas un net. */
  type SeriesKey = 'nc' | 'c' | 'nr' | 'lf';
  type CarryKey = 'carry' | 'rate';
  type Unit = 'pct' | 'ctr';
  type LayerKey = 'cross' | 'mcc';
  type Attrs = Record<string, string | number>;

  interface Week {
    d: string;
    t: number;
    oi: number;
    long: Record<SeriesKey, number>;
    short: Record<SeriesKey, number>;
    net: Record<SeriesKey, number>;
    pct: Record<SeriesKey, number>;
    /** Prime des futures CME annualisée (calculée) et taux à 3 mois, % par an. */
    rates: Record<CarryKey, number | null>;
    pub: string | null;
    close: number | undefined;
    cross: boolean;
    edition: ChartEdition | undefined;
  }

  interface State {
    range: RangeKey;
    unit: Unit;
    visible: Record<SeriesKey, boolean>;
    carry: Record<CarryKey, boolean>;
    layers: Record<LayerKey, boolean>;
    tableOpen: boolean;
  }

  interface Box {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }

  interface Frame {
    W: number;
    A: Box;
    B: Box;
    C: Box;
    x: (t: number) => number;
    yPrice: (v: number) => number;
    yPos: ((v: number) => number) | null;
    yCarry: ((v: number) => number) | null;
    inRange: Week[];
    shown: readonly Series[];
    carryShown: readonly CarrySeries[];
  }

  interface Series {
    key: SeriesKey;
    name: string;
    short: string;
    sub: string;
  }

  interface CarrySeries {
    key: CarryKey;
    name: string;
    short: string;
    sub: string;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DAY_MS = 86_400_000;
  const NBSP = String.fromCharCode(0xa0);
  const NNBSP = String.fromCharCode(0x202f);
  const MINUS = '−';
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const STORAGE_KEY = 'positions-cot-bitcoin:v1';

  const SERIES: readonly Series[] = [
    { key: 'nc', name: 'Non-commerciaux', short: 'Non-comm.', sub: 'grands spéculateurs' },
    { key: 'c', name: 'Commerciaux', short: 'Comm.', sub: 'couvreurs déclarés' },
    { key: 'nr', name: 'Non-déclarants', short: 'Non-décl.', sub: 'sous le seuil de déclaration' },
    { key: 'lf', name: 'Hedge funds : courts', short: 'Hedge funds, courts', sub: 'rapport TFF, brut (pas un net)' },
  ];
  const CARRY_SERIES: readonly CarrySeries[] = [
    { key: 'carry', name: 'Prime des futures CME', short: 'Prime CME', sub: '2e contrat / 1er, annualisée' },
    { key: 'rate', name: 'Taux US à 3 mois', short: 'Taux 3 mois', sub: 'bon du Trésor, référence' },
  ];
  const LAYERS: readonly { key: LayerKey; name: string }[] = [
    { key: 'cross', name: 'Passages net short' },
    { key: 'mcc', name: 'Éditions McClellan' },
  ];

  // ---------- Formats ----------

  const formatters = new Map<number, Intl.NumberFormat>();
  function abs(x: number, digits: number): string {
    let f = formatters.get(digits);
    if (!f) {
      f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
      formatters.set(digits, f);
    }
    return f.format(Math.abs(x)).split(NNBSP).join(NBSP);
  }
  const signed = (x: number, digits = 0) => `${x > 0 ? '+' : x < 0 ? MINUS : ''}${abs(x, digits)}`;
  const plain = (x: number, digits = 0) => `${x < 0 ? MINUS : ''}${abs(x, digits)}`;
  const usd = (x: number) => `${plain(x)}${NBSP}$`;
  const pctText = (x: number, digits = 1) => `${signed(x, digits)}${NBSP}%`;
  const valueOf = (w: Week, k: SeriesKey, unit: Unit) => (unit === 'pct' ? w.pct[k] : w.net[k]);
  const valueText = (v: number, unit: Unit, digits = 1) => (unit === 'pct' ? pctText(v, digits) : signed(v));
  /** Un net porte un signe ; une position brute (hedge funds) non. */
  const seriesText = (k: SeriesKey, v: number, unit: Unit, digits = 1) =>
    k !== 'lf' ? valueText(v, unit, digits) : unit === 'pct' ? `${plain(v, digits)}${NBSP}%` : plain(v);
  const rateText = (v: number, digits = 1) => `${plain(v, digits)}${NBSP}%`;
  const excessOf = (w: Week) => (w.rates.carry !== null && w.rates.rate !== null ? w.rates.carry - w.rates.rate : null);

  const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
  const isoOfDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
  const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const frDayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const weekdayOf = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()] ?? '';

  // ---------- Données ----------

  const priceStart = toDay(DATA.priceStart);
  const priceEnd = priceStart + DATA.closes.length - 1;
  const closeAt = (day: number): number | undefined => DATA.closes[Math.round(day - priceStart)];
  const crossings = new Set(DATA.crossings);
  const editions = new Map(DATA.editions.map((e) => [e.asOf, e]));

  const weeks: Week[] = DATA.weeks.map(([d, oi, ncL, ncS, , cL, cS, nrL, nrS, pub], i) => {
    // Les hedge funds n'ont qu'une position courte brute ; elle occupe la place du « net » (NaN si absente).
    const lf = DATA.lfShort[i] ?? Number.NaN;
    const net = { nc: ncL - ncS, c: cL - cS, nr: nrL - nrS, lf };
    const t = toDay(d);
    const [carry, rate] = DATA.carry[i] ?? [null, null];
    return {
      d,
      t,
      oi,
      long: { nc: ncL, c: cL, nr: nrL, lf: Number.NaN },
      short: { nc: ncS, c: cS, nr: nrS, lf },
      net,
      pct: { nc: (net.nc / oi) * 100, c: (net.c / oi) * 100, nr: (net.nr / oi) * 100, lf: (lf / oi) * 100 },
      rates: { carry, rate },
      pub,
      close: closeAt(t),
      cross: crossings.has(d),
      edition: editions.get(d),
    };
  });

  // ---------- État (mémorisé dans ce navigateur seulement) ----------

  const DEFAULT_STATE: State = {
    range: 'all',
    unit: 'pct',
    visible: { nc: true, c: true, nr: true, lf: false },
    carry: { carry: true, rate: true },
    layers: { cross: true, mcc: true },
    tableOpen: false,
  };

  function loadState(): State {
    const s: State = structuredClone(DEFAULT_STATE);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return s;
      const saved = JSON.parse(raw) as Partial<State>;
      if (DATA.ranges.some((r) => r.key === saved.range)) s.range = saved.range as RangeKey;
      if (saved.unit === 'pct' || saved.unit === 'ctr') s.unit = saved.unit;
      for (const { key } of SERIES) if (typeof saved.visible?.[key] === 'boolean') s.visible[key] = saved.visible[key];
      for (const { key } of CARRY_SERIES) if (typeof saved.carry?.[key] === 'boolean') s.carry[key] = saved.carry[key];
      for (const { key } of LAYERS) if (typeof saved.layers?.[key] === 'boolean') s.layers[key] = saved.layers[key];
    } catch {
      // Stockage indisponible (navigation privée, aperçu) : état par défaut.
    }
    return s;
  }

  function saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, tableOpen: false }));
    } catch {
      // Sans stockage, l'état n'est simplement pas retenu.
    }
  }

  const state = loadState();
  let hoverDate: string | null = null;
  let frame: Frame | null = null;
  let lastWidth = 0;

  // ---------- DOM ----------

  function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Élément #${id} introuvable`);
    return node as T;
  }
  const plot = byId<HTMLDivElement>('plot');
  const svg = plot.querySelector('svg') as SVGSVGElement;
  const desc = svg.querySelector('desc') as SVGDescElement;
  const tip = byId<HTMLDivElement>('tip');
  const live = byId<HTMLParagraphElement>('live');
  const legend = byId<HTMLDivElement>('legend');
  const rangesBox = byId<HTMLDivElement>('ranges');
  const unitsBox = byId<HTMLDivElement>('units');
  const tableToggle = byId<HTMLButtonElement>('table-toggle');
  const tableWrap = byId<HTMLDivElement>('table-wrap');
  const table = byId<HTMLTableElement>('table');
  const card = byId<HTMLElement>('card');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs, parent?: Element): SVGElementTagNameMap[K] {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    parent?.appendChild(node);
    return node;
  }
  function svgText(parent: Element, x: number, y: number, content: string, attrs: Attrs = {}): SVGTextElement {
    const node = svgEl('text', { x, y, ...attrs }, parent);
    node.textContent = content;
    return node;
  }
  function htmlEl<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = ''): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }
  /** Petite clé de légende : un trait (ligne) ou un repère (point, losange). */
  function keySvg(kind: 'line' | 'dot' | 'diamond', cls: string, width = 18): SVGSVGElement {
    const k = svgEl('svg', { width, height: 12, viewBox: `0 0 ${width} 12`, 'aria-hidden': 'true' });
    if (kind === 'line') svgEl('line', { x1: 2, y1: 6, x2: width - 2, y2: 6, class: `key-line ${cls}` }, k);
    if (kind === 'dot') svgEl('circle', { cx: width / 2, cy: 6, r: 4, class: `key-mark dot ${cls}` }, k);
    if (kind === 'diamond') svgEl('path', { d: diamondPath(width / 2, 6, 5), class: `key-mark mcc-mark ${cls}` }, k);
    return k;
  }
  const diamondPath = (cx: number, cy: number, r: number) => `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`;
  const crisp = (v: number) => Math.round(v) + 0.5;

  // ---------- Échelles et graduations ----------

  function niceStep(span: number, target: number): number {
    const raw = span / Math.max(1, target);
    const p = 10 ** Math.floor(Math.log10(raw));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  function linearTicks(min: number, max: number, target: number): { ticks: number[]; step: number } {
    const step = niceStep(max - min, target);
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v / step) * step);
    return { ticks, step };
  }

  function logTicks(min: number, max: number, maxTicks: number): number[] {
    const sets = [[1], [1, 2, 5], [1, 1.5, 2, 3, 5, 7], [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]];
    let best: number[] = [];
    for (const mult of sets) {
      const ticks: number[] = [];
      for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
        for (const m of mult) {
          const v = m * 10 ** e;
          if (v >= min && v <= max) ticks.push(v);
        }
      }
      best = ticks;
      if (ticks.length >= 3) break;
    }
    if (best.length <= maxTicks) return best;
    const step = Math.ceil(best.length / maxTicks);
    return best.filter((_, i) => i % step === 0);
  }

  const priceTick = (v: number) => `${abs(v / 1000, v < 10_000 && v % 1000 !== 0 ? 1 : 0)}${NBSP}k$`;

  interface TimeTick {
    t: number;
    label: string;
  }

  function timeTicks(t0: number, t1: number, width: number, inRange: readonly Week[]): TimeTick[] {
    const maxN = Math.max(2, Math.floor(width / 72));
    const span = t1 - t0;
    const d0 = new Date(t0 * DAY_MS);
    const d1 = new Date(t1 * DAY_MS);
    if (span > 3 * 365) {
      const years: number[] = [];
      for (let y = d0.getUTCFullYear() + (d0.getUTCMonth() === 0 && d0.getUTCDate() === 1 ? 0 : 1); y <= d1.getUTCFullYear(); y++) years.push(y);
      const step = Math.ceil(years.length / maxN);
      return years.filter((_, i) => i % step === 0).map((y) => ({ t: Date.UTC(y, 0, 1) / DAY_MS, label: String(y) }));
    }
    if (span > 150) {
      const months: { y: number; m: number }[] = [];
      let y = d0.getUTCFullYear();
      let m = d0.getUTCMonth() + (d0.getUTCDate() === 1 ? 0 : 1);
      for (; Date.UTC(y, m, 1) / DAY_MS <= t1; m++) {
        if (m === 12) {
          m = 0;
          y++;
          if (Date.UTC(y, m, 1) / DAY_MS > t1) break;
        }
        months.push({ y, m });
      }
      const step = [1, 2, 3, 6, 12].find((s) => Math.ceil(months.length / s) <= maxN) ?? 12;
      return months
        .filter(({ m: mm }) => mm % step === 0)
        .map(({ y: yy, m: mm }, i) => ({
          t: Date.UTC(yy, mm, 1) / DAY_MS,
          label: mm === 0 || i === 0 ? `${MONTHS[mm] ?? ''} ${yy}` : (MONTHS[mm] ?? ''),
        }));
    }
    const step = Math.ceil(inRange.length / maxN);
    return inRange.filter((_, i) => i % step === 0).map((w) => ({ t: w.t, label: frDayMonth(w.d) }));
  }

  // ---------- Rendu ----------

  /** Trois panneaux empilés qui partagent l'axe du temps : prix (A), positions (B), prime des futures (C). */
  function geometry(W: number) {
    const narrow = W < 560;
    const H = Math.round(Math.min(780, Math.max(580, W * 0.78)));
    const m = { l: narrow ? 46 : 58, r: narrow ? 10 : 80, t: 24, b: 30 };
    const gap = 44;
    const avail = H - m.t - m.b - 2 * gap;
    const hA = Math.round(avail * 0.34);
    const hB = Math.round(avail * 0.4);
    const A: Box = { x0: m.l, x1: W - m.r, y0: m.t, y1: m.t + hA };
    const B: Box = { x0: m.l, x1: W - m.r, y0: A.y1 + gap, y1: A.y1 + gap + hB };
    const C: Box = { x0: m.l, x1: W - m.r, y0: B.y1 + gap, y1: H - m.b };
    return { H, A, B, C, narrow };
  }

  function pathOf(points: readonly (readonly [number, number])[]): string {
    let d = '';
    points.forEach(([x, y], i) => {
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return d;
  }

  /** Tronçons de semaines consécutives où `ok` est vrai (une donnée manquante coupe la ligne). */
  function runsOf(list: readonly Week[], ok: (w: Week) => boolean): Week[][] {
    const runs: Week[][] = [];
    let cur: Week[] = [];
    for (const w of list) {
      if (ok(w)) cur.push(w);
      else if (cur.length) {
        runs.push(cur);
        cur = [];
      }
    }
    if (cur.length) runs.push(cur);
    return runs;
  }

  /** Étiquettes directes en bout de courbe, écartées d'au moins 15 px et gardées dans le panneau. */
  function endLabels(items: { y: number; cls: string; text: string }[], box: Box, xe: number, narrow: boolean): void {
    const placed = [...items].sort((a, b) => a.y - b.y).map((it) => ({ ...it, yl: it.y }));
    placed.forEach((it, i) => {
      const prev = placed[i - 1];
      if (prev) it.yl = Math.max(it.y, prev.yl + 15);
    });
    const overflow = (placed[placed.length - 1]?.yl ?? 0) - (box.y1 - 4);
    if (overflow > 0) for (const it of placed) it.yl -= overflow;
    for (const it of placed) {
      svgEl('circle', { cx: xe, cy: it.y, r: 4, class: `dot fill-${it.cls}` }, svg);
      if (narrow) continue;
      const xl = xe + 10;
      if (Math.abs(it.yl - it.y) > 1) svgEl('line', { x1: xe + 5, y1: it.y, x2: xl, y2: it.yl, class: 'leader' }, svg);
      svgEl('line', { x1: xl, x2: xl + 8, y1: it.yl, y2: it.yl, class: `line stroke-${it.cls}` }, svg);
      svgText(svg, xl + 12, it.yl + 4, it.text, { class: 'end-label' });
    }
  }

  function rangeOf(key: RangeKey) {
    return DATA.ranges.find((r) => r.key === key) ?? (DATA.ranges[0] as (typeof DATA.ranges)[number]);
  }

  function render(): void {
    const W = Math.max(300, Math.round(plot.clientWidth));
    lastWidth = W;
    const { H, A, B, C, narrow } = geometry(W);
    const range = rangeOf(state.range);
    const t0 = toDay(range.from);
    const t1 = toDay(range.to);
    const x = (t: number) => A.x0 + ((t - t0) / (t1 - t0)) * (A.x1 - A.x0);

    svg.replaceChildren(desc);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    const defs = svgEl('defs', {}, svg);
    for (const [id, box] of [
      ['clip-a', A],
      ['clip-b', B],
      ['clip-c', C],
    ] as const) {
      const cp = svgEl('clipPath', { id }, defs);
      svgEl('rect', { x: box.x0, y: box.y0 - 6, width: box.x1 - box.x0 + 6, height: box.y1 - box.y0 + 12 }, cp);
    }

    // Prix : clôtures quotidiennes de la période (plus un jour de chaque côté pour la continuité).
    const pricePts: [number, number][] = [];
    for (let d = Math.max(Math.floor(t0) - 1, priceStart); d <= Math.min(Math.ceil(t1) + 1, priceEnd); d++) {
      const c = closeAt(d);
      if (c !== undefined) pricePts.push([d, c]);
    }
    const visible = pricePts.filter(([d]) => d >= t0 && d <= t1).map(([, c]) => c);
    const lo = Math.log10(Math.min(...visible));
    const hi = Math.log10(Math.max(...visible));
    const pad = (hi - lo) * 0.07 || 0.02;
    const yPrice = (v: number) => A.y1 - ((Math.log10(v) - (lo - pad)) / (hi - lo + 2 * pad)) * (A.y1 - A.y0);

    // Positions : semaines de la période, séries affichées, zéro toujours inclus.
    const inRange = weeks.filter((w) => w.t >= t0 && w.t <= t1);
    const first = weeks.findIndex((w) => w.t >= t0);
    const lastIdx = weeks.length - 1 - [...weeks].reverse().findIndex((w) => w.t <= t1);
    const withEdges = weeks.slice(Math.max(0, first - 1), Math.min(weeks.length, lastIdx + 2));
    const shown = SERIES.filter((s) => state.visible[s.key]);
    const vals = inRange.flatMap((w) => shown.map((s) => valueOf(w, s.key, state.unit))).filter(Number.isFinite);
    let yPos: ((v: number) => number) | null = null;
    let posTicks: number[] = [];
    let posStep = 1;
    if (shown.length > 0 && vals.length > 0) {
      let vMin = Math.min(0, ...vals);
      let vMax = Math.max(0, ...vals);
      const vPad = (vMax - vMin) * 0.08 || 1;
      vMin -= vPad;
      vMax += vPad;
      const lt = linearTicks(vMin, vMax, narrow ? 4 : 6);
      posTicks = lt.ticks;
      posStep = lt.step;
      yPos = (v: number) => B.y1 - ((v - vMin) / (vMax - vMin)) * (B.y1 - B.y0);
    }

    // Prime des futures et taux : même unité (% par an), un seul axe, zéro toujours inclus.
    const carryShown = CARRY_SERIES.filter((s) => state.carry[s.key]);
    const cVals = inRange.flatMap((w) => carryShown.flatMap((s) => (w.rates[s.key] === null ? [] : [w.rates[s.key] as number])));
    let yCarry: ((v: number) => number) | null = null;
    let carryTicks: number[] = [];
    let carryStep = 1;
    if (cVals.length > 0) {
      let cMin = Math.min(0, ...cVals);
      let cMax = Math.max(0, ...cVals);
      const cPad = (cMax - cMin) * 0.08 || 1;
      cMin -= cPad;
      cMax += cPad;
      const lt = linearTicks(cMin, cMax, narrow ? 3 : 4);
      carryTicks = lt.ticks;
      carryStep = lt.step;
      yCarry = (v: number) => C.y1 - ((v - cMin) / (cMax - cMin)) * (C.y1 - C.y0);
    }

    // Grille, graduations, titres de panneau.
    const grid = svgEl('g', {}, svg);
    for (const tk of timeTicks(t0, t1, A.x1 - A.x0, inRange)) {
      const xx = crisp(x(tk.t));
      if (xx < A.x0 || xx > A.x1) continue;
      for (const box of [A, B, C]) svgEl('line', { x1: xx, x2: xx, y1: box.y0, y2: box.y1, class: 'vgrid' }, grid);
      svgText(grid, xx, C.y1 + 19, tk.label, { class: 'tick', 'text-anchor': 'middle' });
    }
    if (yCarry) {
      const digits = carryStep < 1 ? 1 : 0;
      for (const v of carryTicks) {
        const yy = crisp(yCarry(v));
        svgEl('line', { x1: C.x0, x2: C.x1, y1: yy, y2: yy, class: v === 0 ? 'zero' : 'hgrid' }, grid);
        svgText(grid, C.x0 - 8, yy + 4, v === 0 ? '0' : rateText(v, digits), { class: 'tick', 'text-anchor': 'end' });
      }
    }
    for (const v of logTicks(10 ** (lo - pad), 10 ** (hi + pad), narrow ? 4 : 5)) {
      const yy = crisp(yPrice(v));
      svgEl('line', { x1: A.x0, x2: A.x1, y1: yy, y2: yy, class: 'hgrid' }, grid);
      svgText(grid, A.x0 - 8, yy + 4, priceTick(v), { class: 'tick', 'text-anchor': 'end' });
    }
    if (yPos) {
      const digits = state.unit === 'pct' && posStep < 1 ? 1 : 0;
      for (const v of posTicks) {
        const yy = crisp(yPos(v));
        svgEl('line', { x1: B.x0, x2: B.x1, y1: yy, y2: yy, class: v === 0 ? 'zero' : 'hgrid' }, grid);
        const label = v === 0 ? '0' : state.unit === 'pct' ? `${signed(v, digits)}${NBSP}%` : signed(v);
        svgText(grid, B.x0 - 8, yy + 4, label, { class: 'tick', 'text-anchor': 'end' });
      }
    }
    svgText(svg, A.x0, A.y0 - 10, 'Prix du bitcoin (BTCUSDT, échelle log.)', { class: 'panel-title' });
    const posTitle = state.visible.lf ? 'Positions nettes, et courts bruts des hedge funds' : 'Position nette';
    svgText(svg, B.x0, B.y0 - 12, `${posTitle}, ${state.unit === 'pct' ? 'en % de l’intérêt ouvert' : 'en contrats'}`, {
      class: 'panel-title',
    });
    svgText(
      svg,
      C.x0,
      C.y0 - 12,
      narrow ? 'Prime CME et taux à 3 mois, % par an' : 'Prime des futures CME (2e contrat / 1er, annualisée) et taux US à 3 mois, en % par an',
      { class: 'panel-title' },
    );

    // Lignes.
    const gA = svgEl('g', { 'clip-path': 'url(#clip-a)' }, svg);
    svgEl('path', { d: pathOf(pricePts.map(([d, c]) => [x(d), yPrice(c)] as const)), class: 'line stroke-price' }, gA);
    const gB = svgEl('g', { 'clip-path': 'url(#clip-b)' }, svg);
    // Repères McClellan : sur une longue période, les six semaines tiennent en quelques pixels ;
    // on n'en dessine que ce qui reste lisible (espacement minimal), l'info-bulle et le tableau gardent le détail.
    const editionXs = state.layers.mcc ? inRange.filter((w) => w.edition).map((w) => x(w.t)) : [];
    let lastRule = -Infinity;
    for (const xx of editionXs) {
      if (xx - lastRule < 6) continue;
      lastRule = xx;
      svgEl('line', { x1: crisp(xx), x2: crisp(xx), y1: B.y0, y2: B.y1, class: 'mcc-rule' }, gB);
    }
    if (yPos) {
      const y = yPos;
      for (const s of shown) {
        const d = runsOf(withEdges, (w) => Number.isFinite(valueOf(w, s.key, state.unit)))
          .map((run) => pathOf(run.map((w) => [x(w.t), y(valueOf(w, s.key, state.unit))] as const)))
          .join('');
        svgEl('path', { d, class: `line stroke-${s.key}` }, gB);
      }
      if (state.layers.cross && state.visible.nc) {
        for (const w of inRange) {
          if (w.cross) svgEl('circle', { cx: x(w.t), cy: y(valueOf(w, 'nc', state.unit)), r: 4, class: 'dot fill-nc' }, gB);
        }
      }
    }
    let lastMark = -Infinity;
    for (const xx of editionXs) {
      if (xx - lastMark < 12) continue;
      lastMark = xx;
      svgEl('path', { d: diamondPath(xx, B.y1 - 8, 5), class: 'mcc-mark' }, svg);
    }

    const gC = svgEl('g', { 'clip-path': 'url(#clip-c)' }, svg);
    if (yCarry) {
      const y = yCarry;
      // Écart ombré quand la prime dépasse le taux : l'aire entre les deux courbes, gardée au-dessus du taux.
      if (state.carry.carry && state.carry.rate) {
        runsOf(withEdges, (w) => w.rates.carry !== null && w.rates.rate !== null).forEach((run, k) => {
          if (run.length < 2) return;
          const carryPts = run.map((w) => [x(w.t), y(w.rates.carry as number)] as const);
          const ratePts = run.map((w) => [x(w.t), y(w.rates.rate as number)] as const);
          const xFirst = (ratePts[0] as readonly [number, number])[0].toFixed(1);
          const xLast = (ratePts[ratePts.length - 1] as readonly [number, number])[0].toFixed(1);
          const cp = svgEl('clipPath', { id: `clip-excess-${k}` }, defs);
          svgEl('path', { d: `${pathOf(ratePts)}L${xLast},${C.y0 - 6}L${xFirst},${C.y0 - 6}Z` }, cp);
          svgEl('path', { d: `${pathOf([...carryPts, ...[...ratePts].reverse()])}Z`, class: 'excess-fill', 'clip-path': `url(#clip-excess-${k})` }, gC);
        });
      }
      for (const s of carryShown) {
        const d = runsOf(withEdges, (w) => w.rates[s.key] !== null)
          .map((run) => pathOf(run.map((w) => [x(w.t), y(w.rates[s.key] as number)] as const)))
          .join('');
        svgEl('path', { d, class: `line stroke-${s.key}` }, gC);
      }
    }

    // Fins de courbes : point et valeur (étiquettes directes, sauf sur écran étroit).
    const lastPrice = [...pricePts].reverse().find(([d]) => d <= t1);
    if (lastPrice) {
      const [d, c] = lastPrice;
      svgEl('circle', { cx: x(d), cy: yPrice(c), r: 4, class: 'dot fill-price' }, svg);
      if (!narrow) svgText(svg, x(d) + 9, yPrice(c) + 4, usd(c), { class: 'end-label' });
    }
    const lastWeek = inRange[inRange.length - 1];
    if (yPos && lastWeek) {
      const y = yPos;
      endLabels(
        shown.flatMap((s) => {
          const v = valueOf(lastWeek, s.key, state.unit);
          return Number.isFinite(v) ? [{ y: y(v), cls: s.key, text: seriesText(s.key, v, state.unit) }] : [];
        }),
        B,
        x(lastWeek.t),
        narrow,
      );
    }
    if (yCarry && lastWeek) {
      const y = yCarry;
      endLabels(
        carryShown.flatMap((s) => {
          const v = lastWeek.rates[s.key];
          return v === null ? [] : [{ y: y(v), cls: s.key, text: rateText(v) }];
        }),
        C,
        x(lastWeek.t),
        narrow,
      );
    }
    if (shown.length === 0) {
      svgText(svg, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 'Aucune catégorie affichée : cliquez sur une catégorie au-dessus.', {
        class: 'empty',
        'text-anchor': 'middle',
      });
    }
    if (carryShown.length === 0) {
      svgText(svg, (C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, 'Prime et taux masqués : cliquez sur l’un des deux au-dessus.', {
        class: 'empty',
        'text-anchor': 'middle',
      });
    }

    // Zone de survol et réticule.
    svgEl('rect', { x: A.x0, y: A.y0, width: A.x1 - A.x0, height: C.y1 - A.y0, class: 'hit' }, svg);
    svgEl('g', { class: 'crosshair', id: 'crosshair' }, svg);

    frame = { W, A, B, C, x, yPrice, yPos, yCarry, inRange, shown, carryShown };
    if (hoverDate && !inRange.some((w) => w.d === hoverDate)) hoverDate = null;
    desc.textContent =
      `Prix du bitcoin (échelle logarithmique) et position nette ${state.unit === 'pct' ? 'en % de l’intérêt ouvert' : 'en contrats'} ` +
      `${shown.length ? `des ${shown.map((s) => s.name.toLowerCase()).join(', ')}` : 'd’aucune catégorie'}, du ${frDate(range.from)} au ${frDate(range.to)}. ` +
      `${carryShown.length ? `En bas : ${carryShown.map((s) => s.name.toLowerCase()).join(' et ')}, en % par an.` : ''}`;
    drawCrosshair();
    updateControls();
    if (state.tableOpen) renderTable();
  }

  // ---------- Réticule et info-bulle ----------

  function drawCrosshair(announce = false): void {
    const layer = svg.querySelector('#crosshair');
    if (!layer || !frame) return;
    layer.replaceChildren();
    const w = hoverDate ? frame.inRange.find((wk) => wk.d === hoverDate) : undefined;
    if (!w) {
      tip.hidden = true;
      return;
    }
    const f = frame;
    const xx = f.x(w.t);
    svgEl('line', { x1: crisp(xx), x2: crisp(xx), y1: f.A.y0, y2: f.C.y1, class: 'xhair' }, layer);
    if (w.close !== undefined) svgEl('circle', { cx: xx, cy: f.yPrice(w.close), r: 4, class: 'dot fill-price' }, layer);
    if (f.yPos) {
      for (const s of f.shown) {
        const v = valueOf(w, s.key, state.unit);
        if (Number.isFinite(v)) svgEl('circle', { cx: xx, cy: f.yPos(v), r: 4, class: `dot fill-${s.key}` }, layer);
      }
    }
    if (f.yCarry) {
      for (const s of f.carryShown) {
        const v = w.rates[s.key];
        if (v !== null) svgEl('circle', { cx: xx, cy: f.yCarry(v), r: 4, class: `dot fill-${s.key}` }, layer);
      }
    }
    renderTip(w, xx, announce);
  }

  function renderTip(w: Week, xx: number, announce: boolean): void {
    const f = frame;
    if (!f) return;
    tip.replaceChildren();
    tip.append(htmlEl('div', 'tip-date', `Arrêté du ${weekdayOf(w.d)} ${frDate(w.d)} · ${w.pub ? `publié le ${frDayMonth(w.pub)}` : 'publication retardée (shutdown)'}`));
    if (w.close !== undefined) {
      const row = htmlEl('div', 'tip-row');
      row.append(keySvg('line', 'stroke-price', 14), htmlEl('strong', '', usd(w.close)), htmlEl('span', 'name', 'bitcoin, clôture du jour'));
      tip.append(row);
    }
    if (f.shown.length) tip.append(htmlEl('div', 'tip-sep'));
    for (const s of f.shown) {
      const v = valueOf(w, s.key, state.unit);
      if (!Number.isFinite(v)) continue;
      const row = htmlEl('div', 'tip-row');
      const detail =
        s.key === 'lf'
          ? `${state.unit === 'pct' ? `${plain(w.net.lf)} contrats` : `${plain(w.pct.lf, 2)}${NBSP}% de l’OI`} · positions courtes brutes, rapport TFF`
          : `${state.unit === 'pct' ? `${signed(w.net[s.key])} contrats` : `${pctText(w.pct[s.key], 2)} de l’OI`} · ` +
            `longs ${plain(w.long[s.key])}, courts ${plain(w.short[s.key])}`;
      row.append(
        keySvg('line', `stroke-${s.key}`, 14),
        htmlEl('strong', '', seriesText(s.key, v, state.unit, 2)),
        htmlEl('span', 'name', s.name),
        htmlEl('small', '', detail),
      );
      tip.append(row);
    }
    if (f.carryShown.length) tip.append(htmlEl('div', 'tip-sep'));
    for (const s of f.carryShown) {
      const v = w.rates[s.key];
      const row = htmlEl('div', 'tip-row');
      row.append(
        keySvg('line', `stroke-${s.key}`, 14),
        htmlEl('strong', '', v === null ? '—' : rateText(v, 2)),
        htmlEl('span', 'name', s.key === 'carry' ? 'prime des futures CME, par an' : 'taux US à 3 mois'),
      );
      const ex = excessOf(w);
      if (s.key === 'carry' && ex !== null) row.append(htmlEl('small', '', `écart avec le taux à 3 mois : ${signed(ex, 2)}${NBSP}pt`));
      tip.append(row);
    }
    if (w.cross && state.layers.cross) {
      const flag = htmlEl('div', 'tip-flag');
      flag.append(htmlEl('strong', '', 'Passage net short'), document.createTextNode(' des non-commerciaux cette semaine.'));
      tip.append(flag);
    }
    if (w.edition && state.layers.mcc) {
      const note = htmlEl('div', 'tip-note');
      note.append(
        htmlEl('strong', '', `McClellan, édition du ${frDayMonth(w.edition.edition)}`),
        document.createTextNode(` : ${w.edition.lecture} (sens : ${w.edition.sens}).`),
      );
      tip.append(note);
    }
    tip.hidden = false;
    const tw = tip.offsetWidth;
    let left = xx + 14;
    if (left + tw > f.W - 4) left = xx - 14 - tw;
    tip.style.left = `${Math.max(4, Math.min(left, f.W - tw - 4))}px`;
    if (announce) live.textContent = tip.textContent ?? '';
  }

  function nearestWeek(t: number): Week | undefined {
    const list = frame?.inRange ?? [];
    let lo = 0;
    let hi = list.length - 1;
    if (hi < 0) return undefined;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((list[mid] as Week).t < t) lo = mid;
      else hi = mid;
    }
    const a = list[lo] as Week;
    const b = list[hi] as Week;
    return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
  }

  function onPointer(ev: PointerEvent): void {
    if (!frame) return;
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * frame.W;
    const { A } = frame;
    const range = rangeOf(state.range);
    const t0 = toDay(range.from);
    const t1 = toDay(range.to);
    const t = t0 + ((Math.min(Math.max(px, A.x0), A.x1) - A.x0) / (A.x1 - A.x0)) * (t1 - t0);
    const w = nearestWeek(t);
    if (w && w.d !== hoverDate) {
      hoverDate = w.d;
      drawCrosshair();
    }
  }

  svg.addEventListener('pointermove', onPointer);
  svg.addEventListener('pointerdown', onPointer);
  svg.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType === 'touch') return; // au doigt, la lecture reste affichée jusqu'au prochain toucher
    hoverDate = null;
    drawCrosshair();
  });

  plot.addEventListener('keydown', (ev) => {
    const list = frame?.inRange ?? [];
    if (list.length === 0) return;
    let i = hoverDate ? list.findIndex((w) => w.d === hoverDate) : list.length - 1;
    if (i < 0) i = list.length - 1;
    const stepSize = ev.shiftKey ? 4 : 1;
    if (ev.key === 'ArrowLeft') i = Math.max(0, i - stepSize);
    else if (ev.key === 'ArrowRight') i = Math.min(list.length - 1, i + stepSize);
    else if (ev.key === 'Home') i = 0;
    else if (ev.key === 'End') i = list.length - 1;
    else if (ev.key === 'Escape') {
      hoverDate = null;
      drawCrosshair();
      return;
    } else return;
    ev.preventDefault();
    hoverDate = (list[i] as Week).d;
    drawCrosshair(true);
  });
  plot.addEventListener('focus', () => {
    const list = frame?.inRange ?? [];
    if (!hoverDate && list.length) {
      hoverDate = (list[list.length - 1] as Week).d;
      drawCrosshair(true);
    }
  });
  plot.addEventListener('blur', () => {
    hoverDate = null;
    drawCrosshair();
  });

  // ---------- Commandes ----------

  function buildControls(): void {
    for (const r of DATA.ranges) {
      const b = htmlEl('button', '', r.label);
      b.type = 'button';
      b.dataset['range'] = r.key;
      b.title = `Du ${frDate(r.from)} au ${frDate(r.to)}`;
      b.addEventListener('click', () => setRange(r.key));
      rangesBox.append(b);
    }
    for (const b of unitsBox.querySelectorAll<HTMLButtonElement>('button[data-unit]')) {
      b.addEventListener('click', () => {
        state.unit = b.dataset['unit'] === 'ctr' ? 'ctr' : 'pct';
        saveState();
        render();
      });
    }
    for (const s of SERIES) {
      const b = htmlEl('button', 'chip');
      b.type = 'button';
      b.dataset['series'] = s.key;
      const label = htmlEl('span');
      label.append(document.createTextNode(s.name), htmlEl('span', 'sub', s.sub));
      b.append(keySvg('line', `stroke-${s.key}`), label);
      b.addEventListener('click', () => {
        state.visible[s.key] = !state.visible[s.key];
        saveState();
        render();
      });
      legend.append(b);
    }
    legend.append(htmlEl('span', 'legend-sep'));
    for (const s of CARRY_SERIES) {
      const b = htmlEl('button', 'chip');
      b.type = 'button';
      b.dataset['carry'] = s.key;
      const label = htmlEl('span');
      label.append(document.createTextNode(s.name), htmlEl('span', 'sub', s.sub));
      b.append(keySvg('line', `stroke-${s.key}`), label);
      b.addEventListener('click', () => {
        state.carry[s.key] = !state.carry[s.key];
        saveState();
        render();
      });
      legend.append(b);
    }
    legend.append(htmlEl('span', 'legend-sep'), htmlEl('span', 'legend-label', 'Repères'));
    for (const l of LAYERS) {
      const b = htmlEl('button', 'chip small');
      b.type = 'button';
      b.dataset['layer'] = l.key;
      b.append(l.key === 'cross' ? keySvg('dot', 'fill-nc', 12) : keySvg('diamond', '', 12), document.createTextNode(l.name));
      b.addEventListener('click', () => {
        state.layers[l.key] = !state.layers[l.key];
        saveState();
        render();
      });
      legend.append(b);
    }
    tableToggle.addEventListener('click', () => {
      state.tableOpen = !state.tableOpen;
      tableWrap.hidden = !state.tableOpen;
      if (state.tableOpen) renderTable();
      updateControls();
    });

    const guide = byId<HTMLDivElement>('guide');
    for (const g of DATA.guide) {
      const item = htmlEl('div', 'guide-item');
      if (g.range) item.dataset['range'] = g.range;
      item.append(htmlEl('span', 'period', g.period), htmlEl('p', '', g.text));
      if (g.range) {
        const rk = g.range;
        const b = htmlEl('button', 'link-btn', 'Afficher cette période');
        b.type = 'button';
        b.addEventListener('click', () => {
          setRange(rk);
          card.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        });
        item.append(b);
      } else {
        item.append(htmlEl('span'));
      }
      guide.append(item);
    }

    const lastPrice = DATA.closes[DATA.closes.length - 1];
    byId('asof').textContent =
      `Dernier rapport : positions arrêtées le ${frDate(DATA.lastAsOf)}` +
      `${DATA.lastPublication ? `, publiées le ${frDate(DATA.lastPublication)}` : ''}` +
      ` · bitcoin ${lastPrice !== undefined ? usd(lastPrice) : '—'} à la clôture du ${frDate(isoOfDay(priceEnd))}.`;
    byId('source').textContent =
      `Données COT : ${DATA.cotSource}. Hedge funds : ${DATA.tffSource}. Prix : ${DATA.priceSource}. ` +
      `Prime des futures : ${DATA.carrySource}.`;
  }

  function setRange(key: RangeKey): void {
    state.range = key;
    hoverDate = null;
    saveState();
    render();
  }

  function updateControls(): void {
    for (const b of rangesBox.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(b.dataset['range'] === state.range));
    for (const b of unitsBox.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(b.dataset['unit'] === state.unit));
    for (const b of legend.querySelectorAll<HTMLButtonElement>('button[data-series]')) {
      b.setAttribute('aria-pressed', String(state.visible[b.dataset['series'] as SeriesKey]));
    }
    for (const b of legend.querySelectorAll<HTMLButtonElement>('button[data-carry]')) {
      b.setAttribute('aria-pressed', String(state.carry[b.dataset['carry'] as CarryKey]));
    }
    for (const b of legend.querySelectorAll<HTMLButtonElement>('button[data-layer]')) {
      const key = b.dataset['layer'] as LayerKey;
      b.setAttribute('aria-pressed', String(state.layers[key]));
      b.disabled = key === 'cross' && !state.visible.nc;
      b.title = b.disabled ? 'Affichez les non-commerciaux pour voir leurs passages en net short' : '';
    }
    for (const item of document.querySelectorAll<HTMLElement>('.guide-item')) item.classList.toggle('is-active', item.dataset['range'] === state.range);
    const n = frame?.inRange.length ?? 0;
    tableToggle.textContent = state.tableOpen ? 'Masquer le tableau' : `Afficher le tableau (${n} semaines)`;
    tableToggle.setAttribute('aria-expanded', String(state.tableOpen));
    tableWrap.hidden = !state.tableOpen;
  }

  // ---------- Tableau (jumeau accessible du graphique) ----------

  function renderTable(): void {
    const f = frame;
    if (!f) return;
    const range = rangeOf(state.range);
    const unitLabel = state.unit === 'pct' ? '% OI' : 'contrats';
    const showExcess = state.carry.carry && state.carry.rate;
    byId('table-caption').textContent =
      `Semaines du ${frDate(range.from)} au ${frDate(range.to)}, de la plus récente à la plus ancienne. ` +
      `Positions nettes calculées (${state.unit === 'pct' ? 'en % de l’intérêt ouvert' : 'en contrats'})` +
      `${f.carryShown.length ? ' ; prime des futures calculée, taux publié, en % par an' : ''}.`;
    const head = htmlEl('tr');
    for (const h of [
      'Arrêté',
      'Bitcoin',
      ...f.shown.map((s) => `${s.short} (${unitLabel})`),
      ...f.carryShown.map((s) => `${s.short} (% par an)`),
      ...(showExcess ? ['Écart (points)'] : []),
      'Intérêt ouvert',
      'Repère',
    ]) {
      const th = htmlEl('th', '', h);
      th.scope = 'col';
      head.append(th);
    }
    table.tHead?.replaceChildren(head);
    const body = table.tBodies[0];
    if (!body) return;
    const rows: HTMLTableRowElement[] = [];
    for (const w of [...f.inRange].reverse()) {
      const tr = htmlEl('tr');
      const marks = [w.cross ? 'passage net short' : '', w.edition ? `McClellan ${frDayMonth(w.edition.edition)}` : ''].filter(Boolean).join(' · ');
      const ex = excessOf(w);
      for (const cell of [
        frDate(w.d),
        w.close !== undefined ? usd(w.close) : '—',
        ...f.shown.map((s) => {
          const v = valueOf(w, s.key, state.unit);
          return Number.isFinite(v) ? seriesText(s.key, v, state.unit, 2) : '—';
        }),
        ...f.carryShown.map((s) => {
          const v = w.rates[s.key];
          return v === null ? '—' : rateText(v, 2);
        }),
        ...(showExcess ? [ex === null ? '—' : signed(ex, 2)] : []),
        plain(w.oi),
        marks,
      ]) {
        tr.append(htmlEl('td', '', cell));
      }
      rows.push(tr);
    }
    body.replaceChildren(...rows);
  }

  // ---------- Démarrage ----------

  buildControls();
  render();
  new ResizeObserver(() => {
    if (Math.round(plot.clientWidth) !== lastWidth) render();
  }).observe(plot);
})();
