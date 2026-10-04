// Shared market data helpers for the API endpoints.
//   Prices and daily closes: Yahoo Finance chart API.
//   Market caps: share counts implied by Nasdaq's published market cap (refreshed every 12 hours),
//   multiplied by the live price. Falls back to the share counts in roster.js.
import { COVERED, ETFS } from "./roster.js";

const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://finance.yahoo.com" };
const NASDAQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};
const SHARES_TTL = 12 * 60 * 60 * 1000;
const sharesCache = {};

export async function yahooChart(symbol, range = "7d") {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`, { headers: YAHOO_HEADERS });
    return (await res.json())?.chart?.result?.[0] || null;
  } catch {
    return null;
  }
}

async function nasdaqMarketCap(symbol) {
  const assetclass = ETFS[symbol] ? "etf" : "stocks";
  try {
    const res = await fetch(`https://api.nasdaq.com/api/quote/${symbol}/summary?assetclass=${assetclass}`, { headers: NASDAQ_HEADERS });
    const sd = (await res.json())?.data?.summaryData || {};
    const raw = sd.MarketCap?.value || sd.MarketCapitalization?.value || "";
    const n = Number(String(raw).replace(/[$,]/g, ""));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

// Shares outstanding for market cap. Derived from Nasdaq's market cap at the current price.
export async function sharesFor(symbol, price) {
  const hit = sharesCache[symbol];
  if (hit && Date.now() - hit.ts < SHARES_TTL) return hit.shares;
  const fallback = COVERED[symbol]?.shares || ETFS[symbol]?.shares || null;
  const cap = price ? await nasdaqMarketCap(symbol) : null;
  const shares = cap ? cap / price : fallback;
  if (shares) sharesCache[symbol] = { shares, ts: cap ? Date.now() : Date.now() - SHARES_TTL + 15 * 60 * 1000 }; // retry fallbacks after 15 min
  return shares;
}

// Turn a Yahoo chart result into the fields the site uses.
export function summarize(result) {
  const meta = result?.meta;
  if (!meta) return null;
  const closes = result.indicators?.quote?.[0]?.close?.filter((c) => c != null) || [];
  const price = meta.regularMarketPrice ?? closes[closes.length - 1];
  if (price == null) return null;
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose;
  return {
    price,
    prevClose: prevClose ?? null,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    volume: meta.regularMarketVolume || 0,
    spark: closes,
  };
}
