// Runs after `vite build`. Writes one static HTML file per route so search engines and link
// previews (Reddit, X) see the right title, description, structured data and real written
// content for every page, then React takes over in the browser. Also writes sitemap.xml and robots.txt.
// Keep titles/descriptions in step with routeMeta() in src/App.jsx.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { COVERED as profiles, ETFS, SECTOR_ORDER } from "../lib/roster.js";
import { MARKET_PAGES, GUIDES, GUIDE_LIST, GUIDE_GROUPS } from "../lib/pagemeta.js";
import { withConfirmed } from "../lib/earnings-confirmed.js";
import { buildGuides } from "./guides.mjs";
import { stockCard, OG_COLORS } from "./og.mjs";

const SITE = "https://www.orbitalpha.cloud";
const X_HANDLE = "OrbitAlphaApp";
const REDDIT = "https://www.reddit.com/r/SpaceCapital/";
const DIST = new URL("../dist/", import.meta.url);
const template = readFileSync(new URL("index.html", DIST), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ext = (href, text) => `<a href="${href}" rel="noopener" target="_blank">${text}</a>`;
const stockLink = (t) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)} (${t})</a>`;
const bySector = Object.fromEntries(SECTOR_ORDER.map((s) => [s, Object.keys(profiles).filter((t) => profiles[t].sector === s)]));
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const yahoo = (t) => `https://finance.yahoo.com/quote/${profiles[t].yahoo || t}`;
const edgar = (t) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${t}&type=&dateb=&owner=include&count=40`;

const SECTOR_TEXT = {
  "Launch": "Launch companies build and fly the rockets that put satellites, crew and cargo into orbit.",
  "Satellite Comms": "Satellite communications companies run constellations that carry broadband, phone, broadcast and government traffic.",
  "Earth Observation": "Earth observation companies image and measure the planet from orbit and sell the data to governments and businesses.",
  "Space Infrastructure": "Space infrastructure companies make the satellites, components and systems that the rest of the industry depends on.",
  "Exploration": "Exploration companies work on lunar landers, space stations and human spaceflight.",
};

const sources = `<h2>Where the data comes from</h2><p>Prices come from ${ext("https://finance.yahoo.com/", "Yahoo Finance")}, company filings and insider trades from the SEC's ${ext("https://www.sec.gov/edgar/search/", "EDGAR")} database, US government contract awards from ${ext("https://www.usaspending.gov/", "USAspending.gov")}, and launch schedules from public launch trackers. Orbit Alpha is information, not investment advice.</p>`;
const sectorDirectory = `<h2>Space stocks we cover, by sector</h2>${SECTOR_ORDER.map((s) => `<h3>${s}</h3><p>${SECTOR_TEXT[s]}</p>${list(bySector[s].map(stockLink))}`).join("")}<h3>Space ETFs and funds</h3>${list(Object.entries(ETFS).map(([t, e]) => `${esc(e.name)} (${t})`))}`;
const footer = `<p>Orbit Alpha is a free space stocks dashboard and weekly newsletter covering ${Object.keys(profiles).length} listed space companies, with live prices, launches, earnings dates, SEC filings, insider trades and US government contracts in one place.</p><nav aria-label="Site"><ul><li><a href="/">Home</a></li><li><a href="/markets">Live space stocks dashboard</a></li><li><a href="/markets/performance">Performance vs the S&amp;P 500</a></li><li><a href="/news">News, filings and contracts</a></li><li><a href="/newsletter">Free weekly newsletter</a></li><li><a href="/about">About</a></li><li><a href="/guides">Space stock guides</a></li>${GUIDE_LIST.map(([p, g]) => `<li><a href="${p}">${esc(g.label)}</a></li>`).join("")}<li>${ext(`https://x.com/${X_HANDLE}`, "Orbit Alpha on X")}</li><li>${ext(REDDIT, "r/SpaceCapital on Reddit")}</li></ul></nav>`;
const share = (path, text) => {
  const u = encodeURIComponent(SITE + path), t = encodeURIComponent(text);
  return `<p>Follow Orbit Alpha on ${ext(`https://x.com/${X_HANDLE}`, `X (@${X_HANDLE})`)} and join the discussion on ${ext(REDDIT, "r/SpaceCapital")}.</p><p>Share this page: ${ext(`https://x.com/intent/tweet?url=${u}&text=${t}`, "X")} · ${ext(`https://www.reddit.com/submit?url=${u}&title=${t}`, "Reddit")} · ${ext(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "LinkedIn")}</p>`;
};
const faq = (pairs) => ({
  html: `<h2>Frequently asked questions</h2>${pairs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`,
  ld: { "@type": "FAQPage", mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
});
const crumbs = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })) });
const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Orbit Alpha", url: SITE, logo: `${SITE}/icon-512.png`, sameAs: [`https://x.com/${X_HANDLE}`, REDDIT] };

// ── Live facts baked into the static HTML ─────────────────────────────────────────────
// Prices, market caps, YTD returns, earnings dates, filings and contracts are read from the
// live site's own API (the previous deployment) at build time, so search engines see real
// numbers on every stock page, not just a template. Every call is optional: if the API is slow
// or down the page is still written, just without that section. PRERENDER_OFFLINE=1 skips it.
const today = new Date().toISOString().slice(0, 10);
const OFFLINE = process.env.PRERENDER_OFFLINE === "1";
async function api(path, timeoutMs = 25000) {
  if (OFFLINE) return null;
  try {
    const res = await fetch(SITE + path, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "orbit-alpha-prerender" } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
// Run fn over items a few at a time, so the build doesn't hammer the API (or SEC behind it).
async function pool(items, size, fn) {
  const out = {};
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.all(batch.map(fn));
    batch.forEach((item, j) => { out[item] = results[j]; });
  }
  return out;
}

const tickers = Object.keys(profiles);
const usTickers = tickers.filter((t) => !profiles[t].listing);
const secTickers = usTickers.filter((t) => t !== "MDA"); // SEC filers (MDA Space reports in Canada)
const form4Tickers = secTickers.filter((t) => t !== "TSAT"); // Telesat is a foreign private issuer: no Form 4s
const [quotesRes, perfRes, earningsRes, perf1mo, perf3mo, perf1y] = await Promise.all([
  api("/api/quotes"), api("/api/performance?range=ytd", 40000), api("/api/earnings"),
  api("/api/performance?range=1mo", 40000), api("/api/performance?range=3mo", 40000), api("/api/performance?range=1y", 40000),
]);
const perfBy = { ytd: perfRes, "1mo": perf1mo, "3mo": perf3mo, "1y": perf1y };
const filingsBy = await pool(usTickers, 6, (t) => api(`/api/filings?ticker=${t}`).then((d) => d?.filings || []));
const contractsFull = await pool(usTickers, 6, (t) => api(`/api/contracts?ticker=${t}`));
const contractsBy = Object.fromEntries(Object.entries(contractsFull).map(([t, d]) => [t, d?.awards || []]));
const finBy = await pool(secTickers, 4, (t) => api(`/api/filings?ticker=${t}&financials=1`, 30000));
const insidersBy = await pool(form4Tickers, 4, (t) => api(`/api/filings?ticker=${t}&insiders=1`, 30000));
const quotes = quotesRes?.quotes || {};
const quotesDate = quotesRes?.asOf ? quotesRes.asOf.slice(0, 10) : null;
const ytdBy = Object.fromEntries((perfRes?.series || []).filter((s) => s.kind === "stock").map((s) => [s.id, [...s.values].reverse().find((v) => v != null)]));
const nextEarnings = {};
const earningsList = withConfirmed(Array.isArray(earningsRes) ? earningsRes : [], today);
earningsList.forEach((e) => { if (e.date >= today && !nextEarnings[e.ticker]) nextEarnings[e.ticker] = e; });
console.log(`prerender: ${Object.values(finBy).filter((d) => d?.snapshot).length} financials, ${Object.values(insidersBy).filter((d) => d?.m12).length} insider summaries`);
console.log(`prerender: facts for ${Object.keys(quotes).length} quotes, ${Object.keys(ytdBy).length} YTD, ${Object.values(filingsBy).filter((f) => f.length).length} filings lists, ${Object.values(contractsBy).filter((c) => c.length).length} contract lists`);

const CUR = { USD: "$", EUR: "€", GBP: "£", CAD: "C$", SEK: "SEK ", DKK: "DKK ", NOK: "NOK " };
const fmtPrice = (p, cur = "USD") => (cur === "GBp" ? `${p.toFixed(1)}p` : `${CUR[cur] ?? cur + " "}${p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(2) : p.toFixed(3)}`);
const fmtCap = (n) => (n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : `$${(n / 1e6).toFixed(0)}M`);
const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtUsd = (n) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const fmtDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const latest = (...dates) => dates.filter(Boolean).sort().pop() || null;

function stockFacts(t, name) {
  const q = quotes[t], ytd = ytdBy[t], e = nextEarnings[t];
  const filings = (filingsBy[t] || []).slice(0, 5), awards = (contractsBy[t] || []).slice(0, 5);
  const rows = [];
  if (q?.price != null) rows.push(`Share price: ${fmtPrice(q.price, q.currency)}${q.changePct != null ? ` (${fmtPct(q.changePct)} on the day)` : ""}`);
  if (q?.marketCap) rows.push(`Market cap: ${fmtCap(q.marketCap)}`);
  if (ytd != null) rows.push(`Year to date: ${fmtPct(ytd)}`);
  if (e) rows.push(`Next earnings: ${fmtDate(e.date)}${e.time && e.time !== "Time TBC" ? `, ${e.time.toLowerCase()}` : ""}${e.epsEst ? ` (consensus EPS ${esc(e.epsEst)})` : ""}`);
  let html = "";
  if (rows.length) html += `<h2>${esc(name)} (${t}) stock at a glance</h2>${list(rows)}<p>Figures as of ${fmtDate(quotesDate || today)}. Prices on the live page update through the trading day.</p>`;
  if (filings.length) html += `<h2>Latest ${esc(name)} SEC filings</h2>${list(filings.map((f) => `${fmtDate(f.date)}: ${esc(f.label || f.form)}${f.owner ? `, ${esc(f.owner)}${f.role ? ` (${esc(f.role)})` : ""}` : ""}${f.value ? `, ${fmtUsd(f.value)}` : ""} (Form ${esc(f.form)})`))}`;
  if (awards.length) html += `<h2>Recent ${esc(name)} government contracts</h2>${list(awards.map((a) => `${fmtDate(a.start)}: ${fmtUsd(a.amount)} from ${esc(a.subAgency || a.agency)}${a.description ? `, ${esc(a.description.slice(0, 140))}` : ""}`))}`;
  return { html, lastmod: latest(filings[0]?.date, awards[0]?.start, stories.find((x) => x.tickers?.includes(t))?.published?.slice(0, 10)) };
}
const newestFiling = latest(...Object.values(filingsBy).map((f) => f[0]?.date));
const newestAward = latest(...Object.values(contractsBy).map((a) => a[0]?.start));
const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
const issueDate = (() => {
  try {
    const [d, m, y] = JSON.parse(readFileSync(new URL("../src/issues.json", import.meta.url), "utf8"))[0].date.split(" ");
    return MONTHS[m] ? `${y}-${MONTHS[m]}-${d.padStart(2, "0")}` : null;
  } catch {
    return null;
  }
})();
const tradingDay = quotesDate || perfRes?.asOf || null;

// Full newsletter issues (written by scripts/update-issue.mjs from the Beehiiv feed).
const issueArchive = JSON.parse(readFileSync(new URL("../src/issueArchive.json", import.meta.url), "utf8"));
const issueHtml = (n) => {
  try { return JSON.parse(readFileSync(new URL(`../public/issues/${n}.json`, import.meta.url), "utf8")).html; } catch { return ""; }
};
// Orbit Alpha news briefs (src/stories.json), newest first.
const stories = JSON.parse(readFileSync(new URL("../src/stories.json", import.meta.url), "utf8"));
const storiesHtml = (items, heading) => items.length ? `<h2>${heading}</h2>${items.map((x) => `<article><p>${fmtDate(x.published.slice(0, 10))}${x.tickers?.length ? ` · ${x.tickers.map((t) => (profiles[t] ? `<a href="/stocks/${t.toLowerCase()}">${t}</a>` : esc(t))).join(", ")}` : ""}</p><h3>${esc(x.title)}</h3>${String(x.body || "").split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}${x.source?.url ? `<p>Source: <a href="${esc(x.source.url)}" rel="noopener" target="_blank">${esc(x.source.name || "original report")}</a></p>` : ""}</article>`).join("")}` : "";
const issueLink = (x) => `<a href="/newsletter/issue-${x.issue}">Issue ${x.issue}: ${esc(x.title)}</a>`;

const count = Object.keys(profiles).length;
const homeFaq = faq([
  ["What are space stocks?", "Space stocks are publicly traded companies whose business is mainly in space: rocket launch, satellite communications, Earth observation, spacecraft and component manufacturing, and lunar and human spaceflight."],
  ["Is Orbit Alpha free?", "Yes. The live dashboard and the weekly newsletter are both free, with no paywall."],
  ["How often is the data updated?", "Prices refresh every minute or so during market hours. Filings, contracts, launches and news update throughout the day."],
  ["Which space stocks does Orbit Alpha cover?", `${count} listed space companies across the US, Canada and Europe, including SpaceX, Rocket Lab, AST SpaceMobile, Planet Labs, Eutelsat and OHB, plus the main space ETFs.`],
]);

const routes = [
  {
    path: "/",
    title: "Orbit Alpha: Space Stocks Newsletter and Live Dashboard",
    description: "Free weekly newsletter and live dashboard covering every space stock: prices, launches, earnings, SEC filings and government contracts.",
    body: `<h1>Orbit Alpha: the space stocks newsletter and dashboard</h1>
<p>Orbit Alpha tracks ${count} publicly traded space companies in one place. The space stocks dashboard shows live prices, market caps and daily moves, alongside the things that actually move these stocks: rocket launches, US government contract awards, SEC filings, insider trades and earnings dates.</p>
<p>The free Orbit Alpha newsletter lands every Sunday with the week in space stocks, analyst target changes and one deep dive on a single company. It is written for investors who follow the sector closely and want the numbers without the hype.</p>
<h2>What you can do on Orbit Alpha</h2>${list([
      `<a href="/markets">Check live prices</a> for every space stock and space ETF, sorted by size, sector or daily move.`,
      `<a href="/markets/performance">Compare performance</a> of space stocks and ETFs against the S&amp;P 500 and Nasdaq 100.`,
      `<a href="/markets/launches">Follow upcoming launches</a> tagged to the listed companies flying or building the payloads.`,
      `<a href="/markets/contracts">See government contract wins</a> from NASA, the Space Force and other US agencies.`,
      `<a href="/markets/filings">Read SEC filings and insider trades</a> as they are published.`,
      `<a href="/newsletter">Subscribe to the newsletter</a> for a weekly briefing.`,
    ])}<h2>Space stock guides</h2>${GUIDE_GROUPS.map(([id, name]) => `<h3>${esc(name)}</h3>${list(GUIDE_LIST.filter(([, g]) => g.group === id).map(([p, g]) => `<a href="${p}">${esc(g.label)}</a>`))}`).join("")}<p><a href="/guides">All space stock guides</a></p>${sectorDirectory}${sources}${homeFaq.html}`,
    lastmod: tradingDay,
    ld: [ORG, { "@type": "WebSite", "@id": `${SITE}/#site`, name: "Orbit Alpha", url: SITE, publisher: { "@id": `${SITE}/#org` } }, homeFaq.ld],
  },
  {
    path: "/markets/performance",
    title: MARKET_PAGES.performance.title,
    description: MARKET_PAGES.performance.description,
    lastmod: perfRes?.asOf || tradingDay,
    body: `<h1>Space stocks vs the S&amp;P 500</h1>
<p>This page compares the performance of space stocks and space ETFs against the S&amp;P 500 and Nasdaq 100 over one month, three months, six months, year to date and one year. Every line starts at zero on the first trading day of the period, so you can see at a glance whether space stocks have beaten the wider market.</p>
<p>The sector summary splits the space stocks we cover into launch, satellite communications, Earth observation, space infrastructure and exploration, and shows each sector's equal-weighted return with its best and worst performer. Tick any stock to add it to the chart.</p>
<h2>Space ETFs compared</h2>${list(Object.entries(ETFS).map(([t, e]) => `${esc(e.name)} (${t})`))}${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["Markets", "/markets"], ["Performance", "/markets/performance"]])],
  },
  ...["", "launches", "earnings", "contracts", "filings"].map((tab) => {
    const { label, title, description, text } = MARKET_PAGES[tab];
    return {
      path: tab ? `/markets/${tab}` : "/markets",
      title,
      description,
      lastmod: { contracts: newestAward, filings: newestFiling }[tab] || tradingDay,
      body: `<h1>Space stocks ${label.toLowerCase()}</h1><p>${text}</p><p>Orbit Alpha's space stocks ${label.toLowerCase()} page is part of a free dashboard covering ${count} listed space companies and the main space ETFs. Data updates through the trading day.</p>${sectorDirectory}${sources}`,
      ld: [crumbs([["Home", "/"], ["Markets", "/markets"], ...(tab ? [[label, `/markets/${tab}`]] : [])])],
    };
  }),
  {
    path: "/news", title: "Space Stock News, Filings and Contract Wins | Orbit Alpha", lastmod: latest(newestFiling, newestAward, stories[0]?.published?.slice(0, 10)),
    description: "Live space stock news, SEC filings, insider trades and government contract wins in one feed, filterable by company.",
    body: `<h1>Space stock news</h1><p>One feed for everything that moves space stocks: news headlines from financial and industry sources, SEC filings and insider trades, and US government contract wins. Filter by company to follow just the stocks you hold, or by type to see only filings or contracts.</p><p>Key stories, such as large contracts, insider buying and share offerings, are highlighted so they stand out from routine news.</p>${storiesHtml(stories.slice(0, 10), "From Orbit Alpha")}${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["News", "/news"]])],
  },
  {
    path: "/newsletter", lastmod: issueDate, title: "The Orbit Alpha Newsletter | Free Weekly Space Stocks Briefing",
    description: "Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free.",
    body: `<h1>The Orbit Alpha newsletter</h1><p>Every Sunday the Orbit Alpha newsletter sums up the week in space stocks: the biggest moves and why they happened, analyst rating and price target changes, contract wins, launches and filings worth knowing about, and one deep dive on a single company.</p><p>The newsletter is free, with no paywall. It is written for investors who follow space stocks and want clear, sourced numbers rather than hype. You can unsubscribe at any time.</p><h2>What each issue covers</h2>${list(["The week's biggest space stock moves and what drove them", "Analyst upgrades, downgrades and price target changes", "Government contract wins and notable SEC filings", "Launches and events coming up next week", "A deep dive on one company"])}${issueArchive.length ? `<h2>Past issues</h2>${list(issueArchive.map(issueLink))}` : ""}${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["Newsletter", "/newsletter"]])],
  },
  {
    path: "/about", title: "About | Orbit Alpha",
    description: "What Orbit Alpha is, which space stocks it covers and where its data comes from.",
    body: `<h1>About Orbit Alpha</h1><p>Orbit Alpha is a free dashboard and weekly newsletter for investors who follow listed space companies. It tracks ${count} stocks in the US and Europe, plus the main space ETFs, with prices, SEC filings, insider trades, financials, US government contracts, earnings dates and launches in one place.</p><p>It does not cover Lockheed Martin, Boeing or Northrop Grumman, where space is a small part of a much larger business.</p><h2>How the figures are worked out</h2>${list(["Year-to-date returns run from the last close of the previous year. Sector figures are the median of the stocks tracked in that sector.", "Financials come from the figures companies tag in their 10-Q and 10-K filings. The last 12 months are the latest full year plus this year to date, minus the same period last year.", "Cash runway is cash and short-term investments divided by the last 12 months of free cash outflow, assuming no new funding.", "Insider trades are open-market buys and sales from Form 4 filings. Grants, option exercises and shares withheld for tax are left out.", "Share counts come from the cover of each 10-Q and 10-K, adjusted for reverse splits."])}<p>Orbit Alpha is information, not investment advice. Check the original filing before acting on any figure.</p>${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["About", "/about"]])],
  },
  ...Object.entries(profiles).map(([t, p]) => {
    const peers = bySector[p.sector].filter((x) => x !== t);
    const us = !p.listing;
    const q = faq([
      [`What does ${p.name} do?`, p.about],
      [`Where is ${p.name} stock listed?`, us ? `${p.name} trades in the US under the ticker ${t}.` : `${p.name} is listed on ${p.listing} under the ticker ${t}, and Orbit Alpha shows its price in its trading currency.`],
      [`Which companies are similar to ${p.name}?`, `Other ${p.sector.toLowerCase()} stocks on Orbit Alpha include ${peers.slice(0, 5).map((x) => profiles[x].name).join(", ")}.`],
      [`Where does Orbit Alpha get ${t} data?`, us ? "Prices from Yahoo Finance, filings and insider trades from SEC EDGAR, and contract awards from USAspending.gov." : "Prices from Yahoo Finance, with news and launches from public sources. Non-US listings do not file with the SEC."],
    ]);
    const facts = stockFacts(t, p.name);
    const quote = quotes[t];
    const og = {
      ticker: t, name: p.name, sector: p.sector, path: `/stocks/${t.toLowerCase()}`,
      asOf: quote?.price != null ? fmtDate(quotesDate || today) : null,
      stats: [
        ...(quote?.price != null ? [["Price", fmtPrice(quote.price, quote.currency)]] : []),
        ...(ytdBy[t] != null ? [["Year to date", fmtPct(ytdBy[t]), ytdBy[t] >= 0 ? OG_COLORS.green : OG_COLORS.red]] : []),
        ...(quote?.marketCap ? [["Market cap", fmtCap(quote.marketCap)]] : []),
      ],
    };
    return {
      og,
      path: `/stocks/${t.toLowerCase()}`,
      lastmod: facts.lastmod,
      title: `${t} Stock: ${p.name} News, Filings and Contracts | Orbit Alpha`,
      description: p.listing
        ? `${p.name} (${t}, ${p.listing}) live price, chart, news and launches. ${p.about}`
        : `${p.name} (${t}) live price, SEC filings, insider trades, government contracts, earnings date and launches. ${p.about}`,
      body: `<h1>${t} stock: ${esc(p.name)}</h1>
<p>${esc(p.about)}</p>
<p>This page tracks ${esc(p.name)} (${t}) stock in one place: the live ${t} share price and chart${us ? ", recent SEC filings and insider trades, US government contract awards, the next earnings date" : ` (listed on ${esc(p.listing)})`}, upcoming launches involving the company, and the latest ${esc(p.name)} news. ${esc(p.name)} is one of the ${count} space stocks Orbit Alpha covers, in the ${p.sector.toLowerCase()} sector. ${SECTOR_TEXT[p.sector]}</p>
${facts.html}
<h2>${esc(p.name)} key facts</h2>${list([`Ticker: ${t}`, `Listing: ${us ? "US (NYSE or Nasdaq)" : esc(p.listing)}`, `Sector: ${p.sector}`, `Prices shown in: ${p.currency === "GBp" ? "pence" : p.currency || "US dollars"}`, `On this page: ${us ? "live price and chart, SEC filings, insider trades, government contracts, earnings date, launches and news" : "live price and chart, launches and news"}`])}
${GUIDE_LIST.some(([, g]) => g.tickers?.includes(t)) ? `<h2>${esc(p.name)} guides</h2>${list(GUIDE_LIST.filter(([, g]) => g.tickers?.includes(t)).map(([gp, g]) => `<a href="${gp}">${esc(g.label)}</a>`))}` : ""}
${storiesHtml(stories.filter((x) => x.tickers?.includes(t)).slice(0, 5), `${esc(p.name)} news from Orbit Alpha`)}
${issueArchive.some((x) => x.tickers.includes(t)) ? `<h2>${esc(p.name)} in the Orbit Alpha newsletter</h2>${list(issueArchive.filter((x) => x.tickers.includes(t)).slice(0, 3).map(issueLink))}` : ""}
<h2>${esc(p.name)} research links</h2>${list([ext(yahoo(t), `${t} quote and financials on Yahoo Finance`), ...(us ? [ext(edgar(t), `${esc(p.name)} filings on SEC EDGAR`), ext(`https://www.usaspending.gov/search/?hash=&keyword=${encodeURIComponent(p.name)}`, `${esc(p.name)} awards on USAspending.gov`)] : [])])}
<h2>Other ${p.sector.toLowerCase()} stocks</h2>${list(peers.map(stockLink))}
${q.html}${sources}${share(`/stocks/${t.toLowerCase()}`, `${p.name} ($${t}): live price, filings and contracts`)}`,
      ld: [
        { "@type": "Corporation", name: p.name, tickerSymbol: t, description: p.about, url: `${SITE}/stocks/${t.toLowerCase()}` },
        crumbs([["Home", "/"], ["Markets", "/markets"], [`${t} stock`, `/stocks/${t.toLowerCase()}`]]),
        q.ld,
      ],
    };
  }),
  ...issueArchive.map((x, i) => {
    const path = `/newsletter/issue-${x.issue}`;
    const [newer, older] = [issueArchive[i - 1], issueArchive[i + 1]];
    return {
      path,
      lastmod: x.date,
      title: `${x.title} | Orbit Alpha Issue ${x.issue}`,
      description: x.description,
      body: `<article><p>Orbit Alpha Issue ${x.issue}${x.date ? ` · ${fmtDate(x.date)}` : ""}</p><h1>${esc(x.title)}</h1>${issueHtml(x.issue)}<p>${older ? `Previous: ${issueLink(older)}` : ""}${older && newer ? " · " : ""}${newer ? `Next: ${issueLink(newer)}` : ""}</p></article>`,
      ld: [
        ORG,
        { "@type": "Article", headline: x.title, description: x.description, datePublished: x.date, url: SITE + path, image: `${SITE}/og.png`, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, about: x.tickers.filter((t) => profiles[t]).map((t) => ({ "@type": "Corporation", name: profiles[t].name, tickerSymbol: t })) },
        crumbs([["Home", "/"], ["Newsletter", "/newsletter"], [`Issue ${x.issue}`, path]]),
      ],
    };
  }),
  ...buildGuides({
    SITE, profiles, ETFS, SECTOR_ORDER, quotes, ytdBy, perfBy, earnings: earningsList,
    filingsBy, contractsBy: contractsFull, finBy, insidersBy, asOf: tradingDay || today, today, count,
    esc, list, crumbs, ORG, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate,
  }),
];

function render({ path, title, description, body, ld = [], ogImage }) {
  const url = SITE + path;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${path.startsWith("/newsletter/issue-") ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="Orbit Alpha" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}${ogImage || "/og.png"}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@${X_HANDLE}" />`,
    `<meta name="twitter:image" content="${SITE}${ogImage || "/og.png"}" />`,
    ld.length ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": ld }).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n    ");
  return template
    .replace(/\s*<meta name="description"[^>]*>/, "") // drop the generic one from index.html
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root"><main class="pre">${body}${footer}</main></div>`);
}

// Share cards for stock pages. A failure here only means the generic site image is used.
let cards = 0;
mkdirSync(new URL("og/stocks/", DIST).pathname, { recursive: true });
for (const route of routes.filter((r) => r.og)) {
  try {
    const file = route.og.file || `og/stocks/${route.og.ticker.toLowerCase()}.png`; // guides set their own file
    mkdirSync(dirname(new URL(file, DIST).pathname), { recursive: true });
    writeFileSync(new URL(file, DIST), await stockCard(route.og));
    route.ogImage = `/${file}`;
    cards++;
  } catch (e) {
    console.log(`og: ${route.og.ticker} failed (${e.message})`);
  }
}
console.log(`og: drew ${cards} stock share cards`);

for (const route of routes) {
  // cleanUrls in vercel.json serves /stocks/rklb from stocks/rklb.html
  const file = new URL(route.path === "/" ? "index.html" : `.${route.path}.html`, DIST);
  mkdirSync(dirname(file.pathname), { recursive: true });
  writeFileSync(file, render(route));
}

const prio = (p) => (p === "/" ? "1.0" : p.startsWith("/stocks/") ? "0.8" : "0.6");
writeFileSync(
  new URL("sitemap.xml", DIST),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    // lastmod is the date the page's content last really changed (newest filing, contract, issue or
    // trading day), and is left out when unknown. A date that is always "today" teaches Google to ignore it.
    .map((r) => `  <url><loc>${SITE}${r.path}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}<changefreq>daily</changefreq><priority>${prio(r.path)}</priority></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(new URL("robots.txt", DIST), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`prerender: wrote ${routes.length} pages, sitemap.xml and robots.txt`);

// IndexNow: tell Bing, DuckDuckGo and other IndexNow search engines which pages changed today,
// so they recrawl without needing a Bing Webmaster account. Production deploys only; the key file
// public/${INDEXNOW_KEY}.txt proves the site owns the key. INDEXNOW_ALL=1 submits every page.
const INDEXNOW_KEY = "e4c892f1da1e8baa936548f9dcf68053";
if (process.env.VERCEL_ENV === "production" && !OFFLINE) {
  // Every page is submitted for the first few days after IndexNow went live (18 Oct 2026), then only changed ones.
  const all = process.env.INDEXNOW_ALL === "1" || today <= "2026-10-21";
  const changed = routes.filter((r) => all || r.lastmod === today || r.lastmod === tradingDay).map((r) => SITE + r.path);
  if (changed.length) {
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: "www.orbitalpha.cloud", key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: changed.slice(0, 10000) }),
        signal: AbortSignal.timeout(15000),
      });
      console.log(`indexnow: submitted ${changed.length} URLs (HTTP ${res.status})`);
    } catch (e) {
      console.log(`indexnow: skipped (${e.message})`);
    }
  }
}
