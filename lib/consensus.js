// Analyst consensus for every covered stock: price targets, buy/hold/sell split and the
// consensus EPS and revenue estimates for the current quarter and year.
//   Primary source: Yahoo Finance quoteSummary (financialData, recommendationTrend, earningsTrend).
//   Fallback for US listings Yahoo has nothing for: Nasdaq's analyst price-target summary.
// Served by /api/quote?consensus=1 (kept in that file to stay inside Vercel's free function limit)
// and baked into the static pages by scripts/prerender.mjs.
import { ROSTER, yahooSymbol, isForeign } from "./roster.js";
import { yahooChart, summarize } from "./market.js";

// Below this many analysts the figure is one or two opinions, not a consensus: pages label it as such
// and leave it out of the ranking.
export const MIN_ANALYSTS = 3;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const NASDAQ_HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};
const raw = (x) => (x && typeof x === "object" ? x.raw ?? null : typeof x === "number" ? x : null);
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const timeout = (ms) => AbortSignal.timeout(ms);

/* ── Yahoo session (cookie + crumb, required by quoteSummary since 2023) ───────── */
let session = null;
async function yahooSession(force = false) {
  if (!force && session && Date.now() - session.ts < 6 * 60 * 60 * 1000) return session;
  try {
    const r = await fetch("https://fc.yahoo.com/", { headers: { "User-Agent": UA }, redirect: "manual", signal: timeout(6000) });
    const set = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [r.headers.get("set-cookie")];
    const cookie = set.filter(Boolean).map((c) => c.split(";")[0]).join("; ");
    for (const host of ["query2", "query1"]) {
      const c = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, { headers: { "User-Agent": UA, Cookie: cookie }, signal: timeout(6000) });
      const crumb = (await c.text()).trim();
      if (c.ok && crumb && crumb.length < 40 && !crumb.includes("<")) return (session = { cookie, crumb, ts: Date.now() });
    }
  } catch {}
  return null;
}

async function quoteSummary(symbol) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await yahooSession(attempt > 0);
    if (!s) return null;
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=financialData,recommendationTrend,earningsTrend,price&crumb=${encodeURIComponent(s.crumb)}`;
      const r = await fetch(url, { headers: { "User-Agent": UA, Cookie: s.cookie, Accept: "application/json" }, signal: timeout(8000) });
      if (r.status === 401 || r.status === 403) continue; // stale crumb: get a new one and retry once
      return (await r.json())?.quoteSummary?.result?.[0] || null;
    } catch {
      return null;
    }
  }
  return null;
}

// One estimate row ("0q" current quarter, "0y" current fiscal year, "+1y" next year).
function estimate(trend, period) {
  const row = (trend || []).find((x) => x.period === period);
  if (!row) return null;
  const eps = raw(row.earningsEstimate?.avg), rev = raw(row.revenueEstimate?.avg);
  if (eps == null && rev == null) return null;
  return {
    end: row.endDate || null,
    eps, epsAnalysts: raw(row.earningsEstimate?.numberOfAnalysts),
    epsYearAgo: raw(row.earningsEstimate?.yearAgoEps),
    revenue: rev, revenueAnalysts: raw(row.revenueEstimate?.numberOfAnalysts),
    revenueYearAgo: raw(row.revenueEstimate?.yearAgoRevenue),
  };
}

export function fromYahoo(ticker, r) {
  const fd = r?.financialData || {};
  const mean = raw(fd.targetMeanPrice), price = raw(fd.currentPrice) ?? raw(r?.price?.regularMarketPrice);
  const now = (r?.recommendationTrend?.trend || []).find((x) => x.period === "0m");
  const split = now ? { strongBuy: now.strongBuy || 0, buy: now.buy || 0, hold: now.hold || 0, sell: now.sell || 0, strongSell: now.strongSell || 0 } : null;
  const splitTotal = split ? Object.values(split).reduce((a, b) => a + b, 0) : 0;
  const trend = r?.earningsTrend?.trend;
  const est = { quarter: estimate(trend, "0q"), year: estimate(trend, "0y"), nextYear: estimate(trend, "+1y") };
  if (mean == null && !splitTotal && !est.quarter && !est.year) return null;
  return {
    ticker,
    source: "Yahoo Finance",
    currency: r?.price?.currency || null, // targets are in the trading currency (pence for London listings)
    reportingCurrency: fd.financialCurrency || null, // EPS and revenue estimates
    price,
    target: mean != null ? { mean, median: raw(fd.targetMedianPrice), high: raw(fd.targetHighPrice), low: raw(fd.targetLowPrice) } : null,
    upside: mean != null && price ? Math.round((mean / price - 1) * 1000) / 10 : null,
    analysts: raw(fd.numberOfAnalystOpinions) || splitTotal || null,
    rating: fd.recommendationKey && fd.recommendationKey !== "none" ? { key: fd.recommendationKey, mean: raw(fd.recommendationMean) } : null,
    split: splitTotal ? split : null,
    estimates: est,
  };
}

// Nasdaq's analyst summary: consensus target, range and buy/hold/sell counts (US listings only).
export function fromNasdaq(ticker, json, price) {
  const c = json?.data?.consensusOverview;
  const mean = num(c?.priceTarget);
  if (mean == null) return null;
  const buy = Number(c.buy) || 0, hold = Number(c.hold) || 0, sell = Number(c.sell) || 0;
  return {
    ticker,
    source: "Nasdaq",
    currency: "USD",
    reportingCurrency: null,
    price: price ?? null,
    target: { mean, median: null, high: num(c.highPriceTarget), low: num(c.lowPriceTarget) },
    upside: price ? Math.round((mean / price - 1) * 1000) / 10 : null,
    analysts: buy + hold + sell || null,
    rating: null,
    split: buy + hold + sell ? { strongBuy: 0, buy, hold, sell, strongSell: 0 } : null,
    estimates: { quarter: null, year: null, nextYear: null },
  };
}

async function nasdaq(ticker) {
  try {
    const [r, chart] = await Promise.all([
      fetch(`https://api.nasdaq.com/api/analyst/${ticker}/targetprice`, { headers: NASDAQ_HEADERS, signal: timeout(8000) }).then((x) => x.json()),
      yahooChart(ticker, "5d"),
    ]);
    return fromNasdaq(ticker, r, summarize(chart)?.price);
  } catch {
    return null;
  }
}

async function one(ticker) {
  const y = fromYahoo(ticker, await quoteSummary(yahooSymbol(ticker)));
  if (y?.target || isForeign(ticker)) return y;
  const n = await nasdaq(ticker);
  if (!n) return y;
  // Keep Yahoo's estimates if it had them and only the target was missing.
  return y ? { ...n, estimates: y.estimates, reportingCurrency: y.reportingCurrency } : n;
}

const TTL = 6 * 60 * 60 * 1000;
let cache = null;

// Every covered stock, keyed by ticker. Stocks with no analyst coverage are left out.
export async function allConsensus() {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;
  const out = {};
  // Small batches, so Yahoo doesn't rate-limit a burst of 30+ requests.
  for (let i = 0; i < ROSTER.length; i += 8) {
    const batch = ROSTER.slice(i, i + 8);
    const res = await Promise.all(batch.map(one));
    batch.forEach((t, j) => { if (res[j]) out[t] = res[j]; });
  }
  const data = { asOf: new Date().toISOString(), minAnalysts: MIN_ANALYSTS, stocks: out };
  if (Object.keys(out).length >= 5) cache = { ts: Date.now(), data }; // don't cache an outage for 6 hours
  return data;
}

// Plain-language rating for page text: Yahoo's label, or the majority of the buy/hold/sell split.
const RATING_LABEL = { strong_buy: "Strong buy", buy: "Buy", hold: "Hold", underperform: "Underperform", sell: "Sell", strong_sell: "Strong sell" };
export function ratingLabel(c) {
  if (c?.rating?.key && RATING_LABEL[c.rating.key]) return RATING_LABEL[c.rating.key];
  const s = c?.split;
  if (!s) return null;
  const buys = s.strongBuy + s.buy, sells = s.sell + s.strongSell;
  return buys > s.hold + sells ? "Buy" : sells > buys + s.hold ? "Sell" : "Hold";
}
export const splitCounts = (s) => (s ? { buy: s.strongBuy + s.buy, hold: s.hold, sell: s.sell + s.strongSell } : null);
