// More guide pages: Starlink stock, space stocks under $10, head-to-head comparisons and the
// /guides hub. Called from scripts/guides.mjs with the same data and helpers as the other guides.
// Live figures come from the build-time data; anything fixed (company facts, Starlink results) is
// written here with its source and date so it is easy to update.
import { RUNWAY_NOTES } from "../lib/runway-notes.js";
import { GUIDES, GUIDE_GROUPS, GUIDE_LIST } from "../lib/pagemeta.js";

const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;

// Starlink figures from SpaceX's Q3 2026 results (20 Oct 2026). Update after each quarterly report.
const STARLINK = {
  quarter: "Q3 2026",
  reported: "2026-10-20",
  subscribers: "13.6 million",
  subscribersPrior: "7.2 million a year earlier and 12.0 million at the end of June",
  connectivityRevenue: "$5.2 billion",
  totalRevenue: "$14.6 billion",
  arpu: "$69 a month, up from $66 in Q2 2026 but down from $83 a year earlier as cheaper plans and new countries were added",
  next: null, // Q4 results date: set once SpaceX announces it
  sources: [
    ["https://s21.q4cdn.com/184289198/files/content_files/SpaceX-Reports-Third-Quarter-2026-Results.pdf", "SpaceX: Third quarter 2026 results"],
    ["https://www.cnbc.com/2026/10/20/spacex-spcx-earnings-live-updates-q3-2026html.html", "CNBC: SpaceX Q3 2026 earnings"],
    ["https://www.reuters.com/business/media-telecom/spacex-quarterly-revenue-jumps-beats-estimates-ai-business-surges-2026-10-20/", "Reuters: SpaceX quarterly revenue jumps as AI business surges"],
  ],
};

// Hand-written context for each comparison. Facts here are durable; numbers come from live data.
const PAIRS = {
  "/compare/spacex-vs-rocket-lab": {
    intro: "SpaceX and Rocket Lab are the two listed launch companies with rockets flying regularly. SpaceX's Falcon 9 carries most of the world's orbital launches and the company runs Starlink, the largest satellite broadband network. Rocket Lab flies the small Electron rocket and makes most of its money building spacecraft and satellite components, while it develops the larger Neutron rocket to compete for constellation launches.",
    differences: [
      "Scale: SpaceX is one of the most valuable companies in the world; Rocket Lab is a fraction of its size, so the same contract win moves Rocket Lab's shares far more.",
      "Revenue mix: SpaceX revenue now comes mainly from its AI business and Starlink, with launch a smaller share. Rocket Lab's comes mainly from its space systems business (satellites, solar arrays, reaction wheels and other parts), with launch the smaller share.",
      "The Neutron question: Rocket Lab's next leg of growth depends on Neutron reaching orbit and winning medium-lift launches that Falcon 9 dominates today.",
      "Ownership: SpaceX's public shareholders hold one-vote Class A shares while Elon Musk controls the vote. Rocket Lab has a single share class.",
      "Supply of shares: SpaceX has large lock-up releases through mid-2027; Rocket Lab has funded itself partly by selling new shares, which shows in its share count.",
    ],
    faq: (a, b) => [
      ["Is Rocket Lab a competitor to SpaceX?", "Yes, in launch. Electron competes for small satellites, often against SpaceX's rideshare missions, and the Neutron rocket in development is aimed at the medium-lift market where Falcon 9 leads. Rocket Lab's spacecraft and components business does not compete with SpaceX directly."],
      ["Which is the bigger company, SpaceX or Rocket Lab?", a.cap && b.cap ? `SpaceX, by a wide margin. At the last update SpaceX was valued at about ${a.capText} and Rocket Lab at about ${b.capText}.` : "SpaceX, by a wide margin, measured by market value or revenue."],
    ],
  },
  "/compare/ast-spacemobile-vs-spacex": {
    intro: "AST SpaceMobile and SpaceX's Starlink are racing to connect ordinary mobile phones directly to satellites, with no special handset. AST is a pure play on that idea: it builds large BlueBird satellites and partners with mobile operators such as AT&T, Verizon and Vodafone. Starlink's direct-to-cell service works with T-Mobile in the US and other carriers abroad, but it is a small part of a company whose revenue comes mainly from Starlink broadband, launches and AI.",
    differences: [
      "Pure play or part of a giant: an ASTS share is almost entirely a bet on satellite-to-phone service. Direct-to-cell is one of many businesses inside SpaceX.",
      "Satellites: AST uses a small number of very large satellites with big antennas to deliver broadband speeds to phones. Starlink uses its existing launch capacity to put up many smaller direct-to-cell satellites.",
      "Funding: AST has relied on selling shares and convertible debt to pay for its constellation. SpaceX generates cash from Starlink and launches, and raised $75 billion in its IPO.",
      "Launch: AST pays other companies, including SpaceX, to launch its satellites, so it depends partly on its rival's rockets.",
    ],
    faq: (a) => [
      ["Does Starlink compete with AST SpaceMobile?", "Yes. Both offer satellite service that works with ordinary phones through mobile network partners. AST is built around this market; for SpaceX it is one part of Starlink."],
      ["Can I buy Starlink stock instead of ASTS?", "There is no separate Starlink share. The way to own Starlink is through SpaceX stock (SPCX), which also gives exposure to SpaceX's launch and AI businesses. The Starlink stock guide explains more."],
    ],
  },
  "/compare/rocket-lab-vs-ast-spacemobile": {
    intro: "Rocket Lab and AST SpaceMobile are two of the most widely held space stocks among individual investors, and they are often compared even though they do different things. Rocket Lab launches rockets and builds spacecraft and components for other companies and governments. AST SpaceMobile is building a satellite network to connect ordinary phones directly to space.",
    differences: [
      "Business model: Rocket Lab sells launches, spacecraft and parts, so it already has hundreds of millions of dollars of revenue a year. AST's revenue depends on its network coming into commercial service with its mobile operator partners.",
      "Key milestone: for Rocket Lab it is Neutron, its larger rocket. For AST it is launching enough BlueBird satellites for continuous service.",
      "Customers: Rocket Lab's include NASA, the US military and satellite operators. AST's are mobile operators that share the revenue from its service.",
      "Funding: both have sold new shares to pay for growth, so the share count change in the table matters for both.",
    ],
    faq: () => [
      ["Do Rocket Lab and AST SpaceMobile compete?", "No. Rocket Lab is a launch and spacecraft company; AST SpaceMobile operates a satellite network for phones. They are compared because both are popular, high-growth space stocks."],
    ],
  },
  "/compare/rocket-lab-vs-firefly": {
    intro: "Rocket Lab and Firefly Aerospace are both US-listed launch companies that started with small rockets and are moving into larger ones and missions beyond Earth orbit. Rocket Lab flies Electron and is developing Neutron, and builds spacecraft and components. Firefly flies the Alpha rocket and builds the Blue Ghost lunar lander, which landed on the Moon in March 2025 for NASA. Firefly listed on Nasdaq in August 2025.",
    differences: [
      "Launch record: Electron has flown many more missions than Alpha, which gives Rocket Lab a longer track record with customers.",
      "Beyond launch: Rocket Lab's largest business is spacecraft and components. Firefly's is spacecraft too, led by its lunar landers flying under NASA's Commercial Lunar Payload Services programme.",
      "Next rockets: both are building medium-lift rockets (Neutron and Eclipse) to compete for larger satellites and constellations.",
      "Size: Rocket Lab is several times Firefly's market value, so Firefly's shares tend to move more on single contracts and missions.",
    ],
    faq: () => [
      ["Is Firefly a competitor to Rocket Lab?", "Yes. Alpha and Electron both carry small satellites, Neutron and Eclipse will compete for medium-lift launches, and both companies build spacecraft for government and commercial customers."],
    ],
  },
};

export function buildMoreGuides(ctx) {
  const { SITE, profiles, quotes, ytdBy, perfBy, finBy, insidersBy, contractsBy, earnings, asOf, esc, list, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate,
    page, table, faq, and, usd, asOfLine } = ctx;
  const today = ctx.today || asOf;
  const link = (t) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)}</a>`;
  const tick = (t) => `<a href="/stocks/${t.toLowerCase()}">${t}</a>`;
  const snap = (t) => finBy[t]?.snapshot || null;
  const ret = (range, t) => {
    const s = (perfBy[range]?.series || []).find((x) => x.id === t);
    const v = s ? [...s.values].reverse().find((x) => x != null) : null;
    return v ?? null;
  };
  const signed = (n) => `${n < 0 ? "-" : ""}${fmtUsd(Math.abs(n))}`;
  const runwayText = (f) => (!f ? null : f.cashGenerative || (f.freeCashFlow != null && f.freeCashFlow >= 0) ? "Cash generative" : f.runwayMonths == null ? null : f.runwayMonths >= 120 ? "10+ years" : f.runwayMonths >= 36 ? `${(f.runwayMonths / 12).toFixed(1)} years` : `${Math.round(f.runwayMonths)} months`);
  // Share count change over a year, only from actual shares outstanding (not a weighted average,
  // which jumps for a newly listed company and would look like dilution).
  const dilution = (f) => (f?.shares?.kind === "outstanding" && f.shares.y1?.pct != null ? f.shares.y1.pct : null);
  const nextE = (t) => (earnings || []).find((e) => e.ticker === t && e.date >= today);

  /* ═══ Starlink stock ════════════════════════════════════════════════════════ */
  const sq = quotes.SPCX;
  const rivals = ["ASTS", "GSAT", "ETL", "SESG", "VSAT", "ECHO"].filter((t) => profiles[t]);
  const after = STARLINK.next ? today > STARLINK.next : true;
  const starFaq = faq([
    ["Is there a Starlink stock?", "No. Starlink is not listed on its own. It is part of SpaceX, which has been listed on Nasdaq under the ticker SPCX since 12 June 2026, so buying SpaceX shares is the way to own Starlink."],
    ["What is the Starlink stock ticker?", "There is no Starlink ticker. Starlink sits inside SpaceX, ticker SPCX on Nasdaq. Searches for a Starlink ticker sometimes turn up unrelated companies with similar names, so check you are buying Space Exploration Technologies Corp."],
    ["How much of SpaceX is Starlink?", `Starlink is SpaceX's most profitable business. In ${STARLINK.quarter} SpaceX's connectivity segment, which is mainly Starlink, brought in ${STARLINK.connectivityRevenue} of ${STARLINK.totalRevenue} total revenue, and it earned the most income from operations of any segment.`],
    ["How many Starlink subscribers are there?", `${STARLINK.subscribers} at the end of ${STARLINK.quarter}, up from ${STARLINK.subscribersPrior}, according to SpaceX's results.`],
    ["Can I buy Starlink shares in the UK?", "Yes, by buying SpaceX (SPCX) through a UK platform that offers US shares. It can be held in a Stocks and Shares ISA or SIPP. The how to buy SpaceX stock guide covers the steps and costs."],
  ]);
  const starlinkPage = page("/starlink-stock", "Starlink stock: how to invest in Starlink",
    `<p>There is no separate Starlink stock. Starlink, the satellite internet service, is owned by SpaceX, and SpaceX has been a public company since June 2026, trading on Nasdaq as <a href="/stocks/spcx">SPCX</a>. Buying SpaceX shares is how to invest in Starlink, though it also buys you SpaceX's rocket and AI businesses.</p>
${sq?.price != null ? `<div class="oa-callout"><p><b>SPCX today.</b> SpaceX shares last traded at ${fmtPrice(sq.price)}${sq.marketCap ? `, valuing the whole company, Starlink included, at about ${fmtCap(sq.marketCap)}` : ""}. <a href="/stocks/spcx">Live SPCX price and chart</a>.</p></div>` : ""}
<h2>How big is Starlink inside SpaceX?</h2>
<p>Starlink is the most profitable part of SpaceX, though the AI business overtook it on revenue in Q3 2026. In ${STARLINK.quarter}, according to SpaceX's results:</p>
${list([
      `Connectivity revenue, mostly Starlink: ${STARLINK.connectivityRevenue}, out of ${STARLINK.totalRevenue} for the whole company.`,
      `Starlink subscribers: ${STARLINK.subscribers}, up from ${STARLINK.subscribersPrior}.`,
      `Average revenue per subscriber: ${STARLINK.arpu}.`,
      "Connectivity earned $2.4 billion of income from operations in Q3 2026, the most of any segment; the AI business made $431 million and the space segment lost $7 million.",
    ])}
<p>${STARLINK.next && !after ? `SpaceX reports Q4 2026 results after the US market closes on ${fmtDate(STARLINK.next)}, which will update these figures.` : `These figures are from the ${STARLINK.quarter} report, published on ${fmtDate(STARLINK.reported)}. Full details are on the <a href="/results/spcx-q3-2026">SpaceX Q3 2026 results page</a>.`}</p>
<h2>What you get when you buy SPCX for Starlink</h2>
<p>A SpaceX share is a bet on three businesses at once: Starlink broadband and direct-to-cell service, launches with Falcon 9 and Starship, and the xAI artificial intelligence business, which includes X. If you want Starlink alone, there is no way to buy it separately. Many investors look at SPCX as a Starlink holding with the rest attached; others see the rocket business, which keeps Starlink's launch costs low, as part of the same advantage.</p>
<h2>How do you buy Starlink exposure?</h2>
<p>Search for SPCX on any platform that offers US shares, in the US, the UK or elsewhere. The step-by-step guide, including ISAs, currency fees and the W-8BEN form, is <a href="/spacex-stock">how to buy SpaceX stock</a>. Large blocks of SpaceX shares held by insiders are being released from lock-up in stages; the dates are on the <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
<h2>Which listed companies compete with Starlink?</h2>
<p>If you want satellite connectivity exposure outside SpaceX, these listed companies compete with parts of Starlink's business:</p>
${table(["Company", "Ticker", "Price", "Market cap", "YTD", "Competes on"], rivals.map((t) => [link(t), tick(t), quotes[t]?.price != null ? fmtPrice(quotes[t].price, quotes[t].currency) : null, quotes[t]?.marketCap ? fmtCap(quotes[t].marketCap) : null, ytdBy[t] != null ? fmtPct(ytdBy[t]) : null, esc({
      ASTS: "Satellite service to ordinary phones",
      GSAT: "Phone and IoT satellite services; being acquired by Amazon, which runs a rival broadband network",
      ETL: "Low Earth orbit broadband (OneWeb), mainly business and government",
      SESG: "Broadband for airlines, ships, telecoms and governments",
      VSAT: "Aviation, maritime and government connectivity",
      ECHO: "Hughes satellite broadband",
    }[t] || "")]))}
<p>The <a href="/compare/ast-spacemobile-vs-spacex">AST SpaceMobile vs SpaceX comparison</a> covers the race to connect phones in more detail.</p>
${starFaq.html}
<h2>Sources</h2>${list(STARLINK.sources.map(([u, t]) => ext(u, t)))}
${asOfLine(`Starlink figures from SpaceX's ${STARLINK.quarter} results.`)}`,
    [starFaq.ld],
    asOf,
    sq?.price != null ? {
      ticker: "SPCX", name: "SpaceX", headline: "Starlink stock: how to invest", sector: "Starlink guide", path: "/starlink-stock",
      file: "og/guides/starlink-stock.png", asOf: fmtDate(asOf),
      stats: [["SPCX", fmtPrice(sq.price)], ["Subscribers", STARLINK.subscribers.replace(" million", "M")], ...(sq.marketCap ? [["SpaceX value", fmtCap(sq.marketCap)]] : [])],
    } : undefined);

  starlinkPage.answer = `There is no separate Starlink stock. Starlink is owned by SpaceX, which trades on Nasdaq as SPCX, so buying SpaceX shares is the only way to own it. Starlink had ${STARLINK.subscribers} subscribers at the end of ${STARLINK.quarter} and was SpaceX's most profitable business in that quarter.`;

  /* ═══ Space stocks under $10 ═════════════════════════════════════════════════ */
  const cheap = Object.keys(profiles).filter((t) => !profiles[t].listing && quotes[t]?.price != null && quotes[t].price < 10 && (quotes[t].currency || "USD") === "USD")
    .sort((a, b) => (quotes[b].marketCap || 0) - (quotes[a].marketCap || 0));
  const under1 = cheap.filter((t) => quotes[t].price < 1);
  const diluters = cheap.filter((t) => dilution(snap(t)) >= 25);
  const short = cheap.filter((t) => snap(t)?.runwayMonths != null && snap(t).runwayMonths < 12);
  const cheapFaq = faq([
    ["Which space stocks are under $10?", cheap.length ? `At the last update, ${and(cheap.map((t) => `${profiles[t].name} (${t})`))} traded below $10 a share.` : "None of the US-listed space stocks Orbit Alpha covers traded below $10 at the last update."],
    ["Is a cheap share price a sign of a cheap stock?", "No. The share price alone says nothing about value. What matters is the market value of the whole company against its revenue, cash and prospects. A $3 stock can be expensive and a $300 one cheap."],
    ["Why are many low-priced space stocks risky?", "Most are young companies that spend more cash than they bring in, so they raise money by selling new shares, which dilutes existing holders. Their prices also move sharply on single launches, contracts or funding announcements."],
    ["What happens if a stock falls below $1?", "Nasdaq and the NYSE require a minimum share price of $1. A company that closes below it for 30 consecutive business days gets a warning and a period to recover, often by doing a reverse stock split; otherwise it can be delisted."],
  ]);
  const cheapPage = page("/space-stocks/under-10", "Space stocks under $10",
    `<p>These are the US-listed space stocks Orbit Alpha covers that trade below $10 a share, sorted by market value. Low share prices attract a lot of searches, but a low price does not make a stock cheap, so the table also shows the figures that say more about risk: how long each company's cash lasts and how fast its share count is growing.</p>
<h2>Space stocks under $10</h2>
${cheap.length ? table(["Company", "Ticker", "Sector", "Price", "Market cap", "YTD", "Cash runway", "Shares, 1y change"], cheap.map((t) => {
      const f = snap(t), d = dilution(f);
      return [link(t), tick(t), esc(profiles[t].sector), fmtPrice(quotes[t].price), quotes[t].marketCap ? fmtCap(quotes[t].marketCap) : null, ytdBy[t] != null ? fmtPct(ytdBy[t]) : null, runwayText(f), d != null ? fmtPct(d) : null];
    })) : "<p>No US-listed space stocks Orbit Alpha covers are below $10 right now.</p>"}
${short.length ? `<p>On the latest filings, ${and(short.map(link))} ${short.length === 1 ? "has" : "have"} less than a year of cash at the current burn rate, which usually means a share sale or other funding is coming.</p>` : ""}
${diluters.length ? `<p>${and(diluters.map(link))} ${diluters.length === 1 ? "has" : "have"} increased the share count by a quarter or more in the last year.</p>` : ""}
${under1.length ? `<p>${and(under1.map(link))} ${under1.length === 1 ? "trades" : "trade"} below $1, the minimum price for staying listed on Nasdaq and the NYSE.</p>` : ""}
<h2>How to read this list</h2>
${list([
      "Market cap, not share price, tells you the size of the company. Two stocks at $5 can be worth $100 million and $5 billion.",
      "Cash runway is cash and short-term investments divided by the last year's free cash outflow. Under 12 months usually means new funding soon.",
      "Share count change shows dilution. A 30% rise means each existing share owns 30% less of the company than a year ago, unless the money raised grows the business faster.",
      "Reverse splits change the price, not the value. A company that does a 1-for-10 reverse split moves from $1 to about $10 overnight with no change in what it is worth.",
    ])}
<p>For every space stock at any price, see the <a href="/space-stocks">full list of space stocks</a> and the <a href="/space-stocks/cash-runway">cash runway ranking</a>.</p>
${cheapFaq.html}${asOfLine("Prices from Yahoo Finance; cash and share counts from SEC filings.")}`,
    [cheapFaq.ld, { "@type": "ItemList", name: "Space stocks under $10", itemListElement: cheap.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/stocks/${t.toLowerCase()}`, name: `${profiles[t].name} (${t})` })) }]);

  cheapPage.title = `Space Stocks Under $10 (${new Date(asOf + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}): Price, Cash Runway and Dilution`;
  cheapPage.answer = cheap.length ? `As of ${fmtDate(asOf)}, ${cheap.length} US-listed space ${cheap.length === 1 ? "stock trades" : "stocks trade"} below $10 a share: ${and(cheap.map((t) => `${profiles[t].name} (${t})`))}. ${short.length ? `${and(short.map((t) => profiles[t].name))} ${short.length === 1 ? "has" : "have"} less than a year of cash at the current burn rate.` : ""}`.trim() : "";

  /* ═══ Space stocks by the numbers ═══════════════════════════════════════════════ */
  // One dated, quotable sentence per figure: the page AI assistants can cite for sector-level questions.
  const allT = Object.keys(profiles);
  const capOf = (t) => quotes[t]?.marketCap || 0;
  const capped = allT.filter((t) => capOf(t));
  const totalCap = capped.reduce((a, t) => a + capOf(t), 0);
  const spcxCap = capOf("SPCX");
  const ytdList = allT.filter((t) => ytdBy[t] != null && t !== "SPCX").map((t) => ytdBy[t]);
  const med = (xs) => { const v = [...xs].sort((a, b) => a - b), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
  const ytdMedian = med(ytdList), ytdUp = ytdList.filter((v) => v > 0).length;
  const spyYtd = ret("ytd", "SPY"), ufoYtd = ret("ytd", "UFO");
  const fin = allT.map((t) => snap(t)).filter((f) => f && f.currency === "USD");
  const profitable = fin.filter((f) => f.netIncome?.ttm != null && f.netIncome.ttm > 0).length;
  const withNI = fin.filter((f) => f.netIncome?.ttm != null).length;
  const fin12 = fin.filter((f) => f.revenue?.ttm != null && f.liquidity != null); // same companies for both figures
  const cashTotal = fin12.reduce((a, f) => a + f.liquidity, 0);
  const revTotal = fin12.reduce((a, f) => a + f.revenue.ttm, 0);
  const shortRunway = allT.filter((t) => { const f = snap(t); return f && !RUNWAY_NOTES[t] && !f.cashGenerative && f.runwayMonths != null && f.runwayMonths < 12 && !(f.freeCashFlow != null && f.freeCashFlow >= 0); });
  const ins = allT.map((t) => insidersBy[t]?.m12).filter(Boolean);
  const insBought = ins.reduce((a, d) => a + (d.bought || 0), 0), insSold = ins.reduce((a, d) => a + (d.sold || 0), 0);
  const conTotal = allT.reduce((a, t) => a + (contractsBy[t]?.total || 0), 0);
  const upcomingE = (earnings || []).filter((e, i, a) => profiles[e.ticker] && e.date >= today && a.findIndex((x) => x.ticker === e.ticker) === i);
  const sectors = [...new Set(allT.map((t) => profiles[t].sector))];
  const sectorRows = sectors.map((sec) => {
    const ts = allT.filter((t) => profiles[t].sector === sec);
    const ys = ts.filter((t) => ytdBy[t] != null && t !== "SPCX").map((t) => ytdBy[t]);
    const c = ts.reduce((a, t) => a + capOf(t), 0);
    return [esc(sec), String(ts.length), c ? fmtCap(c) : null, med(ys) != null ? fmtPct(med(ys)) : null];
  });
  const on = `As of ${fmtDate(asOf)}`;
  const facts = [
    totalCap ? `${on}, the ${capped.length} listed space companies Orbit Alpha tracks were worth about ${fmtCap(totalCap)} combined${spcxCap ? `, of which SpaceX was ${fmtCap(spcxCap)} (${Math.round((spcxCap / totalCap) * 100)}%). Without SpaceX, the other ${capped.length - 1} were worth ${fmtCap(totalCap - spcxCap)}` : ""}.` : null,
    ytdMedian != null ? `The median space stock was ${ytdMedian >= 0 ? "up" : "down"} ${Math.abs(ytdMedian).toFixed(1)}% this year, and ${ytdUp} of ${ytdList.length} were higher than at the start of the year${spyYtd != null ? `, against ${fmtPct(spyYtd)} for the S&P 500 (SPY)` : ""}${ufoYtd != null ? ` and ${fmtPct(ufoYtd)} for the Procure Space ETF (UFO)` : ""}. SpaceX, which listed in June, is left out of the year-to-date figures.` : null,
    withNI ? `${profitable} of the ${withNI} US-listed space companies with SEC financials made a net profit over their last 12 reported months.` : null,
    fin12.length ? `The ${fin12.length} US-listed companies with 12 months of SEC figures reported revenue of ${fmtUsd(revTotal)} over that period and held ${fmtUsd(cashTotal)} in cash and short-term investments.` : null,
    shortRunway.length ? `${shortRunway.length === 1 ? "One company had" : `${shortRunway.length} companies had`} less than a year of cash at the recent burn rate: ${and(shortRunway.map(link))}.` : null,
    ins.length ? `Over the last 12 months, insiders at these companies bought ${fmtUsd(insBought)} and sold ${fmtUsd(insSold)} of their own shares on the open market, from Form 4 filings.` : null,
    conTotal ? `The US-listed space companies won ${fmtUsd(conTotal)} of US government contract awards over the last 12 months, from USAspending.gov.` : null,
    upcomingE.length ? `${upcomingE.length === 1 ? "One company has" : `${upcomingE.length} companies have`} quarterly results dated in the coming weeks; the next is ${profiles[upcomingE[0].ticker].name} on ${fmtDate(upcomingE[0].date)}.` : null,
  ].filter(Boolean);
  const statsPage = page("/space-stocks/statistics", "Space stocks by the numbers",
    `<p>The listed space sector in figures: size, returns, profits, cash, insider trading and government contracts, across the ${allT.length} companies Orbit Alpha tracks. Every figure is recalculated each trading day from prices, SEC filings and USAspending.gov.</p>
<h2>Key figures</h2>${list(facts.map((f) => f.includes("<a ") ? f : esc(f)))}
<h2>How big is each part of the space sector?</h2>${table(["Sector", "Companies", "Combined market cap", "Median year to date"], sectorRows)}
<p>Year-to-date medians leave out SpaceX, which listed in June 2026. Company-level figures are on the <a href="/space-stocks">list of space stocks</a>, the <a href="/space-stocks/cash-runway">cash runway ranking</a>, <a href="/space-stocks/insider-trading">insider trading</a> and <a href="/space-stocks/government-contracts">government contracts</a> pages.</p>
<h2>How these figures are worked out</h2>${list([
      "Market values are share price times shares outstanding, converted to US dollars for non-US listings.",
      "Profits, revenue and cash come from the latest 10-Q and 10-K filings of US-listed companies; 12-month figures add the last four reported quarters.",
      "Cash runway is cash and short-term investments divided by the last 12 months of free cash outflow.",
      "Insider figures are open-market purchases and sales on Form 4; grants and option exercises are left out.",
    ])}
${asOfLine("Prices from Yahoo Finance; financials and insider trades from SEC filings; contracts from USAspending.gov.")}`,
    [{ "@type": "ItemList", name: "Space stocks by the numbers", itemListElement: facts.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.replace(/<[^>]+>/g, "") })) }]);
  statsPage.answer = facts.slice(0, 2).map((f) => f.replace(/<[^>]+>/g, "")).join(" ");
  statsPage.datasets = [{
    slug: "space-stocks-statistics", name: "Space stocks by sector", description: `Number of companies, combined market value and median year-to-date return by sector, as of ${asOf}.`,
    columns: ["sector", "companies", "market_cap_usd", "median_ytd_pct"],
    rows: sectors.map((sec) => { const ts = allT.filter((t) => profiles[t].sector === sec); const ys = ts.filter((t) => ytdBy[t] != null && t !== "SPCX").map((t) => ytdBy[t]); return [sec, ts.length, Math.round(ts.reduce((a, t) => a + capOf(t), 0)), med(ys) != null ? +med(ys).toFixed(2) : ""]; }),
  }];

  /* ═══ Largest space companies by market cap ════════════════════════════════════ */
  const bySize = Object.keys(profiles).filter((t) => quotes[t]?.marketCap).sort((a, b) => quotes[b].marketCap - quotes[a].marketCap);
  const sizePage = page("/space-stocks/largest", "Largest space companies by market cap",
    `<p>Every listed space company Orbit Alpha covers, ranked by market value in US dollars, from the largest to the smallest. Market values move with the share price every trading day; this page rebuilds daily.</p>
${bySize.length ? table(["Rank", "Company", "Ticker", "Sector", "Market cap", "Share price", "Year to date"], bySize.map((t, i) => [String(i + 1), link(t), tick(t), esc(profiles[t].sector), fmtCap(quotes[t].marketCap), fmtPrice(quotes[t].price, quotes[t].currency), ytdBy[t] != null && t !== "SPCX" ? fmtPct(ytdBy[t]) : null])) : "<p>Market values are not available right now.</p>"}
${bySize.length >= 2 && quotes[bySize[0]].marketCap > bySize.slice(1).reduce((sum, t) => sum + quotes[t].marketCap, 0) ? `<p>${link(bySize[0])} is worth more than the other ${bySize.length - 1} companies on the list combined.</p>` : ""}
<p>Non-US market values are converted to US dollars at the latest exchange rate. For prices and sectors, see the <a href="/space-stocks">full list of space stocks</a>; for this week's moves, <a href="/space-stocks/this-week">space stocks this week</a>.</p>
${asOfLine("Prices from Yahoo Finance; share counts from company filings.")}`,
    [{ "@type": "ItemList", name: "Largest space companies by market cap", itemListElement: bySize.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/stocks/${t.toLowerCase()}`, name: `${profiles[t].name} (${t})` })) }]);
  if (bySize.length >= 3) sizePage.answer = `As of ${fmtDate(asOf)}, the largest listed space company is ${profiles[bySize[0]].name} (${bySize[0]}), worth about ${fmtCap(quotes[bySize[0]].marketCap)}, followed by ${profiles[bySize[1]].name} (${fmtCap(quotes[bySize[1]].marketCap)}) and ${profiles[bySize[2]].name} (${fmtCap(quotes[bySize[2]].marketCap)}).`;

  /* ═══ Space stocks this week ═════════════════════════════════════════════════ */
  // Five trading days, from the 1-month performance series (each stock rebased to its own first close).
  const m = perfBy["1mo"];
  const wkDates = m?.dates || [];
  const wkEnd = wkDates.length - 1, wkStart = wkEnd - 5;
  const at = (sr, i) => { for (let k = i; k >= 0 && k > i - 3; k--) if (sr.values[k] != null) return sr.values[k]; return null; };
  const wk = (id) => {
    const sr = (m?.series || []).find((x) => x.id === id);
    if (!sr || wkStart < 0) return null;
    const a = at(sr, wkStart), b = at(sr, wkEnd);
    return a == null || b == null ? null : ((1 + b / 100) / (1 + a / 100) - 1) * 100;
  };
  const weekRows = Object.keys(profiles).map((t) => [t, wk(t)]).filter(([, v]) => v != null).sort((x, y) => y[1] - x[1]);
  const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
  const wkMedian = median(weekRows.map(([, v]) => v));
  const wkUp = weekRows.filter(([, v]) => v > 0).length;
  const ufoWk = wk("UFO"), spyWk = wk("SPY");
  const gainers = weekRows.filter(([, v]) => v > 0).slice(0, 3);
  const fallers = weekRows.filter(([, v]) => v < 0).slice(-3).reverse();
  const mv = ([t, v]) => `${link(t)} (${tick(t)}): ${fmtPct(v)}`;
  const from = wkStart >= 0 ? wkDates[wkStart] : null, to = wkDates[wkEnd] || null;
  const weekPage = page("/space-stocks/this-week", "Space stocks this week",
    `<p>How every listed space stock Orbit Alpha covers has moved over the last five trading days, from the biggest gainer to the biggest faller, with the space ETF and the S&amp;P 500 for comparison. The page rebuilds every trading day.</p>
${weekRows.length ? `${gainers.length ? `<h2>Biggest gainers</h2>${list(gainers.map(mv))}` : ""}${fallers.length ? `<h2>Biggest fallers</h2>${list(fallers.map(mv))}` : ""}
<h2>Every space stock, last five trading days</h2>
${table(["Company", "Ticker", "Sector", "5 days", "1 month", "Year to date"], weekRows.map(([t, v]) => [link(t), tick(t), esc(profiles[t].sector), fmtPct(v), ret("1mo", t) != null ? fmtPct(ret("1mo", t)) : null, ytdBy[t] != null ? fmtPct(ytdBy[t]) : null]))}
<p>${wkUp} of ${weekRows.length} space stocks rose${wkMedian != null ? `, and the median move was ${fmtPct(wkMedian)}` : ""}.${ufoWk != null ? ` The Procure Space ETF (UFO) moved ${fmtPct(ufoWk)}` : ""}${spyWk != null ? `${ufoWk != null ? " and" : ""} the S&amp;P 500 (SPY) ${fmtPct(spyWk)}` : ""}${ufoWk != null || spyWk != null ? "." : ""}</p>` : "<p>Weekly figures are not available right now.</p>"}
<p>Why a stock moved is usually in the news: see <a href="/news">space stock news, filings and contracts</a>, the <a href="/space-stocks/earnings-calendar">earnings calendar</a> and the <a href="/results">latest results</a>. The <a href="/newsletter">Sunday newsletter</a> explains the week's biggest moves.</p>
${asOfLine(`Closing prices from Yahoo Finance${from && to ? `, ${fmtDate(from)} to ${fmtDate(to)}` : ""}. Returns are price only, in each stock's trading currency.`)}`,
    [{ "@type": "ItemList", name: "Space stocks this week", itemListElement: weekRows.map(([t], i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/stocks/${t.toLowerCase()}`, name: `${profiles[t].name} (${t})` })) }]);
  // A dated title shows searchers the table is current.
  if (to) weekPage.title = `Space Stocks This Week (to ${new Date(to + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}): Biggest Gainers and Losers`;
  if (weekRows.length >= 2 && to) {
    const [bt, bv] = weekRows[0], [wt, wv] = weekRows[weekRows.length - 1];
    weekPage.answer = `Over the five trading days to ${fmtDate(to)}, the best performing space stock was ${profiles[bt].name} (${bt}), ${fmtPct(bv)}, and the weakest was ${profiles[wt].name} (${wt}), ${fmtPct(wv)}. ${wkUp} of ${weekRows.length} space stocks rose${wkMedian != null ? `, with a median move of ${fmtPct(wkMedian)}` : ""}.`;
    weekPage.datasets = [{
      slug: "space-stocks-this-week", name: "Space stocks: five-day returns", description: `Price return over the five trading days to ${to} for every listed space stock Orbit Alpha covers, with 1-month and year-to-date returns.`,
      columns: ["ticker", "name", "sector", "return_5d_pct", "return_1mo_pct", "ytd_return_pct"],
      rows: weekRows.map(([t, v]) => [t, profiles[t].name, profiles[t].sector, +v.toFixed(2), ret("1mo", t) != null ? +ret("1mo", t).toFixed(2) : "", ytdBy[t] != null ? +ytdBy[t].toFixed(2) : ""]),
    }];
  }

  /* ═══ Comparisons ════════════════════════════════════════════════════════════ */
  const comparePages = Object.entries(GUIDES).filter(([, g]) => g.compare).map(([path, g]) => {
    const [A, B] = g.compare;
    const ctxt = PAIRS[path];
    const info = (t) => ({ t, q: quotes[t], f: snap(t), cap: quotes[t]?.marketCap || 0, capText: quotes[t]?.marketCap ? fmtCap(quotes[t].marketCap) : null });
    const a = info(A), b = info(B);
    const rev = (f) => (f?.revenue?.ttm ? `${fmtUsd(f.revenue.ttm)} (12 months)` : f?.revenue?.quarter ? `${fmtUsd(f.revenue.quarter)} (latest quarter)` : null);
    const growth = (f) => (f?.revenue?.ttmGrowth != null ? `${fmtPct(f.revenue.ttmGrowth)} (12 months)` : f?.revenue?.quarterGrowth != null ? `${fmtPct(f.revenue.quarterGrowth)} (latest quarter)` : null);
    const income = (f) => (f?.netIncome?.ttm != null ? `${signed(f.netIncome.ttm)} (12 months)` : f?.netIncome?.quarter != null ? `${signed(f.netIncome.quarter)} (latest quarter)` : null);
    const ins = (t) => { const d = insidersBy[t]?.m12; return d ? (d.bought || d.sold ? `${d.net >= 0 ? "+" : "-"}${usd(Math.abs(d.net))}` : "None") : null; };
    const con = (t) => (contractsBy[t]?.total ? fmtUsd(contractsBy[t].total) : contractsBy[t] ? "None" : null);
    const ne = (t) => { const e = nextE(t); return e ? `${fmtDate(e.date)}${e.time && e.time !== "Time TBC" ? `, ${e.time.toLowerCase()}` : ""}` : null; };
    const rows = [
      ["Share price", (x) => (x.q?.price != null ? fmtPrice(x.q.price, x.q.currency) : null)],
      ["Market cap", (x) => x.capText],
      ["Year to date", (x) => (ytdBy[x.t] != null ? fmtPct(ytdBy[x.t]) : null)],
      ["1 year", (x) => (ret("1y", x.t) != null ? fmtPct(ret("1y", x.t)) : null)],
      ["Revenue", (x) => rev(x.f)],
      ["Revenue growth", (x) => growth(x.f)],
      ["Gross margin (12 months)", (x) => (x.f?.grossMargin != null ? `${x.f.grossMargin.toFixed(1)}%` : null)],
      ["Net income", (x) => income(x.f)],
      ["Cash and investments", (x) => (x.f?.liquidity != null ? fmtUsd(x.f.liquidity) : null)],
      ["Debt", (x) => (x.f?.debt != null ? fmtUsd(x.f.debt) : null)],
      ["Free cash flow (12 months)", (x) => (x.f?.freeCashFlow != null ? signed(x.f.freeCashFlow) : null)],
      ["Cash runway", (x) => runwayText(x.f)],
      ["Shares outstanding, 1y change", (x) => (dilution(x.f) != null ? fmtPct(dilution(x.f)) : null)],
      ["Insider buying minus selling (12 months)", (x) => ins(x.t)],
      ["US government contract awards (12 months)", (x) => con(x.t)],
      ["Next earnings", (x) => ne(x.t)],
    ].map(([label, fn]) => [label, fn(a), fn(b)]).filter(([, x, y]) => x != null || y != null);
    const pa = profiles[A], pb = profiles[B];
    const bigger = a.cap && b.cap ? (a.cap >= b.cap ? [a, b] : [b, a]) : null;
    const ratio = bigger ? bigger[0].cap / bigger[1].cap : null;
    const summary = [];
    if (bigger) summary.push(`By market value, ${profiles[bigger[0].t].name} is ${ratio >= 10 ? `about ${Math.round(ratio)} times` : ratio >= 1.5 ? `about ${ratio.toFixed(1)} times` : "similar in size to"} ${ratio >= 1.5 ? `the size of ${profiles[bigger[1].t].name}` : profiles[bigger[1].t].name} (${bigger[0].capText} against ${bigger[1].capText}).`);
    if (ytdBy[A] != null && ytdBy[B] != null && A !== "SPCX" && B !== "SPCX") summary.push(`This year ${pa.name} has returned ${fmtPct(ytdBy[A])} and ${pb.name} ${fmtPct(ytdBy[B])}.`);
    const r1a = ret("1y", A), r1b = ret("1y", B);
    if (r1a != null && r1b != null && A !== "SPCX" && B !== "SPCX") summary.push(`Over the past year: ${pa.name} ${fmtPct(r1a)}, ${pb.name} ${fmtPct(r1b)}.`);
    if ((A === "SPCX" || B === "SPCX") && quotes.SPCX?.price != null) summary.push(`SpaceX has only traded since 12 June 2026, so it has no full-year return; it is ${quotes.SPCX.price >= 135 ? "up" : "down"} ${Math.abs((quotes.SPCX.price / 135 - 1) * 100).toFixed(1)}% on its $135 IPO price.`);
    const pairFaq = faq([
      ...ctxt.faq(a, b),
      [`What is the difference between ${pa.name} and ${pb.name} stock?`, `${pa.name}: ${pa.about} ${pb.name}: ${pb.about}`],
      [`Which is better, ${A} or ${B}?`, "That depends on what you want to own and how much risk you can take. Orbit Alpha does not make recommendations; the table compares size, growth, cash and dilution so you can weigh them yourself."],
    ]);
    const cmpPage = page(path, `${esc(pa.name)} vs ${esc(pb.name)} stock: ${A} vs ${B}`,
      `<p>${esc(ctxt.intro)}</p>
<h2>${A} vs ${B} side by side</h2>
${table(["", `${tick(A)} ${esc(pa.name)}`, `${tick(B)} ${esc(pb.name)}`], rows.map(([l, x, y]) => [esc(l), x, y]))}
<p class="oa-note">Financials are from each company's latest 10-Q and 10-K filings. Where 12-month figures are not yet available (for example, after a recent listing), the latest quarter is shown and labelled.</p>
<h2>Key differences</h2>
${list(ctxt.differences.map(esc))}
<h2>Full company pages</h2>
${list([`<a href="/stocks/${A.toLowerCase()}">${A} stock: ${esc(pa.name)} price, filings and news</a>`, `<a href="/stocks/${B.toLowerCase()}">${B} stock: ${esc(pb.name)} price, filings and news</a>`])}
${pairFaq.html}${asOfLine("Prices from Yahoo Finance; financials, insider trades and share counts from SEC EDGAR; contract awards from USAspending.gov.")}`,
      [pairFaq.ld],
      asOf,
      a.q?.price != null && b.q?.price != null ? {
        ticker: `${A} vs ${B}`, name: "", headline: `${pa.name} vs ${pb.name}`, sector: "Stock comparison", path,
        file: `og/guides/${path.split("/").pop()}.png`, asOf: fmtDate(asOf),
        stats: [[A, fmtPrice(a.q.price)], [B, fmtPrice(b.q.price)], ...(a.capText && b.capText ? [["Market caps", `${a.capText} / ${b.capText}`]] : [])],
      } : undefined);
    if (summary.length) cmpPage.answer = `As of ${fmtDate(asOf)}: ${summary.join(" ")}`;
    return cmpPage;
  });

  return [starlinkPage, cheapPage, weekPage, sizePage, statsPage, ...comparePages];
}

// Media kit at /advertise. Update SPONSOR when rates change.
const SPONSOR = {
  email: "OrbitAlphaApp@proton.me",
  subscribers: "400+",
  formats: [
    ["Newsletter feature", "$500 an issue", "The single sponsored feature in the Sunday issue: your logo, 60 to 80 words and a link near the top, marked as sponsored"],
  ],
};
export function buildAdvertise(ctx) {
  const { SITE, ORG, crumbs, esc, list, asOf, count } = ctx;
  const g = GUIDES["/advertise"];
  const table = `<table><thead><tr><th>Format</th><th>Rate</th><th>What you get</th></tr></thead><tbody>${SPONSOR.formats.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return {
    path: "/advertise", title: g.title, description: g.description, lastmod: asOf, guide: true,
    body: `<div class="oa-guide"><h1>Advertise with Orbit Alpha</h1><!--oa-answer--><p>Orbit Alpha is a free weekly newsletter and live dashboard for people who invest in space stocks. Readers are individual investors in the UK, US and Europe who hold or follow companies such as SpaceX, Rocket Lab, AST SpaceMobile and the European satellite operators. If your product helps them invest, research or follow the space industry, this is a direct way to reach them.</p>
<h2>The audience</h2>${list([`${SPONSOR.subscribers} newsletter subscribers, sent every Sunday`, `A website covering ${count} listed space companies, with stock pages, guides and data that are found through Google and AI search`, "Readers who are already investing: the site is built around how-to-buy guides, lock-up calendars, earnings dates and SEC filings", "Distribution on Reddit and X (@OrbitAlphaApp) on top of the newsletter"])}
<h2>Format and rate</h2>${table}<p>Each issue carries one sponsored feature only, so sponsorship stays a small part of the read. Sponsored content is always labelled. Orbit Alpha's guides, rankings and stock data are never sponsored, which is why readers trust them.</p>
<h2>Who it suits</h2>${list(["Investment platforms and ETF issuers with space or thematic funds", "Research, charting and portfolio tools", "Space-industry media, research and events", "Other investing newsletters looking for a swap or a paid recommendation"])}
<p>Listed companies and their investor relations firms are welcome too. Any payment from a listed company is disclosed in the issue alongside the sponsorship.</p>
<h2>Book a slot</h2><p>Email <a href="mailto:${SPONSOR.email}?subject=Sponsoring%20Orbit%20Alpha">${SPONSOR.email}</a> with the issue dates you would like and a link to your product.</p></div>`,
    answer: `Orbit Alpha carries one sponsored feature per Sunday issue, at $500 an issue. Email ${SPONSOR.email} to book.`,
    ld: [ORG, crumbs([["Home", "/"], ["Advertise", "/advertise"]])],
  };
}

// The /guides hub: every guide, grouped. Built last so it can describe the others.
// One-line card text for the hub (the full descriptions are written for search results and run long).
const HUB_TEXT = {
  "/spacex-stock": ["Platforms, ISA, W-8BEN and costs, step by step.", ""],
  "/spacex-ipo": ["The $135 price, the $75bn raise and how SPCX has traded since.", "New"],
  "/spacex-stock/lockup-calendar": ["Every unlock date, share count and how SPCX moved on each.", "Most read"],
  "/starlink-stock": ["How to invest in Starlink, with subscriber and revenue figures.", ""],
  "/space-stocks": ["Every listed space company by sector, with price and returns.", "Daily"],
  "/space-stocks/this-week": ["The week's biggest gainers and fallers.", "Daily"],
  "/space-stocks/largest": ["All 30 companies ranked by market value.", "Daily"],
  "/space-stocks/statistics": ["The sector in figures: size, returns, profits, cash.", "New"],
  "/space-stocks/launch-events": ["The launches that move space stocks, and when.", "New"],
  "/articles": ["Short, sourced answers to this week's questions.", "New"],
  "/space-stocks/insider-trading": ["Who is buying and selling their own shares.", ""],
  "/space-stocks/cash-runway": ["Who needs to raise money, ranked by months of cash.", ""],
  "/space-stocks/government-contracts": ["NASA, Space Force and DoD awards, ranked by value.", ""],
  "/space-stocks/earnings-calendar": ["When each company reports next, with estimates.", ""],
  "/space-stocks/under-10": ["The cheaper names, with cash runway and dilution.", ""],
  "/results": ["Every company's results this quarter, as they report.", "Live"],
  "/space-stocks/uk-europe": ["European listings and how UK investors buy them.", ""],
  "/space-etfs": ["UFO, ARKX and the rest against the S&P 500.", ""],
};
const FEATURED = ["/spacex-stock/lockup-calendar", "/results", "/space-stocks/this-week"];

export function buildHub(ctx) {
  const { SITE, ORG, crumbs, esc, asOf } = ctx;
  const g = GUIDES["/guides"];
  const card = (p, x, feat = false) => {
    const [text, tag] = HUB_TEXT[p] || [x.compare ? "Market cap, returns, revenue, cash and dilution side by side." : "", ""];
    return `<a class="oa-card${feat ? " feat" : ""}" href="${p}"><b>${esc(x.label)}${tag ? ` <i>${esc(tag)}</i>` : ""}</b>${text ? `<span>${esc(text)}</span>` : ""}</a>`;
  };
  const featured = `<h2>Start here</h2><div class="oa-hub-grid">${FEATURED.filter((p) => GUIDES[p]).map((p) => card(p, GUIDES[p], true)).join("")}</div>`;
  const sections = GUIDE_GROUPS.map(([id, name, blurb]) => {
    const items = GUIDE_LIST.filter(([p, x]) => x.group === id && !FEATURED.includes(p) && !x.hubHide && !x.compare);
    // The head-to-head pages become one compact row of links instead of four cards.
    if (id === "compare") {
      const pairs = GUIDE_LIST.filter(([, x]) => x.compare);
      return pairs.length ? `<h2>${esc(name)}</h2><p class="oa-hub-sub">${pairs.map(([p, x]) => `<a href="${p}">${esc(x.label.replace(/ stock$/, ""))}</a>`).join(" · ")}</p>` : "";
    }
    return items.length ? `<h2>${esc(name)}</h2><p class="oa-hub-sub">${esc(blurb)}</p><div class="oa-hub-grid">${items.map(([p, x]) => card(p, x)).join("")}</div>` : "";
  }).join("");
  const live = `<h2>Live data</h2><div class="oa-hub-grid">${[["/markets", "Live dashboard", "Prices for every space stock and ETF."], ["/markets/performance", "Space vs the S&P 500", "Sector returns against the market."], ["/news", "News, filings and contracts", "What is moving the stocks today."]].map(([p, l, t]) => `<a class="oa-card" href="${p}"><b>${esc(l)}</b><span>${esc(t)}</span></a>`).join("")}</div>`;
  return {
    path: "/guides",
    title: g.title,
    description: g.description,
    lastmod: asOf,
    guide: true,
    body: `<div class="oa-guide oa-hub"><h1>Space stock guides</h1><p class="oa-hub-lead">Answers to the questions investors ask most about space stocks, built from live prices, SEC filings and contract data, and refreshed every time the site updates.</p>${featured}${sections}${live}</div>`,
    ld: [ORG, { "@type": "CollectionPage", name: "Space stock guides", url: `${SITE}/guides`, hasPart: GUIDE_LIST.map(([p, x]) => ({ "@type": "WebPage", name: x.label, url: SITE + p })) }, crumbs([["Home", "/"], ["Guides", "/guides"]])],
  };
}
