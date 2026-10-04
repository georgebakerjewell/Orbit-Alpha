// Price history for one symbol (used by the stock page chart).
//   GET /api/quote?ticker=RKLB&range=6mo   (1d | 5d | 7d | 1mo | 3mo | 6mo | ytd | 1y)
// 1d and 5d use intraday prices (5 and 30 minute bars); longer ranges use daily closes.
// Returns Yahoo's chart format, with meta.marketCap and meta.regularMarketChangePercent filled in.
import { ROSTER, ETF_TICKERS, BENCHMARKS } from "../lib/roster.js";
import { yahooChart, sharesFor, summarize } from "../lib/market.js";

const RANGES = new Set(["1d", "5d", "7d", "1mo", "3mo", "6mo", "ytd", "1y"]);
const INTRADAY = { "1d": "5m", "5d": "30m" };
const ALLOWED = new Set([...ROSTER, ...ETF_TICKERS, ...Object.keys(BENCHMARKS)]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const symbol = String(req.query.ticker || "").toUpperCase();
  if (!ALLOWED.has(symbol)) return res.status(400).json({ error: "Unknown ticker" });
  const range = RANGES.has(req.query.range) ? req.query.range : "7d";

  const result = await yahooChart(symbol, range, INTRADAY[range] || "1d");
  if (!result?.meta) return res.status(502).json({ error: "No data" });

  // Daily change and market cap always come from the last two daily closes, whatever the chart range.
  const daily = summarize(range === "7d" ? result : await yahooChart(symbol, "7d"));
  if (daily) {
    result.meta.regularMarketChangePercent = daily.changePct;
    const shares = await sharesFor(symbol, daily.price);
    if (shares) result.meta.marketCap = shares * daily.price;
  }
  res.setHeader("Cache-Control", INTRADAY[range] ? "s-maxage=60, stale-while-revalidate=300" : "s-maxage=120, stale-while-revalidate=600");
  res.status(200).json({ chart: { result: [result] } });
}
