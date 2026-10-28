// Earnings previews: /earnings-preview/<ticker>, built automatically for each covered company that
// reports within the next 21 days (from the earnings calendar), and kept for 30 days after it reports
// with a link to its results page. Everything on the page comes from data the site already holds:
// the calendar (date, timing, consensus EPS), the company's latest 10-Q/10-K figures, prices,
// Form 4 insider trades and USAspending contract awards. Nothing is estimated.
import { chartLinkHtml } from "../lib/affiliates.js";
const AHEAD = 21, AFTER = 30;

// The quarter a results date reports on: October to December reports cover Q3, and so on.
export function quarterFor(date) {
  const [y, m] = date.split("-").map(Number);
  return m <= 3 ? `Q4 ${y - 1}` : m <= 6 ? `Q1 ${y}` : m <= 9 ? `Q2 ${y}` : `Q3 ${y}`;
}
const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

// Which tickers get a preview page today, with the mode: "ahead" (date coming up) or "after" (results out).
export function previewTargets({ earnings = [], results = [], profiles, today }) {
  const out = {};
  for (const e of earnings) {
    if (!profiles[e.ticker] || out[e.ticker]) continue;
    // Skip a date whose quarter already has a results page (a stale calendar entry).
    if (results.some((r) => r.ticker === e.ticker && r.quarter === quarterFor(e.date))) continue;
    if (e.date >= today && e.date <= addDays(today, AHEAD)) out[e.ticker] = { mode: "ahead", e };
  }
  for (const r of results) {
    if (!profiles[r.ticker] || out[r.ticker]) continue;
    if (r.reported <= today && r.reported >= addDays(today, -AFTER)) out[r.ticker] = { mode: "after", r };
  }
  return out;
}

export function buildPreviews(ctx) {
  const { SITE, ORG, crumbs, esc, list, profiles, quotes, ytdBy, perfBy, finBy, insidersBy, contractsBy, earnings, results = [], asOf,
    fmtPrice, fmtPct, fmtUsd, fmtDate } = ctx;
  const today = ctx.today || asOf;
  const ret = (range, t) => { const s = (perfBy[range]?.series || []).find((x) => x.id === t); return s ? [...s.values].reverse().find((v) => v != null) ?? null : null; };
  const signed = (n) => `${n < 0 ? "-" : ""}${fmtUsd(Math.abs(n))}`;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = (iso) => DAYS[new Date(iso + "T12:00:00Z").getUTCDay()];
  const targets = previewTargets({ earnings, results, profiles, today });

  return Object.entries(targets).map(([t, { mode, e, r }]) => {
    const p = profiles[t], name = p.name, path = `/earnings-preview/${t.toLowerCase()}`;
    const f = finBy[t]?.snapshot?.currency === "USD" ? finBy[t].snapshot : null;
    const q = quotes[t];
    const quarter = mode === "ahead" ? quarterFor(e.date) : r.quarter;
    const timing = e?.time && e.time !== "Time TBC" ? e.time.toLowerCase() : null;
    const priorResults = results.filter((x) => x.ticker === t).sort((a, b) => b.reported.localeCompare(a.reported));
    const awards = (contractsBy[t]?.awards || []).filter((a) => f?.periodEnd && a.start > f.periodEnd);
    const awardsTotal = awards.reduce((s, a) => s + (a.amount || 0), 0);
    const m3 = insidersBy[t]?.m3;
    const dil = f?.shares?.kind === "outstanding" ? f.shares.y1?.pct : null;
    const r3 = ret("3mo", t);

    const lastQ = f ? [
      f.revenue?.quarter != null ? `Revenue: ${fmtUsd(f.revenue.quarter)}${f.revenue.quarterGrowth != null ? `, ${fmtPct(f.revenue.quarterGrowth)} on a year earlier` : ""}` : null,
      f.revenue?.ttm != null ? `Revenue over the last 12 months: ${fmtUsd(f.revenue.ttm)}${f.revenue.ttmGrowth != null ? ` (${fmtPct(f.revenue.ttmGrowth)})` : ""}` : null,
      f.grossMargin != null ? `Gross margin over the last 12 months: ${f.grossMargin.toFixed(1)}%` : null,
      f.netIncome?.quarter != null ? `Net ${f.netIncome.quarter < 0 ? "loss" : "income"}: ${fmtUsd(Math.abs(f.netIncome.quarter))}` : null,
      f.liquidity != null ? `Cash and short-term investments: ${fmtUsd(f.liquidity)}` : null,
      f.cashGenerative || (f.freeCashFlow != null && f.freeCashFlow >= 0) ? "Free cash flow: positive over the last 12 months" : f.runwayMonths != null ? `Cash runway: about ${f.runwayMonths >= 36 ? `${(f.runwayMonths / 12).toFixed(1)} years` : `${Math.round(f.runwayMonths)} months`} at the last 12 months' burn` : null,
    ].filter(Boolean) : [];

    const since = [
      r3 != null ? `Shares: ${fmtPct(r3)} over the last three months${ytdBy[t] != null ? `, ${fmtPct(ytdBy[t])} this year` : ""}` : null,
      m3 ? (m3.bought >= 1000 || m3.sold >= 1000 ? `Insiders: ${m3.bought ? `${fmtUsd(m3.bought)} bought` : "no buying"} and ${m3.sold ? `${fmtUsd(m3.sold)} sold` : "no selling"} on the open market in the last three months (Form 4)` : "Insiders: no open-market buying or selling in the last three months (Form 4)") : null,
      f?.periodEnd && contractsBy[t] ? (awards.length ? `US government contracts: ${awards.length} award${awards.length === 1 ? "" : "s"} worth ${fmtUsd(awardsTotal)} starting since ${fmtDate(f.periodEnd)}` : `US government contracts: no new awards on USAspending.gov since ${fmtDate(f.periodEnd)}`) : null,
    ].filter(Boolean);

    const watch = [
      f?.revenue?.quarterGrowth != null ? `Whether revenue growth holds up against last quarter's ${fmtPct(f.revenue.quarterGrowth)} year on year.` : null,
      f?.netIncome?.quarter != null && f.netIncome.quarter < 0 ? `Progress on losses, after a net loss of ${fmtUsd(Math.abs(f.netIncome.quarter))} last quarter.` : null,
      f?.grossMargin != null ? `Gross margin, which was ${f.grossMargin.toFixed(1)}% over the last 12 months.` : null,
      f?.runwayMonths != null && f.runwayMonths < 24 && !f.cashGenerative ? `Cash: about ${Math.round(f.runwayMonths)} months of runway at the current burn, so any comment on funding.` : null,
      dil != null && dil >= 15 ? `Share count, up ${dil.toFixed(1)}% over the past year.` : null,
      "Guidance for the next quarter and the full year, if the company gives it.",
    ].filter(Boolean);

    const ahead = mode === "ahead";
    const when = ahead ? `${e.confirmed ? "" : "is expected to "}report${e.confirmed ? "s" : ""} ${quarter} results on ${day(e.date)} ${fmtDate(e.date)}${timing ? `, ${timing}` : ""}` : `reported ${quarter} results on ${fmtDate(r.reported)}`;
    const answer = ahead
      ? `${name} (${t}) ${when}${e.epsEst ? `, with consensus earnings per share of ${e.epsEst.replace(/^\(\$?([\d.]+)\)$/, "-$$$1")}` : ""}.${f?.revenue?.quarter != null ? ` In the last reported quarter, to ${fmtDate(f.periodEnd)}, revenue was ${fmtUsd(f.revenue.quarter)}${f.revenue.quarterGrowth != null ? `, ${f.revenue.quarterGrowth >= 0 ? "up" : "down"} ${Math.abs(f.revenue.quarterGrowth).toFixed(0)}% on a year earlier` : ""}.` : ""}`
      : `${name} (${t}) reported ${quarter} results on ${fmtDate(r.reported)}: ${r.headline}.`;

    const keyRows = ahead ? [
      ["Results date", `${day(e.date)} ${fmtDate(e.date)}${e.confirmed ? " (confirmed by the company)" : " (expected, Nasdaq calendar)"}`],
      ["Timing", e.time || "Not yet announced"],
      ["Quarter", `${quarter}`],
      ["Consensus EPS", e.epsEst ? esc(e.epsEst.replace(/^\(\$?([\d.]+)\)$/, "-$$$1")) : "Not published"],
      ["Share price", q?.price != null ? `${fmtPrice(q.price, q.currency)} (last close)` : "-"],
    ] : [];

    return {
      path, guide: true, lastmod: ahead ? today : r.reported,
      og: { file: `og/previews/${t.toLowerCase()}.png`, ticker: t, name, sector: "Earnings preview", path,
        headline: ahead ? `${quarter} results: ${day(e.date).slice(0, 3)} ${fmtDate(e.date).replace(/ \d{4}$/, "")}` : `${quarter} results are out`,
        asOf: fmtDate(today),
        stats: ahead ? [
          ...(e.epsEst ? [["Consensus EPS", e.epsEst.replace(/^\(\$?([\d.]+)\)$/, "-$$$1")]] : []),
          ...(f?.revenue?.quarter != null ? [["Last quarter revenue", fmtUsd(f.revenue.quarter)]] : []),
          ...(q?.price != null ? [["Share price", fmtPrice(q.price, q.currency)]] : []),
        ] : [], tagline: ahead ? undefined : r.headline },
      title: `${name} (${t}) ${quarter} Earnings Preview: Date and What to Watch | Orbit Alpha`,
      description: ahead ? `${name} ${quarter} results: ${fmtDate(e.date)}${timing ? `, ${timing}` : ""}. The consensus estimate, last quarter's numbers and what to watch, from the company's filings.` : `${name} reported ${quarter} results on ${fmtDate(r.reported)}. The headline numbers and what the preview set out to watch.`,
      body: `<div class="oa-guide"><h1>${esc(name)} (${t}) ${esc(quarter)} earnings preview</h1><!--oa-answer-->
${ahead ? `<p>${esc(name)} (<a href="/stocks/${t.toLowerCase()}">${t}</a>) ${esc(when)}. This page sets out the date, the consensus estimate and the numbers to compare the results against, taken from ${esc(name)}'s own filings. Orbit Alpha publishes a <a href="/results">results page</a> on the evening it reports.</p>
<h2>Key facts</h2><table><thead><tr><th>Item</th><th>Detail</th></tr></thead><tbody>${keyRows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table>`
  : `<div class="oa-callout"><p><b>The results are out.</b> ${esc(name)} reported ${esc(quarter)} results on ${fmtDate(r.reported)}: ${esc(r.headline)}. <a href="/results/${r.slug}">Read the ${esc(quarter)} results</a>.</p></div>`}
${ahead && lastQ.length ? `<h2>What the last report showed</h2>${list(lastQ.map(esc))}<p>From ${esc(name)}'s filing for the quarter to ${fmtDate(f.periodEnd)}.</p>` : ""}
${ahead && since.length ? `<h2>Since then</h2>${list(since.map(esc))}` : ""}
${ahead ? `<h2>What to watch</h2>${list(watch.map(esc))}` : ""}
${priorResults.length ? `<h2>Earlier results</h2>${list(priorResults.slice(0, 4).map((x) => `<a href="/results/${x.slug}">${esc(name)} ${esc(x.quarter)} results: ${esc(x.headline)}</a>`))}` : ""}
<h2>More on ${esc(name)}</h2>${list([`<a href="/stocks/${t.toLowerCase()}">${t} stock: live price, filings, insider trades and contracts</a>`, chartLinkHtml(t, `preview:${t}`, esc), `<a href="/results">${esc(quarter)} space stock results scoreboard</a>`, `<a href="/space-stocks/earnings-calendar">Space stocks earnings calendar</a>`])}
<p class="oa-note">Consensus estimates and dates from the Nasdaq earnings calendar; financials from SEC filings; insider trades from Form 4; contracts from USAspending.gov. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(answer),
      ld: [ORG, crumbs([["Home", "/"], ["Results", "/results"], [`${t} ${quarter} preview`, path]])],
    };
  });
}
