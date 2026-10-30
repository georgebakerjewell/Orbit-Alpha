// Question-led articles: /articles/<slug> and the /articles index, from src/articles.json.
// Question articles are written by the "Space stock question articles" scheduled task; news articles
// (kind: "news", optional match: [words that must appear in the matching headlines]) by the
// "Space stock news articles" task. News articles also appear on /news and stock pages (src/App.jsx).
// Entry shape:
//   { slug, title (the question, as people search it), h1?, summary (the direct answer, 2 to 3 sentences,
//     under 320 characters), published "YYYY-MM-DD", updated "YYYY-MM-DD", tickers: [..],
//     sections: [[heading, [block, ...]]], faq?: [[question, answer]], sources: [[title, url]],
//     card?: { stat: "5x", label: "lease repayments vs AI profit", color?: "green"|"red"|"white" } }
// card draws the share image as one big centred number (news articles), so it survives Reddit's square crop.
// A block is a paragraph string, { list: [..] } or { table: { head: [..], rows: [[..]] } }.
// Text is escaped; [link text](/internal/path) becomes a link (internal paths only).
import { chartLinkHtml } from "../lib/affiliates.js";
export function buildArticles(ctx) {
  const { SITE, ORG, crumbs, esc, list, fmtDate, profiles, articles = [], asOf } = ctx;
  const ext = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const md = (s) => esc(s).replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  const block = (b) => typeof b === "string" ? `<p>${md(b)}</p>`
    : b.list ? list(b.list.map(md))
    : b.table ? `<table><thead><tr>${b.table.head.map((h) => `<th>${md(h)}</th>`).join("")}</tr></thead><tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${md(String(c ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : "";
  const valid = articles.filter((a) => a.slug && a.title && a.summary && (a.tickers || []).every((t) => profiles[t]))
    .sort((a, b) => (b.updated || b.published).localeCompare(a.updated || a.published));

  const pages = valid.map((a) => {
    const path = `/articles/${a.slug}`;
    const related = valid.filter((x) => x.slug !== a.slug && (x.tickers || []).some((t) => (a.tickers || []).includes(t))).slice(0, 4);
    return {
      path, guide: true, lastmod: a.updated || a.published,
      ...(a.tickers?.length ? { og: { file: `og/articles/${a.slug}.png`, ticker: a.tickers[0], name: profiles[a.tickers[0]].name, sector: a.kind === "news" ? "Space stock news" : "Question answered", path,
        headline: a.title, asOf: fmtDate(a.updated || a.published), stats: [], card: a.card, tagline: a.kind === "news" ? "What happened, checked against primary sources" : "A short, sourced answer, updated as news lands" } } : {}),
      title: `${a.title} | Orbit Alpha`,
      description: a.summary,
      body: `<div class="oa-guide"><h1>${esc(a.h1 || a.title)}</h1><!--oa-answer-->
${(a.sections || []).map(([h, blocks]) => `<h2>${esc(h)}</h2>${[].concat(blocks).map(block).join("")}`).join("\n")}
${a.faq?.length ? `<h2>Questions and answers</h2>${a.faq.map(([q, ans]) => `<h3>${esc(q)}</h3><p>${md(ans)}</p>`).join("")}` : ""}
<h2>More</h2>${list([...(a.tickers || []).flatMap((t) => [`<a href="/stocks/${t.toLowerCase()}">${t} stock: live price, filings and contracts</a>`, ...(profiles[t].listing ? [] : [chartLinkHtml(t, `article:${a.slug}`, esc)])]), ...related.map((x) => `<a href="/articles/${x.slug}">${esc(x.title)}</a>`), `<a href="/articles">All Orbit Alpha analysis</a>`])}
${a.sources?.length ? `<h2>Sources</h2>${list(a.sources.map(([t, u]) => ext(u, t)))}` : ""}
<p class="oa-note">Published ${fmtDate(a.published)}${a.updated && a.updated !== a.published ? `, updated ${fmtDate(a.updated)}` : ""}. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(a.summary),
      ld: [ORG, { "@type": a.kind === "news" ? "NewsArticle" : "Article", headline: a.title.slice(0, 110), description: a.summary, datePublished: a.published, dateModified: a.updated || a.published, url: SITE + path, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, ...(a.tickers?.length ? { about: a.tickers.map((t) => ({ "@type": "Corporation", name: profiles[t].name, tickerSymbol: t })) } : {}) },
        ...(a.faq?.length ? [{ "@type": "FAQPage", mainEntity: a.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") } })) }] : []),
        crumbs([["Home", "/"], ["Analysis", "/articles"], [a.title, path]])],
    };
  });

  // /articles hub ("Analysis" in the menu): Orbit Alpha's news articles first, then the question articles.
  const news = valid.filter((a) => a.kind === "news").sort((a, b) => b.published.localeCompare(a.published));
  const questions = valid.filter((a) => a.kind !== "news");
  const tags = (a) => (a.tickers || []).map((t) => `<i>${esc(t)}</i>`).join("");
  const companies = [...new Set(news.flatMap((a) => a.tickers || []))]
    .map((t) => [t, news.filter((a) => a.tickers.includes(t)).length]).sort((a, b) => b[1] - a[1]);
  const index = {
    path: "/articles", guide: true, lastmod: valid[0]?.updated || valid[0]?.published || asOf,
    title: "Space Stock News and Analysis | Orbit Alpha",
    description: "Orbit Alpha's own write-ups of the biggest space stock news, checked against primary sources, and short answers to the questions investors are asking right now.",
    body: `<div class="oa-guide oa-hub"><h1>Orbit Alpha analysis</h1><p class="oa-hub-lead">Our own write-ups of the space stock news that matters, checked against company releases, filings and regulators, plus short answers to what investors are asking.</p>
<p class="oa-hub-sub"><a href="#news">Latest news</a> · <a href="#questions">Questions answered</a> · <a href="/news">Headlines from around the web</a></p>
<h2 id="news">Latest news</h2>
${news.length ? `<div class="oa-hub-list">${news.map((a) => `<a class="oa-card" href="/articles/${a.slug}"><b>${esc(a.title)}${tags(a)}</b><span>${esc(fmtDate(a.published))} · ${esc(a.summary)}</span></a>`).join("")}</div>
${companies.length > 1 ? `<p class="oa-hub-sub">By company (our stories are also on each stock page):</p><div class="oa-hub-co">${companies.map(([t, n]) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)} (${n})</a>`).join("")}</div>` : ""}` : "<p>The first news articles are on their way.</p>"}
<h2 id="questions">Questions answered</h2>
${questions.length ? `<div class="oa-hub-grid">${questions.map((a) => `<a class="oa-card" href="/articles/${a.slug}"><b>${esc(a.title)}</b><span>${esc(fmtDate(a.updated || a.published))}</span></a>`).join("")}</div>` : ""}</div>`,
    ld: [ORG, crumbs([["Home", "/"], ["Analysis", "/articles"]])],
  };
  return [...pages, index];
}
