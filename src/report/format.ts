// Mise en forme française des nombres et tableaux Markdown.

const nf = (digits: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function num(x: number | null | undefined, digits = 0): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return nf(digits).format(x).replace(/ /g, ' ');
}

export function signed(x: number | null | undefined, digits = 0): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), digits)}`;
}

/** Pourcentage signé : 12.3 → « +12,3 % ». */
export function pctS(x: number | null | undefined, digits = 1): string {
  const s = signed(x, digits);
  return s === '—' ? s : `${s} %`;
}

/** Part (0-1) en pourcentage entier : 0.574 → « 57 % ». */
export function share(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return `${num(x * 100, 0)} %`;
}

/** Rang percentile (0-1) → « 4,4e centile ». */
export function centile(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return `${num(x * 100, 1)}e centile`;
}

export function pValue(p: number): string {
  if (Number.isNaN(p)) return '—';
  return p < 0.001 ? '< 0,001' : num(p, 3);
}

export function mdTable(header: readonly string[], rows: readonly (readonly string[])[], align?: readonly ('l' | 'r')[]): string {
  const sep = header.map((_, i) => ((align?.[i] ?? 'l') === 'r' ? '---:' : '---'));
  const line = (cells: readonly string[]) => `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;
  return [line(header), line(sep), ...rows.map(line)].join('\n');
}
