// More guide pages: Starlink stock, space stocks under $10, head-to-head comparisons and the
// /guides hub. Called from scripts/guides.mjs with the same data and helpers as the other guides.
// Live figures come from the build-time data; anything fixed (company facts, Starlink results) is
// written here with its source and date so it is easy to update.
import { GUIDES, GUIDE_GROUPS, GUIDE_LIST } from "../lib/pagemeta.js";

const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;

// Starlink figures from SpaceX's Q2 2026 results (4 Aug 2026). Update after each quarterly report.
const STARLINK = {
  quarter: "Q2 2026",
  reported: "2026-08-04",
  subscribers: "12.0 million",
  subscribersPrior: "6.0 million a year earlier and 10.3 million at the end of March",
  connectivityRevenue: "$4.3 billion",
  totalRevenue: "$7.8 billion",
  arpu: "$66 a month, down from $85 a year earlier as cheaper plans and new countries were added",
  next: "2026-10-20", // Q3 results
  sources: [
    ["https://s21.q4cdn.com/184289198/files/doc_financials/2026/q2/SpaceX-Reports-Second-Quarter-2026-Results.pdf", "SpaceX: Second quarter 2026 results"],
    ["https://www.cnbc.com/2026/08/04/spacex-spcx-earnings-live-updates-q2-2026.html", "CNBC: SpaceX Q2 2026 earnings"],
    ["https://www.cbsnews.com/news/spacex-earnings-elon-musk-ipo/", "CBS News: SpaceX's first earnings report since going public"],
  ],
};

// Hand-written context for each comparison. Facts here are durable; numbers come from live data.
const PAIRS = {
  "/compare/spacex-vs-rocket-lab": {
    intro: "SpaceX and Rocket Lab are the two listed launch companies with rockets flying regularly. SpaceX's Falcon 9 carries most of the world's orbital launches and the company runs Starlink, the largest satellite broadband network. Rocket Lab flies the small Electron rocket and makes most of its money building spacecraft and satellite components, while it develops the larger Neutron rocket to compete for constellation launches.",
    differences: [
      "Scale: SpaceX is one of the most valuable companies in the world; Rocket Lab is a fraction of its size, so the same contract win moves Rocket Lab's shares far more.",
      "Revenue mix: most SpaceX revenue comes from Starlink subscriptions, with a fast-growing AI business alongside. Rocket Lab's comes mainly from its space systems business (satellites, solar arrays, reaction wheels and other parts), with launch the smaller share.",
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
  const after = today > STARLINK.next;
  const starFaq = faq([
    ["Is there a Starlink stock?", "No. Starlink is not listed on its own. It is part of SpaceX, which has been listed on Nasdaq under the ticker SPCX since 12 June 2026, so buying SpaceX shares is the way to own Starlink."],
    ["What is the Starlink stock ticker?", "There is no Starlink ticker. Starlink sits inside SpaceX, ticker SPCX on Nasdaq. Searches for a Starlink ticker sometimes turn up unrelated companies with similar names, so check you are buying Space Exploration Technologies Corp."],
    ["How much of SpaceX is Starlink?", `Starlink is SpaceX's largest business. In ${STARLINK.quarter} SpaceX's connectivity segment, which is mainly Starlink, brought in ${STARLINK.connectivityRevenue} of ${STARLINK.totalRevenue} total revenue, and it is the segment that makes SpaceX its profits.`],
    ["How many Starlink subscribers are there?", `${STARLINK.subscribers} at the end of ${STARLINK.quarter}, up from ${STARLINK.subscribersPrior}, according to SpaceX's results.`],
    ["Can I buy Starlink shares in the UK?", "Yes, by buying SpaceX (SPCX) through a UK platform that offers US shares. It can be held in a Stocks and Shares ISA or SIPP. The how to buy SpaceX stock guide covers the steps and costs."],
  ]);
  const starlinkPage = page("/starlink-stock", "Starlink stock: how to invest in Starlink",
    `<p>There is no separate Starlink stock. Starlink, the satellite internet service, is owned by SpaceX, and SpaceX has been a public company since June 2026, trading on Nasdaq as <a href="/stocks/spcx">SPCX</a>. Buying SpaceX shares is how to invest in Starlink, though it also buys you SpaceX's rocket and AI businesses.</p>
${sq?.price != null ? `<div class="oa-callout"><p><b>SPCX today.</b> SpaceX shares last traded at ${fmtPrice(sq.price)}${sq.marketCap ? `, valuing the whole company, Starlink included, at about ${fmtCap(sq.marketCap)}` : ""}. <a href="/stocks/spcx">Live SPCX price and chart</a>.</p></div>` : ""}
<h2>How big is Starlink inside SpaceX?</h2>
<p>Starlink is the largest and most profitable part of SpaceX. In ${STARLINK.quarter}, SpaceX's first results as a listed company:</p>
${list([
      `Connectivity revenue, mostly Starlink: ${STARLINK.connectivityRevenue}, out of ${STARLINK.totalRevenue} for the whole company.`,
      `Starlink subscribers: ${STARLINK.subscribers}, up from ${STARLINK.subscribersPrior}.`,
      `Average revenue per subscriber: ${STARLINK.arpu}.`,
      "Connectivity is the segment that earns SpaceX's profits; the AI business and Starship development lose money.",
    ])}
<p>${after ? `SpaceX reported Q3 2026 results on ${fmtDate(STARLINK.next)}; the figures above are from the ${STARLINK.quarter} report.` : `SpaceX reports Q3 2026 results after the US market closes on ${fmtDate(STARLINK.next)}, which will update these figures.`}</p>
<h2>What you get when you buy SPCX for Starlink</h2>
<p>A SpaceX share is a bet on three businesses at once: Starlink broadband and direct-to-cell service, launches with Falcon 9 and Starship, and the xAI artificial intelligence business, which includes X. If you want Starlink alone, there is no way to buy it separately. Many investors look at SPCX as a Starlink holding with the rest attached; others see the rocket business, which keeps Starlink's launch costs low, as part of the same advantage.</p>
<h2>How to buy</h2>
<p>Search for SPCX on any platform that offers US shares, in the US, the UK or elsewhere. The step-by-step guide, including ISAs, currency fees and the W-8BEN form, is <a href="/spacex-stock">how to buy SpaceX stock</a>. Large blocks of SpaceX shares held by insiders are being released from lock-up in stages; the dates are on the <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
<h2>Listed Starlink rivals</h2>
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
      ["Gross margin", (x) => (x.f?.grossMargin != null ? `${x.f.grossMargin.toFixed(1)}%` : null)],
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
    return page(path, `${esc(pa.name)} vs ${esc(pb.name)} stock: ${A} vs ${B}`,
      `<p>${esc(ctxt.intro)}</p>
${summary.length ? `<div class="oa-callout"><p>${summary.join(" ")}</p></div>` : ""}
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
  });

  return [starlinkPage, cheapPage, ...comparePages];
}

// The /guides hub: every guide, grouped. Built last so it can describe the others.
export function buildHub(ctx) {
  const { SITE, ORG, crumbs, esc, asOf } = ctx;
  const g = GUIDES["/guides"];
  const sections = GUIDE_GROUPS.map(([id, name, blurb]) => {
    const items = GUIDE_LIST.filter(([, x]) => x.group === id);
    return items.length ? `<h2>${esc(name)}</h2><p>${esc(blurb)}</p><ul class="oa-guide-list">${items.map(([p, x]) => `<li><a href="${p}">${esc(x.label)}</a><br />${esc(x.description)}</li>`).join("")}</ul>` : "";
  }).join("");
  return {
    path: "/guides",
    title: g.title,
    description: g.description,
    lastmod: asOf,
    guide: true,
    body: `<div class="oa-guide"><h1>Space stock guides</h1><p>Guides to the questions investors ask most about space stocks, built from the same live prices, SEC filings and contract data as the Orbit Alpha dashboard and refreshed every time the site updates.</p>${sections}<h2>Live data</h2><ul><li><a href="/markets">Live space stocks dashboard</a></li><li><a href="/markets/performance">Space stocks vs the S&amp;P 500</a></li><li><a href="/news">Space stock news, filings and contracts</a></li></ul></div>`,
    ld: [ORG, { "@type": "CollectionPage", name: "Space stock guides", url: `${SITE}/guides`, hasPart: GUIDE_LIST.map(([p, x]) => ({ "@type": "WebPage", name: x.label, url: SITE + p })) }, crumbs([["Home", "/"], ["Guides", "/guides"]])],
  };
}
