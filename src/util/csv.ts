// CSV minimal conforme RFC 4180 : champs entre guillemets, guillemets doublés, CRLF.
// Suffisant pour les exports de la CFTC (« BITCOIN - CHICAGO MERCANTILE EXCHANGE » contient des virgules
// dans d'autres marchés) et pour nos propres fichiers.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // BOM des exports « bom=true »

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

/** Lit un CSV avec en-tête en objets clé → valeur (chaînes brutes). */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  return body.map((cells) => {
    const rec: Record<string, string> = {};
    header.forEach((h, j) => {
      rec[h] = cells[j] ?? '';
    });
    return rec;
  });
}

function quote(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export type CsvValue = string | number | boolean | null | undefined;

/** Sérialise des lignes ; `null`/`undefined` deviennent des cellules vides. */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const cell = (v: CsvValue) => (v === null || v === undefined ? '' : quote(String(v)));
  return [header.map(quote).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';
}
