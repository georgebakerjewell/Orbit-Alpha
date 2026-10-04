// All live prices in one request (replaces ~35 separate /api/quote calls per visit).
//   GET /api/quotes                 -> every covered stock and space ETF
//   GET /api/quotes?symbols=RKLB,PL -> just those (must be covered stocks, ETFs or benchmarks)
// Cached at Vercel's edge for 60 seconds, so all visitors share one fetch.
import { ROSTER, ETF_TICKERS, BENCHMARKS } from "../lib/roster.js";
import { yahooChart, sharesFor, summarize } from "../lib/market.js";

const ALLOWED = new Set([...ROSTER, ...ETF_TICKERS, ...Object.keys(BENCHMARKS)]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const requested = req.query.symbols
    ? String(req.query.symbols).toUpperCase().split(",").filter((s) => ALLOWED.has(s))
    : [...ROSTER, ...ETF_TICKERS];

  const quotes = {};
  await Promise.all(
    requested.map(async (symbol) => {
      const q = summarize(await yahooChart(symbol, "7d"));
      if (!q) return;
      const shares = await sharesFor(symbol, q.price);
      quotes[symbol] = { ...q, marketCap: shares ? shares * q.price : null };
    })
  );

  const complete = Object.keys(quotes).length === requested.length;
  res.setHeader("Cache-Control", complete ? "s-maxage=60, stale-while-revalidate=300" : "s-maxage=15");
  res.status(200).json({ asOf: new Date().toISOString(), quotes });
}
