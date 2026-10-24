// "Space Stocks 2026", the free sign-up report: a cover, contents, a sector overview and one page per
// company (stats, year-to-date chart, financials, insider trades, contracts, filings, newsletter
// coverage and peers). Built with the site at /downloads/space-stocks-sheet; the GitHub Action
// .github/workflows/space-stocks-sheet.yml prints it to public/downloads/space-stocks-2026.pdf weekly.
export function sheetHtml(d) {
  const { profiles, SECTOR_ORDER, quotes, ytdBy, perfBy, finBy, insidersBy, filingsBy, contractsBy, nextEarnings, issueArchive = [], stories = [],
    asOf, esc, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate, SITE } = d;
  const tickers = Object.keys(profiles);
  const N = tickers.length;
  const cap = (t) => quotes[t]?.marketCap || 0;
  const order = SECTOR_ORDER.flatMap((s) => tickers.filter((t) => profiles[t].sector === s).sort((a, b) => cap(b) - cap(a)));
  const series = (range, t) => (perfBy[range]?.series || []).find((x) => x.id === t);
  const last = (s) => (s ? [...s.values].reverse().find((v) => v != null) : null);
  const ret1y = (t) => last(series("1y", t));
  const signed = (n) => `${n < 0 ? "-" : ""}${fmtUsd(Math.abs(n))}`;
  const runway = (f) => (!f ? null : f.cashGenerative || (f.freeCashFlow != null && f.freeCashFlow >= 0) ? "Cash generative" : f.runwayMonths == null ? null : f.runwayMonths >= 120 ? "10+ years" : f.runwayMonths >= 36 ? `${(f.runwayMonths / 12).toFixed(1)} years` : `${Math.round(f.runwayMonths)} months`);
  const pctCls = (v) => (v == null ? "" : v >= 0 ? "up" : "down");
  const eps = (v) => String(v).replace(/^\((.*)\)$/, "-$1");

  // Year-to-date line chart as inline SVG (no scripts, prints cleanly).
  function chart(t) {
    const s = series("ytd", t);
    const dates = perfBy.ytd?.dates || [];
    const pts = s ? s.values.map((v, i) => [i, v]).filter(([, v]) => v != null) : [];
    if (pts.length < 5) return `<div class="nochart">Year-to-date chart not available${t === "SPCX" ? " (listed June 2026)" : ""}.</div>`;
    const W = 680, H = 120, P = 6;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys);
    const X = (x) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P), Y = (y) => P + (1 - (y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
    const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("");
    const end = ys[ys.length - 1], col = end >= 0 ? "#00994f" : "#d43a4a";
    const lab = (i) => (dates[i] ? fmtDate(String(dates[i]).slice(0, 10)) : "");
    return `<svg viewBox="0 0 ${W} ${H + 18}" class="chart" role="img" aria-label="${esc(profiles[t].name)} year-to-date share price change">
<line x1="${P}" x2="${W - P}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#bbb" stroke-dasharray="3 3"/>
<path d="${path}" fill="none" stroke="${col}" stroke-width="2"/>
<text x="${W - P}" y="${Math.max(12, Y(end) - 6).toFixed(1)}" text-anchor="end" font-size="12" font-weight="700" fill="${col}">${fmtPct(end)}</text>
<text x="${P}" y="${H + 14}" font-size="10" fill="#777">${esc(lab(xs[0]))}</text><text x="${W - P}" y="${H + 14}" font-size="10" fill="#777" text-anchor="end">${esc(lab(xs[xs.length - 1]))}</text>
<text x="${P + 2}" y="${(Y(0) - 4).toFixed(1)}" font-size="9" fill="#999">0%</text></svg>`;
  }

  const tile = (label, value, cls = "") => `<div class="tile"><div class="tl">${label}</div><div class="tv ${cls}">${value ?? "n/a"}</div></div>`;
  const rows = (pairs) => pairs.filter(([, v]) => v != null && v !== "").map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join("");

  function companyPage(t, i) {
    const p = profiles[t], q = quotes[t], f = finBy[t]?.snapshot, e = nextEarnings[t], ins = insidersBy[t], con = contractsBy[t];
    const us = !p.listing;
    const ytd = t === "SPCX" ? null : ytdBy[t];
    const r1 = t === "SPCX" ? null : ret1y(t);
    const peers = order.filter((x) => profiles[x].sector === p.sector && x !== t).slice(0, 4);
    const filings = (filingsBy[t] || []).slice(0, 4);
    const awards = (con?.awards || []).slice(0, 2);
    const issues = issueArchive.filter((x) => x.tickers?.includes(t)).slice(0, 2);
    const briefs = stories.filter((x) => x.tickers?.includes(t)).slice(0, 2);
    const fin = f && f.currency === "USD" ? `<h3>Financials</h3><table class="kv">${rows([
      ["Revenue, last 12 months", f.revenue?.ttm ? fmtUsd(f.revenue.ttm) : null],
      ["Revenue, latest quarter", f.revenue?.quarter ? fmtUsd(f.revenue.quarter) : null],
      ["Revenue growth", f.revenue?.ttmGrowth != null ? `${fmtPct(f.revenue.ttmGrowth)} (12m)` : f.revenue?.quarterGrowth != null ? `${fmtPct(f.revenue.quarterGrowth)} (qtr)` : null],
      ["Gross margin, last 12 months", f.grossMargin != null ? `${f.grossMargin.toFixed(1)}%` : null],
      ["Net income", f.netIncome?.ttm != null ? `${signed(f.netIncome.ttm)} (12m)` : f.netIncome?.quarter != null ? `${signed(f.netIncome.quarter)} (qtr)` : null],
      ["Cash and short-term investments", f.liquidity != null ? fmtUsd(f.liquidity) : null],
      ["Long-term debt", f.debt != null ? fmtUsd(f.debt) : null],
      ["Free cash flow, 12m", f.freeCashFlow != null ? signed(f.freeCashFlow) : null],
      ["Cash runway", runway(f)],
      ["Shares outstanding, 1y change", f.shares?.kind === "outstanding" && f.shares.y1?.pct != null ? fmtPct(f.shares.y1.pct) : null],
    ])}</table><div class="src">From filings for the period to ${fmtDate(f.periodEnd)}.</div>` : `<h3>Financials</h3><p class="muted">${us ? "Financial data not available from SEC filings yet." : `Listed on ${esc(p.listing)}; reports outside the SEC system, so filing-based financials are not shown. See the company's own reports.`}</p>`;
    const insider = us && ins?.m12 ? `<h3>Insider trading, 12 months</h3><table class="kv">${rows([
      ["Bought (open market)", ins.m12.bought ? fmtUsd(ins.m12.bought) : "None"],
      ["Sold (open market)", ins.m12.sold ? fmtUsd(ins.m12.sold) : "None"],
      ["Buyers / sellers", `${ins.m12.buyers} / ${ins.m12.sellers}`],
    ])}</table>${(ins.largest || []).slice(0, 2).map((x) => `<div class="li">${fmtDate(x.date)}: ${esc(x.owner || "Insider")}${x.role ? ` (${esc(x.role)})` : ""} ${x.direction === "buy" ? "bought" : "sold"} ${fmtUsd(x.value)}</div>`).join("")}` : "";
    const contracts = us && con ? `<h3>US government contracts, 12 months</h3><div class="big">${con.total ? fmtUsd(con.total) : "None recorded"}</div>${awards.map((a) => `<div class="li">${fmtDate(a.start)}: ${fmtUsd(a.amount)}, ${esc(a.subAgency || a.agency || "")}${a.description ? `. ${esc(a.description.slice(0, 60))}` : ""}</div>`).join("")}` : "";
    return `<section class="co">
<div class="cohead"><div><span class="sector">${esc(p.sector)}</span><span class="pg">Page ${i + 4}</span></div><div class="brand">ORBIT<span>ALPHA.</span></div></div>
<h2><span class="tk">${t}</span> ${esc(p.name)}</h2>
<div class="listing">${us ? "US listed" : esc(p.listing)}${q?.currency && q.currency !== "USD" ? ` · prices in ${q.currency === "GBp" ? "pence" : esc(q.currency)}` : ""}</div>
<p class="about">${esc(p.about)}</p>
<div class="tiles">
${tile("Share price", q?.price != null ? fmtPrice(q.price, q.currency) : null)}
${tile("Market cap", cap(t) ? fmtCap(cap(t)) : null)}
${tile(t === "SPCX" ? "vs $135 IPO price" : "Year to date", t === "SPCX" && q?.price ? fmtPct((q.price / 135 - 1) * 100) : ytd != null ? fmtPct(ytd) : null, pctCls(t === "SPCX" && q?.price ? q.price - 135 : ytd))}
${tile("1 year", r1 != null ? fmtPct(r1) : null, pctCls(r1))}
${tile("Revenue, 12m", f?.revenue?.ttm ? fmtUsd(f.revenue.ttm) : f?.revenue?.quarter ? `${fmtUsd(f.revenue.quarter)} qtr` : null)}
${tile("Cash runway", runway(f))}
${tile("Next results", e ? fmtDate(e.date) : null)}
${tile("Consensus EPS", e?.epsEst ? esc(eps(e.epsEst)) : null)}
</div>
<h3>Share price this year</h3>${chart(t)}
<div class="cols"><div>${fin}</div><div>${insider}${contracts}${!us ? `<h3>Where it trades</h3><p class="muted">${esc(p.listing)}. Most UK platforms offer this market; check fees for foreign shares and currency.</p>` : ""}</div></div>
${filings.length ? `<h3>Latest SEC filings</h3>${filings.map((x) => `<div class="li">${fmtDate(x.date)}: ${esc(x.label || x.form)}${x.owner ? `, ${esc(x.owner)}` : ""}${x.value ? `, ${fmtUsd(x.value)}` : ""} (Form ${esc(x.form)})</div>`).join("")}` : ""}
${briefs.length ? `<h3>Recent news from Orbit Alpha</h3>${briefs.map((x) => `<div class="li"><b>${esc(x.title)}</b> (${fmtDate(x.published.slice(0, 10))})</div>`).join("")}` : ""}
${issues.length ? `<h3>In the Orbit Alpha newsletter</h3>${issues.map((x) => `<div class="li">Issue ${x.issue}: ${esc(x.title)}</div>`).join("")}` : ""}
${peers.length ? `<h3>${esc(p.sector)} peers</h3><table class="peers"><thead><tr><th>Company</th><th class="n">Market cap</th><th class="n">YTD</th></tr></thead><tbody>${peers.map((x) => `<tr><td>${esc(profiles[x].name)} (${x})</td><td class="n">${cap(x) ? fmtCap(cap(x)) : ""}</td><td class="n ${pctCls(ytdBy[x])}">${ytdBy[x] != null && x !== "SPCX" ? fmtPct(ytdBy[x]) : ""}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="foot">Live page with chart, filings and news: <a href="${SITE}/stocks/${t.toLowerCase()}">orbitalpha.cloud/stocks/${t.toLowerCase()}</a> · Figures as of ${fmtDate(asOf)} · Information only, not investment advice.</div>
</section>`;
  }

  // Sector summary for the overview page.
  const sectorStats = SECTOR_ORDER.map((s) => {
    const ts = order.filter((t) => profiles[t].sector === s);
    const caps = ts.reduce((a, t) => a + cap(t), 0);
    const ytds = ts.map((t) => (t === "SPCX" ? null : ytdBy[t])).filter((v) => v != null).sort((a, b) => a - b);
    const med = ytds.length ? ytds[Math.floor(ytds.length / 2)] : null;
    const best = ts.filter((t) => t !== "SPCX" && ytdBy[t] != null).sort((a, b) => ytdBy[b] - ytdBy[a])[0];
    return { s, n: ts.length, caps, med, best };
  });
  const totalCap = tickers.reduce((a, t) => a + cap(t), 0);
  const withYtd = tickers.filter((t) => t !== "SPCX" && ytdBy[t] != null).sort((a, b) => ytdBy[b] - ytdBy[a]);
  const upcoming = order.filter((t) => nextEarnings[t]).sort((a, b) => nextEarnings[a].date.localeCompare(nextEarnings[b].date));

  const overviewRow = (t) => {
    const p = profiles[t], q = quotes[t], f = finBy[t]?.snapshot;
    return `<tr><td><b>${t}</b></td><td>${esc(p.name)}</td><td>${esc(p.listing || "US")}</td><td class="n">${q?.price != null ? fmtPrice(q.price, q.currency) : ""}</td><td class="n">${cap(t) ? fmtCap(cap(t)) : ""}</td><td class="n ${pctCls(ytdBy[t])}">${t === "SPCX" ? "New" : ytdBy[t] != null ? fmtPct(ytdBy[t]) : ""}</td><td class="n">${f?.revenue?.ttm ? fmtUsd(f.revenue.ttm) : ""}</td><td>${runway(f) || ""}</td><td>${nextEarnings[t] ? fmtDate(nextEarnings[t].date) : ""}</td></tr>`;
  };

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Space Stocks 2026: the investor's guide to all ${N} listed space companies | Orbit Alpha</title>
<style>
@page { size: A4; margin: 12mm 12mm 12mm 12mm; }
* { box-sizing: border-box; }
body { font-family: Inter, -apple-system, "Segoe UI", Arial, sans-serif; color: #15171c; margin: 0; background: #fff; font-size: 10px; line-height: 1.45; }
a { color: #007a45; text-decoration: none; }
.brand { font-weight: 800; letter-spacing: -0.01em; } .brand span { color: #00a35a; }
.cover { height: 270mm; display: flex; flex-direction: column; justify-content: space-between; background: #04060e; color: #fff; padding: 22mm 16mm; margin: -12mm; page-break-after: always; }
.cover .brand { font-size: 22px; } .cover h1 { font-size: 40px; line-height: 1.05; margin: 0 0 10px; letter-spacing: -0.02em; }
.cover .lead { font-size: 14px; color: #c9cfdb; max-width: 150mm; line-height: 1.5; }
.cover .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
.cover .facts div { border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 10px 12px; } .cover .facts b { display: block; font-size: 20px; color: #00ff88; }
.cover .small { font-size: 10px; color: #8a93a8; }
.page { page-break-after: always; }
h1.sec { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; } .sub { color: #555; margin-bottom: 10px; }
h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #00804a; margin: 12px 0 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; border-bottom: 1px solid #aaa; padding: 3px 4px; }
td { padding: 3px 4px; border-bottom: 1px solid #eee; vertical-align: top; }
.n { text-align: right; white-space: nowrap; } .up { color: #00804a; } .down { color: #c22f3f; }
.sectorrow td { background: #04060e; color: #fff; font-weight: 700; }
.toc { columns: 2; column-gap: 10mm; } .toc div { break-inside: avoid; padding: 2px 0; border-bottom: 1px dotted #ddd; display: flex; justify-content: space-between; }
.co { page-break-before: always; height: 271mm; overflow: hidden; position: relative; padding-bottom: 10mm; }
.cohead { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #04060e; padding-bottom: 5px; margin-bottom: 8px; font-size: 10px; }
.sector { background: #04060e; color: #fff; padding: 2px 7px; border-radius: 3px; font-weight: 700; margin-right: 8px; } .pg { color: #777; }
.co h2 { font-size: 26px; margin: 2px 0 0; letter-spacing: -0.02em; } .tk { color: #00a35a; }
.listing { color: #666; margin-bottom: 4px; } .about { font-size: 11.5px; margin: 4px 0 8px; }
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tile { border: 1px solid #e3e5ea; border-radius: 6px; padding: 6px 8px; } .tl { font-size: 8.5px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; } .tv { font-size: 15px; font-weight: 700; margin-top: 2px; }
.chart { width: 100%; height: auto; display: block; } .nochart { color: #888; padding: 10px 0; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.kv td:first-child { color: #444; } .src, .muted { color: #777; font-size: 9px; }
.li { padding: 2px 0; border-bottom: 1px solid #f0f0f0; } .big { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.peers { margin-top: 2px; }
.foot { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid #ddd; padding-top: 4px; color: #777; font-size: 8.5px; }
.note p { margin: 0 0 6px; }
</style></head><body>

<div class="cover">
<div class="brand">ORBIT<span>ALPHA.</span></div>
<div><h1>Space Stocks 2026</h1><div class="lead">The investor's guide to all ${N} listed space companies: what each one does, the numbers that matter, insider trades, government contracts and what is coming next.</div>
<div class="facts"><div><b>${N}</b>listed companies</div><div><b>${totalCap ? fmtCap(totalCap) : ""}</b>combined market value</div><div><b>${upcoming.length}</b>results dates in the next 75 days</div></div></div>
<div class="small">Edition of ${fmtDate(asOf)}. Rebuilt every week from live prices, SEC filings and USAspending.gov. Free with the Orbit Alpha newsletter: ${SITE.replace("https://www.", "")}. Information only, not investment advice. Capital is at risk.</div>
</div>

<div class="page">
<h1 class="sec">Contents</h1><div class="sub">One page per company from page 4, grouped by sector and ordered by market value. Page 3 has every company in one table.</div>
<div class="toc">${order.map((t, i) => `<div><span><b>${t}</b> ${esc(profiles[t].name)}</span><span>${i + 4}</span></div>`).join("")}</div>
<h3>The sector at a glance</h3>
<table><thead><tr><th>Sector</th><th class="n">Companies</th><th class="n">Combined market cap</th><th class="n">Median YTD</th><th>Best this year</th></tr></thead><tbody>${sectorStats.map((x) => `<tr><td>${esc(x.s)}</td><td class="n">${x.n}</td><td class="n">${x.caps ? fmtCap(x.caps) : ""}</td><td class="n ${pctCls(x.med)}">${x.med != null ? fmtPct(x.med) : ""}</td><td>${x.best ? `${esc(profiles[x.best].name)} (${fmtPct(ytdBy[x.best])})` : ""}</td></tr>`).join("")}</tbody></table>
${withYtd.length ? `<div class="cols"><div><h3>Best performers this year</h3><table>${withYtd.slice(0, 5).map((t) => `<tr><td>${esc(profiles[t].name)} (${t})</td><td class="n up">${fmtPct(ytdBy[t])}</td></tr>`).join("")}</table></div><div><h3>Weakest this year</h3><table>${withYtd.slice(-5).reverse().map((t) => `<tr><td>${esc(profiles[t].name)} (${t})</td><td class="n down">${fmtPct(ytdBy[t])}</td></tr>`).join("")}</table></div></div>` : ""}
${upcoming.length ? `<h3>Coming up: results dates</h3><table>${upcoming.slice(0, 12).map((t) => `<tr><td>${fmtDate(nextEarnings[t].date)}</td><td>${esc(profiles[t].name)} (${t})</td><td>${esc(nextEarnings[t].time && nextEarnings[t].time !== "Time TBC" ? nextEarnings[t].time : "")}</td></tr>`).join("")}</table>` : ""}
</div>

<div class="page">
<h1 class="sec">Every space stock in one table</h1><div class="sub">Market caps in US dollars; prices in each stock's trading currency. Figures as of ${fmtDate(asOf)}.</div>
<table><thead><tr><th>Ticker</th><th>Company</th><th>Listing</th><th class="n">Price</th><th class="n">Mkt cap</th><th class="n">YTD</th><th class="n">Revenue 12m</th><th>Runway</th><th>Next results</th></tr></thead><tbody>
${SECTOR_ORDER.map((s) => { const ts = order.filter((t) => profiles[t].sector === s); return ts.length ? `<tr class="sectorrow"><td colspan="9">${esc(s)}</td></tr>${ts.map(overviewRow).join("")}` : ""; }).join("")}
</tbody></table>
</div>

${order.map(companyPage).join("\n")}

<section class="co note">
<div class="cohead"><div><span class="sector">Notes</span></div><div class="brand">ORBIT<span>ALPHA.</span></div></div>
<h2>How to read this report</h2>
<h3>Sources</h3><p>Prices and returns from Yahoo Finance. Financials, insider trades and filings from SEC EDGAR (US-listed companies only). Contract awards from USAspending.gov (US federal prime awards only). Results dates from the Nasdaq calendar and company announcements.</p>
<h3>Definitions</h3><p>Cash runway is cash and short-term investments divided by the last 12 months of free cash outflow; it ignores credit lines and future fundraising. Insider trades count open-market purchases and sales only. Share count change compares shares outstanding with a year earlier. Year-to-date returns run from the previous year's last close; SpaceX listed in June 2026 and is measured against its $135 IPO price.</p>
<h3>Important</h3><p>This report is information, not investment advice, and it does not recommend any security. Figures can change quickly and may contain errors; check the original filing before acting. Capital is at risk.</p>
<h3>Keep it current</h3><p>This report is rebuilt every week. Live prices, charts, filings and news for every company are at <a href="${SITE}/space-stocks">${SITE.replace("https://www.", "")}/space-stocks</a>, and the free Sunday newsletter covers what moved and why.</p>
</section>
</body></html>`;
}
