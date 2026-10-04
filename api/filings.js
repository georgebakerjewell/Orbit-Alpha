// Notable SEC filings for roster companies, from SEC EDGAR (official, free).
//   GET /api/filings             -> recent notable filings across the roster
//   GET /api/filings?ticker=RKLB -> recent notable filings for one company
// Form 4s are parsed so insider buys and sales are labelled as such.

export const config = { maxDuration: 30 };

import { US_ROSTER as ROSTER } from "../lib/roster.js"; // SEC filers only (non-US listings excluded)

// SEC requires a descriptive User-Agent with contact details.
const HEADERS = { "User-Agent": "Orbit Alpha OrbitAlphaApp@proton.me", Accept: "application/json" };
const TTL = 60 * 60 * 1000;
const cache = {};
let cikMap = null;

const EIGHT_K_ITEMS = {
  "1.01": "Material agreement",
  "1.03": "Bankruptcy",
  "2.01": "Acquisition or sale completed",
  "2.02": "Earnings results",
  "2.03": "New debt",
  "3.01": "Listing notice",
  "3.02": "Unregistered share sale",
  "5.02": "Executive or board change",
  "5.07": "Shareholder vote results",
  "7.01": "Investor update",
  "8.01": "Company update",
};

// Returns { label, kind } or null if the form isn't worth showing.
// kind: "earnings" | "insider" | "dilution" | "holder" | "event" | "report"
export function classify(form, items = "") {
  if (form === "8-K") {
    const codes = items.split(",").map((s) => s.trim());
    const code = codes.find((c) => c !== "9.01" && EIGHT_K_ITEMS[c]);
    const label = code ? EIGHT_K_ITEMS[code] : "Company update";
    const kind = code === "2.02" ? "earnings" : code === "3.02" ? "dilution" : "event";
    return { label, kind };
  }
  if (form === "4") return { label: "Insider transaction", kind: "insider" };
  if (form === "144") return { label: "Insider plans to sell (Form 144)", kind: "insider" };
  if (/^(S-1|S-3|S-3ASR|F-1|F-3)$/.test(form)) return { label: "Share registration (possible offering)", kind: "dilution" };
  if (/^424B/.test(form)) return { label: "Offering prospectus", kind: "dilution" };
  if (/^(SC 13[DG]|SCHEDULE 13[DG])/.test(form)) return { label: "Major holder stake (5%+)", kind: "holder" };
  if (form === "10-Q") return { label: "Quarterly report", kind: "report" };
  if (/^(10-K|20-F|40-F)$/.test(form)) return { label: "Annual report", kind: "report" };
  if (form === "6-K") return { label: "Company update", kind: "event" };
  if (form === "DEF 14A") return { label: "Proxy statement", kind: "report" };
  return null;
}

// Parse a Form 4 XML document: who, role, and whether it was an open-market buy or sale.
export function parseForm4(xml) {
  const pick = (re, s = xml) => (s.match(re) || [])[1]?.trim() || "";
  const owner = pick(/<rptOwnerName>([\s\S]*?)<\/rptOwnerName>/);
  const title = pick(/<officerTitle>([\s\S]*?)<\/officerTitle>/);
  const isDirector = /<isDirector>\s*(1|true)\s*<\/isDirector>/i.test(xml);
  let bought = 0, sold = 0;
  for (const tx of xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/g) || []) {
    const code = pick(/<transactionCode>([\s\S]*?)<\/transactionCode>/, tx);
    const shares = parseFloat(pick(/<transactionShares>\s*<value>([\s\S]*?)<\/value>/, tx)) || 0;
    const price = parseFloat(pick(/<transactionPricePerShare>\s*<value>([\s\S]*?)<\/value>/, tx)) || 0;
    if (code === "P") bought += shares * price;
    if (code === "S") sold += shares * price;
  }
  const role = title || (isDirector ? "Director" : "Insider");
  if (bought > 0) return { label: "Insider buy", owner, role, value: Math.round(bought), direction: "buy" };
  if (sold > 0) return { label: "Insider sale", owner, role, value: Math.round(sold), direction: "sale" };
  return { label: "Insider grant or exercise", owner, role, value: 0, direction: "other" };
}

async function getCikMap() {
  if (cikMap) return cikMap;
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: HEADERS });
  const json = await res.json();
  cikMap = {};
  Object.values(json).forEach((c) => { cikMap[c.ticker.toUpperCase()] = c.cik_str; });
  return cikMap;
}

async function recentFilings(ticker, cik, sinceIso, max) {
  const res = await fetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, { headers: HEADERS });
  if (!res.ok) return [];
  const r = (await res.json()).filings?.recent || {};
  const out = [];
  for (let i = 0; i < (r.form || []).length && out.length < max; i++) {
    if (r.filingDate[i] < sinceIso) break; // newest first
    const info = classify(r.form[i], r.items?.[i] || "");
    if (!info) continue;
    const acc = r.accessionNumber[i].replace(/-/g, "");
    const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}`;
    out.push({
      ticker,
      form: r.form[i],
      date: r.filingDate[i],
      ...info,
      url: `${base}/${r.primaryDocument[i]}`,
      // Raw XML for Form 4 lives at the same name without the xsl stylesheet folder.
      _xml: r.form[i] === "4" ? `${base}/${r.primaryDocument[i].replace(/^xsl[^/]+\//, "")}` : null,
    });
  }
  return out;
}

async function enrichForm4s(filings, limit) {
  const targets = filings.filter((f) => f._xml).slice(0, limit);
  for (let i = 0; i < targets.length; i += 5) { // stay well under SEC's 10 requests/second
    await Promise.all(targets.slice(i, i + 5).map(async (f) => {
      try {
        const xml = await (await fetch(f._xml, { headers: { ...HEADERS, Accept: "application/xml" } })).text();
        const p = parseForm4(xml);
        Object.assign(f, { label: p.label, owner: p.owner, role: p.role, value: p.value, direction: p.direction });
      } catch {}
    }));
    if (i + 5 < targets.length) await new Promise((r) => setTimeout(r, 600));
  }
  filings.forEach((f) => delete f._xml);
  return filings;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "").toUpperCase();
  if (ticker && !ROSTER.includes(ticker)) return res.status(200).json({ filings: [] });

  const key = ticker || "ALL";
  if (cache[key] && Date.now() - cache[key].ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
    return res.status(200).json(cache[key].data);
  }

  try {
    const ciks = await getCikMap();
    const tickers = ticker ? [ticker] : ROSTER;
    const since = new Date(Date.now() - (ticker ? 120 : 21) * 86_400_000).toISOString().slice(0, 10);
    let filings = [];
    for (let i = 0; i < tickers.length; i += 6) {
      const batch = await Promise.all(
        tickers.slice(i, i + 6).filter((t) => ciks[t]).map((t) => recentFilings(t, ciks[t], since, ticker ? 25 : 8).catch(() => []))
      );
      filings.push(...batch.flat());
      if (i + 6 < tickers.length) await new Promise((r) => setTimeout(r, 700));
    }
    filings.sort((a, b) => b.date.localeCompare(a.date));
    filings = filings.slice(0, ticker ? 15 : 40);
    await enrichForm4s(filings, ticker ? 8 : 15);

    const data = { filings, asOf: new Date().toISOString().slice(0, 10) };
    cache[key] = { ts: Date.now(), data };
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message, filings: [] });
  }
}
