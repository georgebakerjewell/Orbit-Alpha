// Runs after `vite build`. Writes one static HTML file per route so search engines and link
// previews (Reddit, X) see the right title, description, structured data and real written
// content for every page, then React takes over in the browser. Also writes sitemap.xml and robots.txt.
// Keep titles/descriptions in step with routeMeta() in src/App.jsx.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { COVERED as profiles, ETFS, SECTOR_ORDER } from "../lib/roster.js";

const SITE = "https://www.orbitalpha.cloud";
const X_HANDLE = "OrbitAlphaApp";
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
const footer = `<p>Orbit Alpha is a free space stocks dashboard and weekly newsletter covering ${Object.keys(profiles).length} listed space companies, with live prices, launches, earnings dates, SEC filings, insider trades and US government contracts in one place.</p><nav aria-label="Site"><ul><li><a href="/">Home</a></li><li><a href="/markets">Live space stocks dashboard</a></li><li><a href="/markets/performance">Performance vs the S&amp;P 500</a></li><li><a href="/news">News, filings and contracts</a></li><li><a href="/newsletter">Free weekly newsletter</a></li><li><a href="/about">About</a></li><li>${ext(`https://x.com/${X_HANDLE}`, "Orbit Alpha on X")}</li></ul></nav>`;
const share = (path, text) => {
  const u = encodeURIComponent(SITE + path), t = encodeURIComponent(text);
  return `<p>Share this page: ${ext(`https://x.com/intent/tweet?url=${u}&text=${t}`, "X")} · ${ext(`https://www.reddit.com/submit?url=${u}&title=${t}`, "Reddit")} · ${ext(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "LinkedIn")}</p>`;
};
const faq = (pairs) => ({
  html: `<h2>Frequently asked questions</h2>${pairs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`,
  ld: { "@type": "FAQPage", mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
});
const crumbs = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })) });
const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Orbit Alpha", url: SITE, logo: `${SITE}/icon-512.png`, sameAs: [`https://x.com/${X_HANDLE}`] };

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
    ])}${sectorDirectory}${sources}${homeFaq.html}`,
    ld: [ORG, { "@type": "WebSite", "@id": `${SITE}/#site`, name: "Orbit Alpha", url: SITE, publisher: { "@id": `${SITE}/#org` } }, homeFaq.ld],
  },
  {
    path: "/markets/performance",
    title: "Space Stocks vs the S&P 500: ETF and Stock Performance | Orbit Alpha",
    description: "Compare space ETFs (UFO, ARKX, ROKT, MARS, NASA) and every space stock we cover against the S&P 500 and Nasdaq 100.",
    body: `<h1>Space stocks vs the S&amp;P 500</h1>
<p>This page compares the performance of space stocks and space ETFs against the S&amp;P 500 and Nasdaq 100 over one month, three months, six months, year to date and one year. Every line starts at zero on the first trading day of the period, so you can see at a glance whether space stocks have beaten the wider market.</p>
<p>The sector summary splits the space stocks we cover into launch, satellite communications, Earth observation, space infrastructure and exploration, and shows each sector's equal-weighted return with its best and worst performer. Tick any stock to add it to the chart.</p>
<h2>Space ETFs compared</h2>${list(Object.entries(ETFS).map(([t, e]) => `${esc(e.name)} (${t})`))}${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["Markets", "/markets"], ["Performance", "/markets/performance"]])],
  },
  ...[
    ["", "Dashboard", "Live space stock prices, market caps and daily moves for every company Orbit Alpha covers, with a watchlist and filters by sector. Click any company for its full page with chart, filings, contracts and news."],
    ["launches", "Launches", "Upcoming orbital launches, tagged to the listed space companies flying the rocket or building the payload, so you can see which stocks have a launch coming up this week."],
    ["earnings", "Earnings", "Upcoming earnings dates for US-listed space stocks, with the reporting time and the consensus estimate where one is published."],
    ["contracts", "Contracts", "US government contract awards to listed space companies from NASA, the Space Force, the Department of Defense and other agencies, taken from USAspending.gov."],
    ["filings", "Filings", "The latest SEC filings from US-listed space companies: insider buys and sales, share offerings, major shareholder stakes and quarterly and annual reports."],
  ].map(([tab, label, text]) => ({
    path: tab ? `/markets/${tab}` : "/markets",
    title: `Space Stocks ${label} | Orbit Alpha`,
    description: "Live prices, launches, earnings dates, SEC filings and government contract awards for publicly traded space companies.",
    body: `<h1>Space stocks ${label.toLowerCase()}</h1><p>${text}</p><p>Orbit Alpha's space stocks ${label.toLowerCase()} page is part of a free dashboard covering ${count} listed space companies and the main space ETFs. Data updates through the trading day.</p>${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["Markets", "/markets"], ...(tab ? [[label, `/markets/${tab}`]] : [])])],
  })),
  {
    path: "/news", title: "Space Stock News, Filings and Contract Wins | Orbit Alpha",
    description: "Live space stock news, SEC filings, insider trades and government contract wins in one feed, filterable by company.",
    body: `<h1>Space stock news</h1><p>One feed for everything that moves space stocks: news headlines from financial and industry sources, SEC filings and insider trades, and US government contract wins. Filter by company to follow just the stocks you hold, or by type to see only filings or contracts.</p><p>Key stories, such as large contracts, insider buying and share offerings, are highlighted so they stand out from routine news.</p>${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["News", "/news"]])],
  },
  {
    path: "/newsletter", title: "The Orbit Alpha Newsletter | Free Weekly Space Stocks Briefing",
    description: "Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free.",
    body: `<h1>The Orbit Alpha newsletter</h1><p>Every Sunday the Orbit Alpha newsletter sums up the week in space stocks: the biggest moves and why they happened, analyst rating and price target changes, contract wins, launches and filings worth knowing about, and one deep dive on a single company.</p><p>The newsletter is free, with no paywall. It is written for investors who follow space stocks and want clear, sourced numbers rather than hype. You can unsubscribe at any time.</p><h2>What each issue covers</h2>${list(["The week's biggest space stock moves and what drove them", "Analyst upgrades, downgrades and price target changes", "Government contract wins and notable SEC filings", "Launches and events coming up next week", "A deep dive on one company"])}${sectorDirectory}${sources}`,
    ld: [crumbs([["Home", "/"], ["Newsletter", "/newsletter"]])],
  },
  {
    path: "/about", title: "About | Orbit Alpha",
    description: "What Orbit Alpha is, which space stocks it covers and where its data comes from.",
    body: `<h1>About Orbit Alpha</h1><p>Orbit Alpha is a free space stocks dashboard and weekly newsletter. It brings live prices, launches, earnings dates, SEC filings, insider trades and US government contract awards for ${count} listed space companies into one place, so investors can follow the sector without checking a dozen websites.</p><p>Orbit Alpha does not cover Lockheed Martin, Boeing or Northrop Grumman, whose space work is a small part of a much larger business. It focuses on companies where space is the main story.</p><p>Orbit Alpha is information, not investment advice. Always do your own research before investing.</p>${sectorDirectory}${sources}`,
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
    return {
      path: `/stocks/${t.toLowerCase()}`,
      title: `${t} Stock: ${p.name} News, Filings and Contracts | Orbit Alpha`,
      description: p.listing
        ? `${p.name} (${t}, ${p.listing}) live price, chart, news and launches. ${p.about}`
        : `${p.name} (${t}) live price, SEC filings, insider trades, government contracts, earnings date and launches. ${p.about}`,
      body: `<h1>${t} stock: ${esc(p.name)}</h1>
<p>${esc(p.about)}</p>
<p>This page tracks ${esc(p.name)} (${t}) stock in one place: the live ${t} share price and chart${us ? ", recent SEC filings and insider trades, US government contract awards, the next earnings date" : ` (listed on ${esc(p.listing)})`}, upcoming launches involving the company, and the latest ${esc(p.name)} news. ${esc(p.name)} is one of the ${count} space stocks Orbit Alpha covers, in the ${p.sector.toLowerCase()} sector. ${SECTOR_TEXT[p.sector]}</p>
<h2>${esc(p.name)} key facts</h2>${list([`Ticker: ${t}`, `Listing: ${us ? "US (NYSE or Nasdaq)" : esc(p.listing)}`, `Sector: ${p.sector}`, `Prices shown in: ${p.currency === "GBp" ? "pence" : p.currency || "US dollars"}`, `On this page: ${us ? "live price and chart, SEC filings, insider trades, government contracts, earnings date, launches and news" : "live price and chart, launches and news"}`])}
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
];

function render({ path, title, description, body, ld = [] }) {
  const url = SITE + path;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Orbit Alpha" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@${X_HANDLE}" />`,
    `<meta name="twitter:image" content="${SITE}/og.png" />`,
    ld.length ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": ld }).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n    ");
  return template
    .replace(/\s*<meta name="description"[^>]*>/, "") // drop the generic one from index.html
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root"><main class="pre">${body}${footer}</main></div>`);
}

for (const route of routes) {
  // cleanUrls in vercel.json serves /stocks/rklb from stocks/rklb.html
  const file = new URL(route.path === "/" ? "index.html" : `.${route.path}.html`, DIST);
  mkdirSync(dirname(file.pathname), { recursive: true });
  writeFileSync(file, render(route));
}

const today = new Date().toISOString().slice(0, 10);
const prio = (p) => (p === "/" ? "1.0" : p.startsWith("/stocks/") ? "0.8" : "0.6");
writeFileSync(
  new URL("sitemap.xml", DIST),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${prio(r.path)}</priority></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(new URL("robots.txt", DIST), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`prerender: wrote ${routes.length} pages, sitemap.xml and robots.txt`);
