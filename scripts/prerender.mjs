// Runs after `vite build`. Writes one static HTML file per route so search engines and link
// previews (Reddit, X) see the right title, description and some real content for every page,
// then React takes over in the browser. Also writes sitemap.xml and robots.txt.
// Keep titles/descriptions in step with routeMeta() in src/App.jsx.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SITE = "https://www.orbitalpha.cloud";
const DIST = new URL("../dist/", import.meta.url);
const profiles = JSON.parse(readFileSync(new URL("../src/stocks.json", import.meta.url), "utf8"));
const template = readFileSync(new URL("index.html", DIST), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stockLinks = Object.entries(profiles)
  .map(([t, p]) => `<li><a href="/stocks/${t.toLowerCase()}">${t}: ${esc(p.name)}</a></li>`)
  .join("");
const footer = `<p><a href="/newsletter">Get the free Orbit Alpha newsletter every Sunday</a></p><h2>Space stocks we cover</h2><ul>${stockLinks}</ul>`;

const routes = [
  {
    path: "/",
    title: "Orbit Alpha: Space Stocks Newsletter and Live Dashboard",
    description: "Free weekly newsletter and live dashboard covering every space stock: prices, launches, earnings, SEC filings and government contracts.",
    body: "<h1>Orbit Alpha: the space stocks newsletter and dashboard</h1><p>Live prices, launches, earnings dates, SEC filings and government contracts for publicly traded space companies, plus a free weekly newsletter every Sunday.</p>",
  },
  ...[["", "Dashboard"], ["launches", "Launches"], ["earnings", "Earnings"], ["contracts", "Contracts"], ["filings", "Filings"]].map(([tab, label]) => ({
    path: tab ? `/markets/${tab}` : "/markets",
    title: `Space Stocks ${label} | Orbit Alpha`,
    description: "Live prices, launches, earnings dates, SEC filings and government contract awards for publicly traded space companies.",
    body: `<h1>Space stocks ${label.toLowerCase()}</h1><p>Live data for the space stocks Orbit Alpha covers.</p>`,
  })),
  { path: "/feed", title: "Space Stock News | Orbit Alpha", description: "Live news for space stocks from 30+ sources, filterable by company.", body: "<h1>Space stock news</h1><p>Live news from 30+ sources, filterable by company.</p>" },
  { path: "/newsletter", title: "The Orbit Alpha Newsletter | Free Weekly Space Stocks Briefing", description: "Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free.", body: "<h1>The Orbit Alpha newsletter</h1><p>Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free.</p>" },
  { path: "/about", title: "About | Orbit Alpha", description: "What Orbit Alpha is and how it is made.", body: "<h1>About Orbit Alpha</h1>" },
  ...Object.entries(profiles).map(([t, p]) => ({
    path: `/stocks/${t.toLowerCase()}`,
    title: `${t} Stock: ${p.name} News, Filings and Contracts | Orbit Alpha`,
    description: `${p.name} (${t}) live price, SEC filings, insider trades, government contracts, earnings date and launches. ${p.about}`,
    body: `<h1>${t} stock: ${esc(p.name)}</h1><p>${esc(p.about)}</p><p>Live price and chart, recent SEC filings and insider trades, US government contract awards, next earnings date, upcoming launches and the latest ${t} news.</p>`,
  })),
];

function render({ path, title, description, body }) {
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
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root"><main>${body}${footer}</main></div>`);
}

for (const route of routes) {
  // cleanUrls in vercel.json serves /stocks/rklb from stocks/rklb.html
  const file = new URL(route.path === "/" ? "index.html" : `.${route.path}.html`, DIST);
  mkdirSync(dirname(file.pathname), { recursive: true });
  writeFileSync(file, render(route));
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  new URL("sitemap.xml", DIST),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(new URL("robots.txt", DIST), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`prerender: wrote ${routes.length} pages, sitemap.xml and robots.txt`);
