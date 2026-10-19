// "Space Stocks 2026: the 30 companies in one sheet": a print-ready page at
// /downloads/space-stocks-sheet, rebuilt with the site. The GitHub Action
// .github/workflows/space-stocks-sheet.yml prints it to public/downloads/space-stocks-2026.pdf,
// which is the free download offered for subscribing.
export function sheetHtml({ profiles, SECTOR_ORDER, quotes, ytdBy, finBy, nextEarnings, asOf, esc, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate, SITE }) {
  const cap = (t) => quotes[t]?.marketCap || 0;
  const row = (t) => {
    const p = profiles[t], q = quotes[t], f = finBy[t]?.snapshot, e = nextEarnings[t];
    const rev = f?.revenue?.ttm ? fmtUsd(f.revenue.ttm) : f?.revenue?.quarter ? `${fmtUsd(f.revenue.quarter)} (qtr)` : "";
    const runway = !f ? "" : f.cashGenerative || (f.freeCashFlow != null && f.freeCashFlow >= 0) ? "Cash generative" : f.runwayMonths != null ? (f.runwayMonths >= 36 ? `${(f.runwayMonths / 12).toFixed(1)} yrs` : `${Math.round(f.runwayMonths)} mths`) : "";
    return `<tr><td><b>${t}</b></td><td>${esc(p.name)}<div class="about">${esc(p.about)}</div></td><td>${esc(p.listing || "US")}</td><td class="n">${q?.price != null ? fmtPrice(q.price, q.currency) : ""}</td><td class="n">${cap(t) ? fmtCap(cap(t)) : ""}</td><td class="n">${ytdBy[t] != null && t !== "SPCX" ? fmtPct(ytdBy[t]) : t === "SPCX" ? "New" : ""}</td><td class="n">${rev}</td><td>${runway}</td><td>${e ? fmtDate(e.date) : ""}</td></tr>`;
  };
  const sections = SECTOR_ORDER.map((s) => {
    const ts = Object.keys(profiles).filter((t) => profiles[t].sector === s).sort((a, b) => cap(b) - cap(a));
    return ts.length ? `<tr class="sector"><td colspan="9">${esc(s)}</td></tr>${ts.map(row).join("")}` : "";
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Space Stocks 2026: all ${Object.keys(profiles).length} companies at a glance | Orbit Alpha</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { font-family: Inter, -apple-system, "Segoe UI", Arial, sans-serif; color: #111; margin: 0; padding: 18px; background: #fff; font-size: 9.5px; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #04060e; padding-bottom: 8px; margin-bottom: 10px; }
h1 { font-size: 22px; margin: 0; letter-spacing: -0.01em; }
.brand { font-weight: 800; font-size: 15px; } .brand span { color: #00a35a; }
.sub { color: #555; font-size: 10.5px; margin-top: 3px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #999; padding: 4px 5px; }
td { padding: 4px 5px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
td.n, th.n { text-align: right; white-space: nowrap; }
tr { page-break-inside: avoid; }
.sector td { background: #04060e; color: #fff; font-weight: 700; font-size: 10px; padding: 4px 6px; }
.about { color: #666; font-size: 8.3px; margin-top: 1px; max-width: 420px; }
footer { margin-top: 10px; color: #555; font-size: 8.5px; display: flex; justify-content: space-between; gap: 20px; }
a { color: #00804a; }
</style></head><body>
<header><div><div class="brand">ORBIT<span>ALPHA.</span></div><h1>Space Stocks 2026: all ${Object.keys(profiles).length} companies at a glance</h1><div class="sub">Every listed space company Orbit Alpha covers, by sector and market value. Figures as of ${fmtDate(asOf)}.</div></div><div class="sub">Live version: <a href="${SITE}/space-stocks">orbitalpha.cloud/space-stocks</a></div></header>
<table><thead><tr><th>Ticker</th><th>Company and what it does</th><th>Listing</th><th class="n">Price</th><th class="n">Market cap</th><th class="n">YTD</th><th class="n">Revenue (12m)</th><th>Cash runway</th><th>Next results</th></tr></thead><tbody>${sections}</tbody></table>
<footer><div>Prices from Yahoo Finance; revenue and cash runway from SEC filings (US filers only); market caps in US dollars. Cash runway is cash and short-term investments divided by the last 12 months of free cash outflow. Information only, not investment advice. Capital is at risk.</div><div>Free weekly newsletter: <a href="${SITE}/newsletter">orbitalpha.cloud/newsletter</a></div></footer>
</body></html>`;
}
