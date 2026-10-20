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
      title: `${p.name} (${r.ticker}) ${r.quarter} Results: ${r.headline} | Orbit Alpha`.slice(0, 120),
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
<h2>More on ${esc(p.name)}</h2>${list([`<a href="/stocks/${r.ticker.toLowerCase()}">${r.ticker} stock: live price, filings, insider trades and contracts</a>`, ...others.map((x) => `<a href="/results/${x.slug}">${esc(p.name)} ${esc(x.quarter)} results</a>`), ...(r.ticker === "SPCX" ? [`<a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>`] : []), `<a href="/results">All space stock results</a>`, `<a href="/space-stocks/earnings-calendar">Space stocks earnings calendar</a>`])}
${r.sources?.length ? `<h2>Sources</h2>${list(r.sources.map(([t, u]) => ext(u, t)))}` : ""}
<p class="oa-note">Figures as reported by the company; changes are against the same quarter a year earlier unless stated. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(r.summary),
      ld: [ORG, { "@type": "NewsArticle", headline: `${p.name} ${r.quarter} results: ${r.headline}`.slice(0, 110), datePublished: r.reported, dateModified: r.updated || r.reported, description: r.summary, url: SITE + path, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, about: { "@type": "Corporation", name: p.name, tickerSymbol: r.ticker } }, ...(r.faq?.length ? [{ "@type": "FAQPage", mainEntity: r.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] : []), crumbs([["Home", "/"], ["Results", "/results"], [`${r.ticker} ${r.quarter}`, path]])],
    };
  });
  const index = {
    path: "/results", guide: true, lastmod: sorted[0]?.reported,
    title: "Space Stock Earnings Results: Latest Quarterly Results by Company | Orbit Alpha",
    description: "The latest quarterly results from listed space companies, published on results day: revenue, profit, guidance, key points and how the shares reacted.",
    body: `<div class="oa-guide"><h1>Space stock results</h1><!--oa-answer--><p>Quarterly results from the listed space companies Orbit Alpha covers, written up on the day each company reports, with the headline numbers, what stood out, the outlook and the share price reaction. Upcoming dates are on the <a href="/space-stocks/earnings-calendar">earnings calendar</a>.</p>
${sorted.length ? `<h2>Latest results</h2>${list(sorted.slice(0, 60).map((r) => `<a href="/results/${r.slug}">${esc(profiles[r.ticker].name)} (${r.ticker}) ${esc(r.quarter)}</a>: ${esc(r.headline)} (${fmtDate(r.reported)})`))}` : "<p>Results pages appear here from the start of the third-quarter reporting season.</p>"}</div>`,
    answer: sorted.length ? `The latest space stock results on Orbit Alpha: ${sorted.slice(0, 3).map((r) => `${profiles[r.ticker].name} ${r.quarter} (${fmtDate(r.reported)})`).join("; ")}.` : "",
    ld: [ORG, crumbs([["Home", "/"], ["Results", "/results"]])],
  };
  return [...pages, index];
}
