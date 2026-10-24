import { previewTargets } from "./previews.mjs";
import { chartLinkHtml } from "../lib/affiliates.js";
// Results-day pages (/results/<ticker>-<quarter>) and the /results index, built from src/results.json.
// Entries are added by the "Space stock results pages" scheduled task on the evening a company reports.
// Entry shape: { slug, ticker, quarter, period, reported (YYYY-MM-DD), headline, summary, metrics: [[label, value, change]],
//   points: [..], guidance?, reaction?, sources: [[title, url]],
//   optional: updated (YYYY-MM-DD), tables: [{ title, head: [..], rows: [[..]], note? }], analysis: [[heading, [paragraphs]]],
//   analysisNote?, watch: [..], faq: [[question, answer]] }
export function buildResults(ctx) {
  const { SITE, ORG, crumbs, esc, list, fmtDate, profiles, results } = ctx;
  const ext = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const sorted = [...results].filter((r) => profiles[r.ticker]).sort((a, b) => b.reported.localeCompare(a.reported));
  const pages = sorted.map((r) => {
    const p = profiles[r.ticker];
    const path = `/results/${r.slug}`;
    const others = sorted.filter((x) => x.ticker === r.ticker && x.slug !== r.slug).slice(0, 4);
    return {
      path, guide: true, lastmod: r.updated || r.reported,
      title: ((t) => (t.length > 70 ? t.split(",")[0] : t))(`${p.name} ${r.quarter} Earnings: ${r.headline}`), // "earnings" is the word people search; a long headline keeps its first clause
      description: r.summary.slice(0, 158),
      body: `<div class="oa-guide"><h1>${esc(p.name)} ${esc(r.quarter)} results</h1><!--oa-answer--><p>${esc(p.name)} (<a href="/stocks/${r.ticker.toLowerCase()}">${r.ticker}</a>) reported results for ${esc(r.period || r.quarter)} on ${fmtDate(r.reported)}. ${esc(r.headline)}.</p>
${r.metrics?.length ? `<h2>The numbers</h2><table><thead><tr><th>Measure</th><th>${esc(r.quarter)}</th><th>Change</th></tr></thead><tbody>${r.metrics.map(([l, v, c]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td><td>${esc(c || "")}</td></tr>`).join("")}</tbody></table>` : ""}
${(r.tables || []).map((t) => `<h2>${esc(t.title)}</h2><table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>${t.note ? `<p class="oa-note">${esc(t.note)}</p>` : ""}`).join("\n")}
${r.points?.length ? `<h2>What stood out</h2>${list(r.points.map(esc))}` : ""}
${r.analysis?.length ? `<h2>Analysis</h2>${r.analysis.map(([h, ps]) => `<h3>${esc(h)}</h3>${[].concat(ps).map((x) => `<p>${esc(x)}</p>`).join("")}`).join("")}${r.analysisNote ? `<p class="oa-note">${esc(r.analysisNote)}</p>` : ""}` : ""}
${r.guidance ? `<h2>Outlook</h2><p>${esc(r.guidance)}</p>` : ""}
${r.reaction ? `<h2>How the shares reacted</h2><p>${esc(r.reaction)}</p>` : ""}
${r.watch?.length ? `<h2>What to watch next</h2>${list(r.watch.map(esc))}` : ""}
${r.faq?.length ? `<h2>Questions and answers</h2>${r.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : ""}
<h2>More on ${esc(p.name)}</h2>${list([`<a href="/stocks/${r.ticker.toLowerCase()}">${r.ticker} stock: live price, filings, insider trades and contracts</a>`, chartLinkHtml(r.ticker, `results:${r.slug}`, esc), ...others.map((x) => `<a href="/results/${x.slug}">${esc(p.name)} ${esc(x.quarter)} results</a>`), ...(r.ticker === "SPCX" ? [`<a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>`] : []), `<a href="/results">All space stock results</a>`, `<a href="/space-stocks/earnings-calendar">Space stocks earnings calendar</a>`])}
${r.sources?.length ? `<h2>Sources</h2>${list(r.sources.map(([t, u]) => ext(u, t)))}` : ""}
<p class="oa-note">Figures as reported by the company; changes are against the same quarter a year earlier unless stated. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(r.summary),
      ld: [ORG, { "@type": "NewsArticle", headline: `${p.name} ${r.quarter} results: ${r.headline}`.slice(0, 110), datePublished: r.reported, dateModified: r.updated || r.reported, description: r.summary, url: SITE + path, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, about: { "@type": "Corporation", name: p.name, tickerSymbol: r.ticker } }, ...(r.faq?.length ? [{ "@type": "FAQPage", mainEntity: r.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] : []), crumbs([["Home", "/"], ["Results", "/results"], [`${r.ticker} ${r.quarter}`, path]])],
    };
  });
  // The index doubles as the reporting-season scoreboard: who has reported this quarter, with the
  // headline numbers, and who is still to come (from the earnings calendar).
  const { earnings = [], today = new Date().toISOString().slice(0, 10) } = ctx;
  const season = sorted[0]?.quarter || null;
  const inSeason = season ? sorted.filter((r) => r.quarter === season) : [];
  const done = new Set(inSeason.map((r) => r.ticker));
  const horizon = new Date(Date.parse(today) + 60 * 86_400_000).toISOString().slice(0, 10);
  const upcoming = (earnings || []).filter((e) => profiles[e.ticker] && !done.has(e.ticker) && e.date >= today && e.date <= horizon)
    .filter((e, i, a) => a.findIndex((x) => x.ticker === e.ticker) === i).sort((a, b) => a.date.localeCompare(b.date));
  const previews = previewTargets({ earnings, results: sorted, profiles, today });
  const rev = (r) => (r.metrics || []).find(([l]) => /^revenue$/i.test(l)) || (r.metrics || []).find(([l]) => /^(total )?revenue/i.test(l)) || null;
  const coLink = (t) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)}</a>`;
  const index = {
    path: "/results", guide: true, lastmod: sorted[0]?.reported,
    title: season ? `${season} Space Stock Earnings: Results Scoreboard | Orbit Alpha` : "Space Stock Earnings Results: Latest Quarterly Results by Company | Orbit Alpha",
    description: season ? `Every listed space company's ${season} results as they report: revenue, profit, guidance and the share reaction, plus who reports next.` : "The latest quarterly results from listed space companies, published on results day: revenue, profit, guidance, key points and how the shares reacted.",
    body: `<div class="oa-guide"><h1>${season ? `${esc(season)} space stock results` : "Space stock results"}</h1><!--oa-answer--><p>Quarterly results from the listed space companies Orbit Alpha covers, written up on the day each company reports, with the headline numbers, what stood out, the outlook and the share price reaction. This page updates as each company reports.</p>
${inSeason.length ? `<h2>Reported so far</h2><table><thead><tr><th>Company</th><th>Reported</th><th>Revenue</th><th>Change</th><th>Headline</th></tr></thead><tbody>${inSeason.map((r) => { const m = rev(r); return `<tr><td>${coLink(r.ticker)} (${r.ticker})</td><td>${fmtDate(r.reported)}</td><td>${m ? esc(m[1]) : ""}</td><td>${m ? esc(m[2] || "") : ""}</td><td><a href="/results/${r.slug}">${esc(r.headline)}</a></td></tr>`; }).join("")}</tbody></table>` : "<p>Results pages appear here from the start of the reporting season.</p>"}
${upcoming.length ? `<h2>Still to report</h2><table><thead><tr><th>Date</th><th>Company</th><th>Timing</th><th>Consensus EPS</th><th>Preview</th></tr></thead><tbody>${upcoming.map((e) => `<tr><td>${fmtDate(e.date)}${e.confirmed ? "" : " (expected)"}</td><td>${coLink(e.ticker)} (${e.ticker})</td><td>${esc(e.time || "")}</td><td>${esc(e.epsEst || "")}</td><td>${previews[e.ticker]?.mode === "ahead" ? `<a href="/earnings-preview/${e.ticker.toLowerCase()}">Preview</a>` : ""}</td></tr>`).join("")}</tbody></table><p>Dates from the Nasdaq earnings calendar unless confirmed by the company. Full list on the <a href="/space-stocks/earnings-calendar">earnings calendar</a>.</p>` : `<p>Upcoming dates are on the <a href="/space-stocks/earnings-calendar">earnings calendar</a>.</p>`}
${sorted.length > inSeason.length ? `<h2>Earlier results</h2>${list(sorted.filter((r) => r.quarter !== season).slice(0, 40).map((r) => `<a href="/results/${r.slug}">${esc(profiles[r.ticker].name)} (${r.ticker}) ${esc(r.quarter)}</a>: ${esc(r.headline)} (${fmtDate(r.reported)})`))}` : ""}
<p class="oa-note">Figures as reported by each company. Orbit Alpha is information, not investment advice.</p></div>`,
    answer: inSeason.length ? `${inSeason.length === 1 ? "One listed space company has" : `${inSeason.length} listed space companies have`} reported ${season} results so far: ${inSeason.slice(0, 4).map((r) => `${profiles[r.ticker].name} (${r.headline})`).join("; ")}.${upcoming.length ? ` Next to report: ${upcoming.slice(0, 3).map((e) => `${profiles[e.ticker].name} on ${fmtDate(e.date)}`).join(", ")}.` : ""}` : "",
    ld: [ORG, crumbs([["Home", "/"], ["Results", "/results"]])],
  };
  return [...pages, index];
}
