// Question-led articles: /articles/<slug> and the /articles index, from src/articles.json.
// Question articles are written by the "Space stock question articles" scheduled task; news articles
// (kind: "news", optional match: [words that must appear in the matching headlines]) by the
// "Space stock news articles" task. News articles also appear on /news and stock pages (src/App.jsx).
// Entry shape:
//   { slug, title (the question, as people search it), h1?, summary (the direct answer, 2 to 3 sentences,
//     under 320 characters), published "YYYY-MM-DD", updated "YYYY-MM-DD", tickers: [..],
//     sections: [[heading, [block, ...]]], faq?: [[question, answer]], sources: [[title, url]] }
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
        headline: a.title, asOf: fmtDate(a.updated || a.published), stats: [], tagline: a.kind === "news" ? "What happened, checked against primary sources" : "A short, sourced answer, updated as news lands" } } : {}),
      title: `${a.title} | Orbit Alpha`,
      description: a.summary,
      body: `<div class="oa-guide"><h1>${esc(a.h1 || a.title)}</h1><!--oa-answer-->
${(a.sections || []).map(([h, blocks]) => `<h2>${esc(h)}</h2>${[].concat(blocks).map(block).join("")}`).join("\n")}
${a.faq?.length ? `<h2>Questions and answers</h2>${a.faq.map(([q, ans]) => `<h3>${esc(q)}</h3><p>${md(ans)}</p>`).join("")}` : ""}
<h2>More</h2>${list([...(a.tickers || []).flatMap((t) => [`<a href="/stocks/${t.toLowerCase()}">${t} stock: live price, filings and contracts</a>`, ...(profiles[t].listing ? [] : [chartLinkHtml(t, `article:${a.slug}`, esc)])]), ...related.map((x) => `<a href="/articles/${x.slug}">${esc(x.title)}</a>`), `<a href="/articles">All articles</a>`])}
${a.sources?.length ? `<h2>Sources</h2>${list(a.sources.map(([t, u]) => ext(u, t)))}` : ""}
<p class="oa-note">Published ${fmtDate(a.published)}${a.updated && a.updated !== a.published ? `, updated ${fmtDate(a.updated)}` : ""}. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(a.summary),
      ld: [ORG, { "@type": a.kind === "news" ? "NewsArticle" : "Article", headline: a.title.slice(0, 110), description: a.summary, datePublished: a.published, dateModified: a.updated || a.published, url: SITE + path, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, ...(a.tickers?.length ? { about: a.tickers.map((t) => ({ "@type": "Corporation", name: profiles[t].name, tickerSymbol: t })) } : {}) },
        ...(a.faq?.length ? [{ "@type": "FAQPage", mainEntity: a.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") } })) }] : []),
        crumbs([["Home", "/"], ["Articles", "/articles"], [a.title, path]])],
    };
  });

  const index = {
    path: "/articles", guide: true, lastmod: valid[0]?.updated || valid[0]?.published || asOf,
    title: "Space Stock News and Questions Answered | Orbit Alpha",
    description: "Sourced write-ups of the biggest space stock news, and short answers to the questions investors are asking: SpaceX, lock-ups, deals, launches and results.",
    body: `<div class="oa-guide oa-hub"><h1>Space stock news and questions, answered</h1><p class="oa-hub-lead">Sourced write-ups of the biggest space stock news, and short answers to what investors are asking right now.</p>
${valid.length ? `<div class="oa-hub-grid">${valid.map((a) => `<a class="oa-card" href="/articles/${a.slug}"><b>${esc(a.title)}</b><span>${esc(fmtDate(a.updated || a.published))}</span></a>`).join("")}</div>` : "<p>The first articles are on their way.</p>"}</div>`,
    ld: [ORG, crumbs([["Home", "/"], ["Articles", "/articles"]])],
  };
  return [...pages, index];
}
