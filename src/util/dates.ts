// Dates manipulées comme chaînes ISO « AAAA-MM-JJ » en UTC : pas de fuseau, pas d'heure.

const DAY_MS = 86_400_000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertISODate(s: string): string {
  if (!ISO_RE.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new Error(`Date ISO invalide : « ${s} »`);
  }
  return s;
}

export function toEpochDay(iso: string): number {
  return Date.parse(`${assertISODate(iso)}T00:00:00Z`) / DAY_MS;
}

export function fromEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function fromUnixSeconds(t: number): string {
  return new Date(t * 1000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return fromEpochDay(toEpochDay(iso) + n);
}

export function daysBetween(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** 0 = dimanche … 6 = samedi. */
export function weekday(iso: string): number {
  return new Date(`${assertISODate(iso)}T00:00:00Z`).getUTCDay();
}

/** Dernier jour du mois `month` (1-12). */
export function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** « 2026-09-04 » → « 04/09/2026 ». */
export function frDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
