// "Read next" cards for static pages (lock-up calendar, articles): the newest Orbit Alpha analysis on
// the company, its latest results page and its live stock page. Most visitors read one page and leave,
// so these sit mid-page where readers finish the main answer, not in the footer.
// Clicks are captured in PostHog as `read_next_click` (listener in index.html, via data-next).
import { readFileSync } from "node:fs";

const load = (f) => JSON.parse(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8"));
const trim = (s, n = 170) => (s.length > n ? `${s.slice(0, s.lastIndexOf(" ", n - 1))}…` : s);

export function readNextHtml({ ticker, exclude = "", profiles, esc, placement, heading = "Read next", articles = load("articles.json"), results = load("results.json") }) {
  const p = profiles[ticker];
  if (!p) return "";
  const cards = [];
  for (const a of articles
    .filter((a) => !a.canonical && (a.tickers || []).includes(ticker) && `/articles/${a.slug}` !== exclude)
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, 1)) cards.push([`/articles/${a.slug}`, a.title, a.summary]);
  const r = results.filter((x) => x.ticker === ticker).sort((a, b) => b.reported.localeCompare(a.reported))[0];
  if (r && `/results/${r.slug}` !== exclude) cards.push([`/results/${r.slug}`, `${p.name} ${r.quarter} results: ${r.headline}`, r.summary]);
  const stock = `/stocks/${ticker.toLowerCase()}`;
  if (stock !== exclude) cards.push([stock, `${p.name} (${ticker}): live price, filings and contracts`, `Today's move, the latest SEC filings, insider trades, government contracts and the next results date for ${p.name}.`]);
  if (!cards.length) return "";
  return `<h2>${esc(heading)}</h2><div class="oa-hub-list oa-next">${cards.slice(0, 3).map(([href, t, s]) =>
    `<a class="oa-card" href="${href}" data-next="${esc(placement)}"><b>${esc(t)}</b><span>${esc(trim(String(s || "")))}</span></a>`).join("")}</div>`;
}
