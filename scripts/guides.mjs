// Evergreen guide pages (/space-stocks, /space-etfs and friends), built at deploy time from the
// same data the dashboard shows. Called by scripts/prerender.mjs, which passes in the data it has
// already fetched. Each guide still renders (with a short note) if a data source was unavailable.
// Titles and descriptions live in lib/pagemeta.js (GUIDES) so the app and the static HTML match.
import { GUIDES } from "../lib/pagemeta.js";

export function buildGuides(ctx) {
  const { SITE, profiles, ETFS, SECTOR_ORDER, quotes, ytdBy, perfBy, earnings, filingsBy, contractsBy, finBy, insidersBy, asOf, count,
    esc, list, crumbs, ORG, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate } = ctx;
  const link = (t) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)}</a>`;
  const tick = (t) => `<a href="/stocks/${t.toLowerCase()}">${t}</a>`;
  const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "-"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const asOfLine = (what) => `<p class="oa-note">${what} Figures as of ${fmtDate(asOf)}, refreshed whenever the site updates. Orbit Alpha is information, not investment advice.</p>`;
  const usTickers = Object.keys(profiles).filter((t) => !profiles[t].listing);
  const faq = (pairs) => ({
    html: `<h2>Frequently asked questions</h2>${pairs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`,
    ld: { "@type": "FAQPage", mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  });
  const moreGuides = (path) => `<h2>More space stock guides</h2>${list(Object.entries(GUIDES).filter(([p]) => p !== path).map(([p, g]) => `<a href="${p}">${esc(g.label)}</a>`))}`;
  const page = (path, h1, body, extraLd = [], lastmod = asOf) => ({
    path,
    title: GUIDES[path].title,
    description: GUIDES[path].description,
    lastmod,
    guide: true,
    body: `<div class="oa-guide"><h1>${h1}</h1>${body}${moreGuides(path)}</div>`,
    ld: [ORG, ...extraLd, crumbs([["Home", "/"], [GUIDES[path].label, path]])],
  });

  /* ── 1. The list of space stocks ─────────────────────────────────────────── */
  const capOf = (t) => quotes[t]?.marketCap || 0;
  const bySector = Object.fromEntries(SECTOR_ORDER.map((s) => [s, Object.keys(profiles).filter((t) => profiles[t].sector === s).sort((a, b) => capOf(b) - capOf(a))]));
  const ranked = Object.keys(profiles).filter(capOf).sort((a, b) => capOf(b) - capOf(a));
  const foreign = Object.keys(profiles).filter((t) => profiles[t].listing);
  const SECTOR_TEXT = {
    "Launch": "Rocket companies that carry satellites, cargo and crew to orbit, earning revenue per launch and increasingly from the spacecraft they build.",
    "Satellite Comms": "Operators of satellite networks for broadband, phone, broadcast and government communications, including the direct-to-device companies connecting ordinary phones to satellites.",
    "Earth Observation": "Companies that image and measure the Earth from orbit, selling optical, radar, radio-frequency and weather data to governments and businesses.",
    "Space Infrastructure": "Makers of the satellites, components, power systems and in-space services the rest of the industry depends on.",
    "Exploration": "Companies working on lunar landers, space stations and human spaceflight, much of it funded by NASA programmes.",
  };
  const listFaq = faq([
    ["How many space stocks are there?", `Orbit Alpha tracks ${count} listed companies whose business is mainly in space, across the US, Canada and Europe. Large defence and aerospace groups where space is a small share of revenue are left out.`],
    ...(ranked.length ? [["What is the biggest space stock?", `By market capitalisation, the largest space stock Orbit Alpha tracks is ${profiles[ranked[0]].name} (${ranked[0]}) at about ${fmtCap(capOf(ranked[0]))}, followed by ${ranked.slice(1, 3).map((t) => `${profiles[t].name} (${t})`).join(" and ")}.`]] : []),
    ["Are there space stocks listed in the UK and Europe?", `Yes. Orbit Alpha covers ${foreign.map((t) => `${profiles[t].name} (${profiles[t].listing})`).join(", ")}.`],
    ["Is there a space ETF instead of picking stocks?", "Several funds hold baskets of space companies, including the Procure Space ETF (UFO) and ARK Space ETF (ARKX). See the space ETFs comparison for their returns."],
  ]);
  const LISTING = { MDA: "Toronto (TSX)" };
  const listRows = (t) => [link(t), tick(t), esc(LISTING[t] || profiles[t].listing || "US"), quotes[t]?.price != null ? fmtPrice(quotes[t].price, quotes[t].currency) : null, capOf(t) ? fmtCap(capOf(t)) : null, ytdBy[t] != null ? fmtPct(ytdBy[t]) : null];
  const listPage = page("/space-stocks", "List of space stocks",
    `<p>These are the ${count} publicly traded companies Orbit Alpha follows whose business is mainly in space. They are grouped by what they do and sorted by market capitalisation within each group. Click any company for its live price, SEC filings, insider trades, government contracts and news.</p>
<p>Market caps are in US dollars for every company, so European listings can be compared directly. Prices are shown in the currency each stock trades in.</p>
${SECTOR_ORDER.map((s) => `<h2>${s} stocks</h2><p>${SECTOR_TEXT[s] || ""}</p>${table(["Company", "Ticker", "Listing", "Price", "Market cap", "YTD"], bySector[s].map(listRows))}`).join("")}
<h2>What counts as a space stock</h2>
<p>A company makes the list when space is the core of its business: building or launching rockets, operating satellites, selling data from orbit, or making the hardware those businesses rely on. Lockheed Martin, Boeing and Northrop Grumman all have large space divisions, but space is a small part of much bigger defence businesses, so their shares mostly move on other things. They are not included.</p>
<p>Several space companies, including Blue Origin, are still private. They appear in Orbit Alpha's news and newsletter coverage but not in this list, because there is no share price to track.</p>
${listFaq.html}${asOfLine("Prices from Yahoo Finance; market caps from share counts in company filings.")}`,
    [listFaq.ld, { "@type": "ItemList", name: "Space stocks", itemListElement: Object.keys(profiles).map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/stocks/${t.toLowerCase()}`, name: `${profiles[t].name} (${t})` })) }]);

  /* ── 2. Insider buying and selling ───────────────────────────────────────── */
  const ins = Object.entries(insidersBy).filter(([, d]) => d?.m12);
  const insRows = ins.sort((a, b) => b[1].m12.net - a[1].m12.net).map(([t, d]) => [
    link(t), tick(t),
    d.m12.bought ? fmtUsd(d.m12.bought) : "None", d.m12.sold ? fmtUsd(d.m12.sold) : "None",
    `${d.m12.net >= 0 ? "+" : "-"}${fmtUsd(Math.abs(d.m12.net))}`,
    d.m3.bought || d.m3.sold ? `${d.m3.net >= 0 ? "+" : "-"}${fmtUsd(Math.abs(d.m3.net))}` : "None",
    `${d.m12.buyers} / ${d.m12.sellers}${d.complete ? "" : " *"}`,
  ]);
  const largest = ins.flatMap(([t, d]) => (d.largest || []).map((x) => ({ ...x, t }))).sort((a, b) => b.value - a.value).slice(0, 12);
  const buyers12 = ins.filter(([, d]) => d.m12.bought > 0).map(([t]) => t);
  const insiderPage = page("/space-stocks/insider-trading", "Space stocks insider buying and selling",
    `<p>Company insiders (directors, executives and holders of more than 10% of the shares) must report every trade in their own company's stock to the SEC on a Form 4, usually within two business days. This page adds up those filings for every US-listed space stock Orbit Alpha covers, so you can see where insiders have been buying with their own money and where they have been selling.</p>
<p>Only open-market purchases and sales are counted. Share grants, option exercises and shares withheld to pay tax are left out, because they are part of pay rather than a decision to buy or sell.</p>
<h2>Insider trading by company, last 12 months</h2>
${insRows.length ? table(["Company", "Ticker", "Bought (12m)", "Sold (12m)", "Net (12m)", "Net (3m)", "Buyers / sellers"], insRows) + (ins.some(([, d]) => !d.complete) ? `<p class="oa-note">* Very active filers: only the most recent Form 4s are parsed, so older months may be incomplete.</p>` : "") : `<p>Insider data is temporarily unavailable. The figures are on each company's page.</p>`}
${buyers12.length ? `<p>In the last 12 months, insiders made open-market purchases at ${buyers12.length} of these companies: ${buyers12.map(link).join(", ")}.</p>` : ""}
${largest.length ? `<h2>Largest individual insider trades</h2>${table(["Date", "Company", "Insider", "Trade", "Value"], largest.map((x) => [fmtDate(x.date), tick(x.t), `${esc(x.owner || "")}${x.role ? `, ${esc(x.role)}` : ""}`, x.direction === "buy" ? "Buy" : "Sale", x.url ? `<a href="${x.url}" target="_blank" rel="noopener">${fmtUsd(x.value)}</a>` : fmtUsd(x.value)]))}` : ""}
<h2>How to read insider selling</h2>
<p>Insider selling is common and usually means less than it looks. Executives at young space companies are paid largely in stock, so they sell to diversify, pay tax on vested shares, or fund personal costs. Many sales are made under Rule 10b5-1 plans, which are set up in advance and run automatically, so the timing of an individual sale says little about what the insider thinks of the stock today.</p>
<p>Open-market buying is rarer and more informative. An insider buying shares with their own cash has no reason to do it except a belief that the stock is worth more. Several buyers at the same company within a few weeks is the pattern investors watch for most closely.</p>
<h2>Where the data comes from</h2>
<p>Every figure is taken from Form 4 filings on SEC EDGAR. Companies listed outside the US, and Canadian-listed MDA Space and Telesat, do not file Form 4s, so they are not included. Each company page links to its individual filings.</p>
${asOfLine("Source: SEC EDGAR Form 4 filings.")}`);

  /* ── 3. Cash runway ──────────────────────────────────────────────────────── */
  const fin = Object.entries(finBy).map(([t, d]) => [t, d?.snapshot]).filter(([, f]) => f && f.liquidity != null && f.currency === "USD");
  const burning = fin.filter(([, f]) => f.runwayMonths != null).sort((a, b) => a[1].runwayMonths - b[1].runwayMonths);
  const generative = fin.filter(([, f]) => f.cashGenerative || (f.freeCashFlow != null && f.freeCashFlow >= 0));
  const runwayText = (m) => (m >= 120 ? "10+ years" : m >= 36 ? `${(m / 12).toFixed(1)} years` : `${Math.round(m)} months`);
  const finRow = (t, f, runway) => [link(t), tick(t), fmtUsd(f.liquidity), f.freeCashFlow != null ? `${f.freeCashFlow < 0 ? "-" : ""}${fmtUsd(Math.abs(f.freeCashFlow))}` : null, runway, f.periodEnd ? fmtDate(f.periodEnd) : null];
  const under12 = burning.filter(([, f]) => f.runwayMonths < 12).map(([t]) => t);
  const runwayPage = page("/space-stocks/cash-runway", "Space stocks cash runway ranking",
    `<p>Most space companies still spend more cash than they bring in. Cash runway estimates how long each one could keep going on the cash it has today if it kept burning money at the same rate, before it would need to raise more by selling shares or borrowing. A short runway is one of the clearest signs that a share offering, and dilution for existing holders, may be coming.</p>
<h2>Runway ranking, shortest first</h2>
${burning.length ? table(["Company", "Ticker", "Cash and investments", "Free cash flow (12m)", "Runway", "As of"], burning.map(([t, f]) => finRow(t, f, runwayText(f.runwayMonths)))) : `<p>Financial data is temporarily unavailable. The figures are on each company's page.</p>`}
${under12.length ? `<p>On these figures, ${under12.map(link).join(", ")} ${under12.length === 1 ? "has" : "have"} less than a year of cash at the current burn rate.</p>` : ""}
${generative.length ? `<h2>Cash generative</h2><p>These companies produced positive free cash flow over the last 12 months, so they are not using up their cash at all.</p>${table(["Company", "Ticker", "Cash and investments", "Free cash flow (12m)", "Runway", "As of"], generative.map(([t, f]) => finRow(t, f, "Cash generative")))}` : ""}
<h2>How runway is worked out</h2>
<p>Runway is cash and short-term investments divided by the average monthly free cash outflow over the last 12 months. Free cash flow is operating cash flow minus capital spending, taken from the figures companies tag in their 10-Q and 10-K filings.</p>
<h2>What it leaves out</h2>
<p>It is a rough guide, not a forecast. It ignores undrawn credit lines, money still to come from at-the-market share programmes, and large contract payments due in future. Capital spending in this industry is lumpy, so a year with a big satellite or factory build can make runway look shorter than the underlying business would suggest. A company that has just raised money will look much healthier the quarter after the cash arrives. Check the latest filing before drawing conclusions.</p>
<p>Companies that report in currencies other than US dollars, and those that do not file with the SEC, are not included.</p>
${asOfLine("Source: SEC EDGAR financial statements (10-Q and 10-K).")}`);

  /* ── 4. Government contracts ─────────────────────────────────────────────── */
  const con = Object.entries(contractsBy).filter(([, d]) => d && d.total > 0).sort((a, b) => b[1].total - a[1].total);
  const recent = Object.entries(contractsBy).flatMap(([t, d]) => (d?.awards || []).map((a) => ({ ...a, t }))).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 15);
  const contractsPage = page("/space-stocks/government-contracts", "Space company government contracts",
    `<p>The US government is the space industry's largest customer. NASA buys launches, lunar deliveries and science missions; the Space Force and the rest of the Department of Defense buy satellites, launches, imagery and communications. This page ranks the listed space companies Orbit Alpha covers by the value of the federal contract awards they have received over the last 12 months, from the official USAspending.gov database.</p>
<h2>Contract awards by company, last 12 months</h2>
${con.length ? table(["Company", "Ticker", "Awards (12m)"], con.map(([t, d]) => [link(t), tick(t), fmtUsd(d.total)])) : `<p>Contract data is temporarily unavailable. The figures are on each company's page.</p>`}
${recent.length ? `<h2>Latest contract awards</h2>${table(["Date", "Company", "Agency", "Value", "What for"], recent.map((a) => [fmtDate(a.start), tick(a.t), esc(a.subAgency || a.agency), a.url ? `<a href="${a.url}" target="_blank" rel="noopener">${fmtUsd(a.amount)}</a>` : fmtUsd(a.amount), esc((a.description || "").slice(0, 110))]))}` : ""}
<h2>How to read contract values</h2>
<p>The figures are the amounts awarded on prime contracts and task orders. They are not the same as revenue in the quarter. A multi-year award is usually paid out as the work is done, so a large win shows up in revenue gradually.</p>
<p>Headlines often quote much bigger numbers than appear here. Many government vehicles, known as IDIQ contracts, announce a ceiling of hundreds of millions or billions of dollars shared among several companies. That ceiling is a maximum, not a promise. Only the task orders actually placed under it count as awards on this page.</p>
<p>The data covers prime awards only. Work a company does as a subcontractor to another firm, which is common in this industry, does not appear under its own name, so totals can understate how much government work a company really does.</p>
${asOfLine("Source: USAspending.gov (prime contract awards, matched to each company by name).")}`);

  /* ── 5. Earnings calendar ────────────────────────────────────────────────── */
  const upcoming = (earnings || []).filter((e) => e.date >= asOf && profiles[e.ticker]);
  const notScheduled = usTickers.filter((t) => !upcoming.some((e) => e.ticker === t));
  const earningsPage = page("/space-stocks/earnings-calendar", "Space stocks earnings calendar",
    `<p>When each US-listed space stock reports its next quarterly results, with the reporting time and the consensus earnings-per-share estimate where analysts publish one. Results days are some of the most volatile of the year for these stocks, so it helps to know what is coming.</p>
<h2>Upcoming earnings dates</h2>
${upcoming.length ? table(["Date", "Company", "Ticker", "Timing", "Consensus EPS"], upcoming.map((e) => [fmtDate(e.date), link(e.ticker), tick(e.ticker), esc(e.time || "Time TBC"), e.epsEst ? esc(e.epsEst) : null])) : `<p>No confirmed dates in the next 75 days yet. Companies usually confirm their date two to four weeks ahead.</p>`}
${notScheduled.length ? `<p>Not yet scheduled in the next 75 days: ${notScheduled.map(tick).join(", ")}. Dates appear here once the company confirms them.</p>` : ""}
<h2>What to watch in a space company's results</h2>
<p>Earnings per share often matters less than usual, because many space companies are not yet profitable. Investors tend to focus instead on:</p>
${list([
      "Backlog: contracted future revenue, often the clearest sign of demand.",
      "Guidance: whether management raises or lowers its revenue and spending outlook for the year.",
      "Cash burn and cash balance: how long the company can fund itself, and whether it plans to raise more money.",
      "Operational milestones: launch cadence, satellites deployed, new vehicles such as Rocket Lab's Neutron, and any slips in their schedules.",
      "Gross margin: whether the business makes money on each launch, satellite or data sale before overheads.",
    ])}
<p>Results released before the US market opens move the stock that day; results released after the close move it the next trading day.</p>
<p>The calendar covers US listings only. European and Canadian space companies report on their own schedules and are not included.</p>
${asOfLine("Source: Nasdaq earnings calendar.")}`);

  /* ── 6. Space ETFs compared ──────────────────────────────────────────────── */
  const RANGES = [["1mo", "1M"], ["3mo", "3M"], ["ytd", "YTD"], ["1y", "1Y"]];
  const last = (range, id) => {
    const s = (perfBy[range]?.series || []).find((x) => x.id === id);
    const v = s ? [...s.values].reverse().find((x) => x != null) : null;
    return v == null ? null : fmtPct(v);
  };
  const funds = Object.entries(ETFS);
  const etfPage = page("/space-etfs", "Space ETFs compared",
    `<p>Space ETFs let you own a basket of space companies in a single trade instead of picking individual stocks. This page compares the main space funds against each other and against the wider market.</p>
<h2>Space ETF returns</h2>
${table(["Fund", "Ticker", ...RANGES.map(([, l]) => l)], [
      ...funds.map(([t, e]) => [esc(e.name), t, ...RANGES.map(([r]) => last(r, t))]),
      ["S&amp;P 500", "SPY", ...RANGES.map(([r]) => last(r, "SPY"))],
      ["Nasdaq 100", "QQQ", ...RANGES.map(([r]) => last(r, "QQQ"))],
    ])}
<p>Returns are price changes over each period. Interactive charts for every fund and stock are on the <a href="/markets/performance">space stocks vs the S&amp;P 500</a> page.</p>
<h2>How space ETFs differ</h2>
<p>The funds follow different rules for what they own, so their returns can differ widely in the same year. Some hold mainly pure-play space companies; others include large defence, telecom and technology groups with only part of their business in space, which makes them behave more like the broader market. Check each fund's current holdings and fees on the issuer's website before investing, since both change over time.</p>
<p>The Seraphim Space Investment Trust (SSIT) is different from the others. It is a London-listed investment trust that mainly owns stakes in private space companies, so its share price can trade at a discount or premium to the value of what it holds.</p>
<h2>ETF or individual space stocks?</h2>
<p>A fund spreads risk across many companies, which matters in a sector where a single launch failure, lost contract or share offering can move one stock 20% in a day. The trade-off is that it dilutes the effect of the winners, and the largest holdings drive most of the return. Investors who want exposure to a particular theme, such as launch, satellite broadband or Earth observation, often find the stock-by-stock route more precise. The <a href="/space-stocks">list of space stocks</a> groups every company by sector.</p>
${asOfLine("Prices from Yahoo Finance.")}`);

  return [listPage, insiderPage, runwayPage, contractsPage, earningsPage, etfPage];
}
