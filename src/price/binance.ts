// Bougies quotidiennes BTCUSDT depuis l'API publique de Binance (sans clé).
// Même source que BINANCE:BTCUSDT sur TradingView : bougie du jour J = 00:00 → 23:59:59 UTC.

import type { PriceBar } from '../types.ts';

const HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision'] as const;
const DAY_MS = 86_400_000;

type Kline = [number, string, string, string, string, string, number, ...unknown[]];

async function getKlines(
  host: string,
  symbol: string,
  startTime: number,
  fetchImpl: typeof fetch,
): Promise<Kline[]> {
  const url = `${host}/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&limit=1000`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Binance ${res.status} ${res.statusText} pour ${url}`);
  return (await res.json()) as Kline[];
}

/** Télécharge les bougies quotidiennes complètes (la bougie du jour, non close, est écartée). */
export async function fetchBinanceDaily(
  symbol = 'BTCUSDT',
  from = '2018-01-01',
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<PriceBar[]> {
  let lastError: unknown;
  for (const host of HOSTS) {
    try {
      const bars: PriceBar[] = [];
      let start = Date.parse(`${from}T00:00:00Z`);
      for (;;) {
        const page = await getKlines(host, symbol, start, fetchImpl);
        for (const k of page) {
          if (k[6] >= now) continue; // bougie en cours
          bars.push({
            date: new Date(k[0]).toISOString().slice(0, 10),
            open: Number(k[1]),
            high: Number(k[2]),
            low: Number(k[3]),
            close: Number(k[4]),
          });
        }
        const lastK = page[page.length - 1];
        if (page.length < 1000 || !lastK) break;
        start = lastK[0] + DAY_MS;
      }
      return bars;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
