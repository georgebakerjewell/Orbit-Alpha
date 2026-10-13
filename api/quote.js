// Price history for one symbol (used by the stock page chart).
//   GET /api/quote?ticker=RKLB&range=6mo   (1d | 5d | 7d | 1mo | 3mo | 6mo | ytd | 1y)
// 1d and 5d use intraday prices (5 and 30 minute bars); longer ranges use daily closes.
// Returns Yahoo's chart format, with meta.marketCap and meta.regularMarketChangePercent filled in.
//   GET /api/quote?ticker=RKLB&stats=1
// Key stats from a year of daily closes (52-week range, YTD and 1-year return, volume) for the stock,
// its sector peers and the UFO space ETF. Kept in this file to stay inside Vercel's free function limit.
import { ROSTER, ETF_TICKERS, BENCHMARKS, COVERED } from "../lib/roster.js";
import { yahooChart, marketCapUsd, summarize } from "../lib/market.js";

const RANGES = new Set(["1d", "5d", "7d", "1mo", "3mo", "6mo", "ytd", "1y"]);
const INTRADAY = { "1d": "5m", "5d": "30m" };
const ALLOWED = new Set([...ROSTER, ...ETF_TICKERS, ...Object.keys(BENCHMARKS)]);

const ret = (to, from) => (to != null && from ? Math.round((to / from - 1) * 1000) / 10 : null);
const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round(((v[m - 1] + v[m]) / 2) * 10) / 10;
};

// Returns and range from one year of daily bars.
export function yearStats(result, now = new Date()) {
  const q = result?.indicators?.quote?.[0] || {};
  const rows = (result?.timestamp || []).map((t, i) => ({ d: new Date(t * 1000), c: q.close?.[i], h: q.high?.[i], l: q.low?.[i], v: q.volume?.[i] })).filter((r) => r.c != null);
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1];
  const jan1 = Date.UTC(now.getUTCFullYear(), 0, 1);
  const before = rows.filter((r) => r.d.getTime() < jan1);
  const ytdBase = before.length ? before[before.length - 1].c : rows[0].c;
  const high = Math.max(...rows.map((r) => r.h ?? r.c));
  const low = Math.min(...rows.map((r) => r.l ?? r.c));
  const vols = rows.slice(-63).map((r) => r.v).filter((v) => v != null);
  const price = result.meta?.regularMarketPrice ?? last.c;
  return {
    price,
    high52: high,
    low52: low,
    fromHigh: ret(price, high),
    ytd: ret(price, ytdBase),
    y1: ret(price, rows[0].c),
    avgVol: vols.length ? Math.round(vols.reduce((a, b) => a + b, 0) / vols.length) : null,
    vol: last.v ?? null,
    days: rows.length,
    currency: result.meta?.currency || "USD",
  };
}

async function keyStats(symbol) {
  const sector = COVERED[symbol]?.sector;
  const peers = sector ? Object.keys(COVERED).filter((t) => COVERED[t].sector === sector) : [symbol];
  const symbols = [...new Set([symbol, ...peers, "UFO"])];
  const charts = await Promise.all(symbols.map((s) => yahooChart(s, "1y", "1d")));
  const by = Object.fromEntries(symbols.map((s, i) => [s, yearStats(charts[i])]));
  const peerRows = peers.map((t) => ({ ticker: t, name: COVERED[t].name, ytd: by[t]?.ytd ?? null, y1: by[t]?.y1 ?? null, fromHigh: by[t]?.fromHigh ?? null }));
  return {
    ticker: symbol,
    sector: sector || null,
    stats: by[symbol],
    ufo: by.UFO ? { ytd: by.UFO.ytd, y1: by.UFO.y1 } : null,
    sectorMedian: { ytd: median(peerRows.map((p) => p.ytd)), y1: median(peerRows.map((p) => p.y1)), count: peerRows.length },
    peers: peerRows,
    asOf: new Date().toISOString().slice(0, 10),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const symbol = String(req.query.ticker || "").toUpperCase();
  if (!ALLOWED.has(symbol)) return res.status(400).json({ error: "Unknown ticker" });
  if (req.query.stats) {
    if (!COVERED[symbol]) return res.status(400).json({ error: "Unknown ticker" });
    const data = await keyStats(symbol);
    if (!data.stats) return res.status(502).json({ error: "No data" });
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json(data);
  }
  const range = RANGES.has(req.query.range) ? req.query.range : "7d";

  const result = await yahooChart(symbol, range, INTRADAY[range] || "1d");
  if (!result?.meta) return res.status(502).json({ error: "No data" });

  // Daily change and market cap always come from the last two daily closes, whatever the chart range.
  const daily = summarize(range === "7d" ? result : await yahooChart(symbol, "7d"));
  if (daily) {
    result.meta.regularMarketChangePercent = daily.changePct;
    const cap = await marketCapUsd(symbol, daily.price, daily.currency);
    if (cap) result.meta.marketCap = cap; // always US dollars
  }
  res.setHeader("Cache-Control", INTRADAY[range] ? "s-maxage=60, stale-while-revalidate=300" : "s-maxage=120, stale-while-revalidate=600");
  res.status(200).json({ chart: { result: [result] } });
}
