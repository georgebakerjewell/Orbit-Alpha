// Government contract awards (NASA, Space Force, DoD, etc.) to roster companies.
// Source: USAspending.gov public API (official US federal spending data, no key needed).
//   GET /api/contracts            -> recent awards across the whole roster
//   GET /api/contracts?ticker=RKLB -> awards for one company

import { COVERED } from "../lib/roster.js";

// Recipient-name search terms per ticker (edit them in lib/roster.js).
const RECIPIENTS = Object.fromEntries(Object.entries(COVERED).map(([t, c]) => [t, c.recipients]));

const API = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
const FIELDS = ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency", "Awarding Sub Agency", "Start Date", "Description"];
const TTL = 6 * 60 * 60 * 1000;
const cache = {};

const isoDate = (d) => d.toISOString().slice(0, 10);

// The API's text search is a loose "contains" match (e.g. GEOST also finds GEOSTABILIZATION),
// so every result is re-checked here with whole-word matching before it is shown.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_RE = Object.fromEntries(
  Object.entries(RECIPIENTS).map(([t, terms]) => [t, new RegExp(`(^|[^A-Z0-9])(${terms.map(escapeRe).join("|")})([^A-Z0-9]|$)`)])
);
export function tickerFor(recipient = "") {
  const name = recipient.toUpperCase();
  return Object.keys(TERM_RE).find((t) => TERM_RE[t].test(name)) || null;
}

// "IGF::OT::IGF LAUNCH SERVICES FOR ..." -> "Launch services for ..."
export function cleanDescription(desc = "") {
  const text = desc.replace(/^(IGF::\w+::IGF\s*)/i, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  return (lower.charAt(0).toUpperCase() + lower.slice(1)).slice(0, 220);
}

export function shapeResults(results, cutoff, today = new Date().toISOString().slice(0, 10)) {
  return results
    .map((r) => ({
      ticker: tickerFor(r["Recipient Name"]),
      recipient: r["Recipient Name"],
      amount: Number(r["Award Amount"]) || 0,
      agency: r["Awarding Agency"] || "",
      subAgency: r["Awarding Sub Agency"] || "",
      start: r["Start Date"] || "",
      description: cleanDescription(r["Description"]),
      awardId: r["Award ID"],
      url: r.generated_internal_id ? `https://www.usaspending.gov/award/${r.generated_internal_id}` : null,
    }))
    // Work must have started (start dates can be years ahead) and skip trivial modifications.
    .filter((a) => a.ticker && a.amount >= 10_000 && a.start >= cutoff && a.start <= today);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "").toUpperCase();
  if (ticker && !RECIPIENTS[ticker]) return res.status(200).json({ awards: [], total: 0 });

  const key = ticker || "ALL";
  if (cache[key] && Date.now() - cache[key].ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json(cache[key].data);
  }

  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  // USAspending rejects very long search lists, so the all-roster view queries a few companies at a time.
  const tickers = ticker ? [ticker] : Object.keys(RECIPIENTS);
  const groups = [];
  for (let i = 0; i < tickers.length; i += 4) groups.push(tickers.slice(i, i + 4).flatMap((t) => RECIPIENTS[t]));

  const query = async (terms) => {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          award_type_codes: ["A", "B", "C", "D"], // definitive contracts and orders (not IDV ceilings)
          recipient_search_text: terms,
          time_period: [{ start_date: isoDate(yearAgo), end_date: isoDate(now) }],
        },
        fields: FIELDS,
        sort: "Start Date",
        order: "desc",
        limit: 100,
        page: 1,
      }),
    });
    if (!response.ok) throw new Error(`USAspending ${response.status}`);
    return (await response.json()).results || [];
  };

  try {
    const settled = await Promise.allSettled(groups.map(query));
    const ok = settled.filter((r) => r.status === "fulfilled");
    if (!ok.length) throw settled[0].reason;
    const seen = new Set();
    const awards = shapeResults(ok.flatMap((r) => r.value), isoDate(yearAgo))
      .filter((a) => (seen.has(a.awardId) ? false : seen.add(a.awardId)))
      .sort((a, b) => b.start.localeCompare(a.start));
    const data = {
      awards: awards.slice(0, ticker ? 15 : 40),
      total: awards.reduce((sum, a) => sum + a.amount, 0),
      asOf: isoDate(now),
    };
    // Cache complete results for 6 hours; if some queries failed, retry within 5 minutes.
    const complete = ok.length === settled.length;
    if (complete) cache[key] = { ts: Date.now(), data };
    res.setHeader("Cache-Control", complete ? "s-maxage=21600, stale-while-revalidate=86400" : "s-maxage=300");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message, awards: [], total: 0 });
  }
}
