// Titles, descriptions and intro text for the /markets pages.
// Shared by src/App.jsx (titles in the browser) and scripts/prerender.mjs (static HTML for search
// engines), so the two can't drift apart. Each page gets its own description: search engines treat
// identical descriptions across pages as duplicates.

export const MARKET_PAGES = {
  "": {
    label: "Dashboard",
    title: "Space Stocks Dashboard: Live Prices and Market Caps | Orbit Alpha",
    description: "Live prices, market caps and daily moves for every listed space stock, from SpaceX and Rocket Lab to AST SpaceMobile and Planet Labs, sortable by sector.",
    text: "Live space stock prices, market caps and daily moves for every company Orbit Alpha covers, with a watchlist and filters by sector. Click any company for its full page with chart, filings, contracts and news.",
  },
  launches: {
    label: "Launches",
    title: "Space Stocks Launch Calendar: Upcoming Launches by Company | Orbit Alpha",
    description: "Upcoming rocket launches tagged to the listed space companies flying the rocket or building the payload, so you can see which stocks have a launch coming up.",
    text: "Upcoming orbital launches, tagged to the listed space companies flying the rocket or building the payload, so you can see which stocks have a launch coming up this week.",
  },
  earnings: {
    label: "Earnings",
    title: "Space Stocks Earnings Calendar: Upcoming Report Dates | Orbit Alpha",
    description: "Upcoming earnings dates for US-listed space stocks, with reporting time and consensus EPS estimate where published.",
    text: "Upcoming earnings dates for US-listed space stocks, with the reporting time and the consensus estimate where one is published.",
  },
  contracts: {
    label: "Contracts",
    title: "Space Company Government Contracts: NASA, Space Force and DoD Awards | Orbit Alpha",
    description: "US government contract awards to listed space companies from NASA, the Space Force and the Department of Defense, taken from USAspending.gov.",
    text: "US government contract awards to listed space companies from NASA, the Space Force, the Department of Defense and other agencies, taken from USAspending.gov.",
  },
  filings: {
    label: "Filings",
    title: "Space Stocks SEC Filings and Insider Trades | Orbit Alpha",
    description: "The latest SEC filings from US-listed space companies: insider buys and sales, share offerings, 5% holder stakes and quarterly reports.",
    text: "The latest SEC filings from US-listed space companies: insider buys and sales, share offerings, major shareholder stakes and quarterly and annual reports.",
  },
  performance: {
    label: "Performance",
    title: "Space Stocks vs the S&P 500: ETF and Stock Performance | Orbit Alpha",
    description: "Compare space ETFs (UFO, ARKX, ROKT, MARS, NASA) and every space stock we cover against the S&P 500 and Nasdaq 100.",
  },
};

// Guide groups, in the order the /guides page and the home page show them.
export const GUIDE_GROUPS = [
  ["spacex", "SpaceX and Starlink", "Buying SPCX, the lock-up schedule and how to get Starlink exposure."],
  ["lists", "Space stock lists and rankings", "Every listed space company ranked on live data: price, insider trades, cash runway, contracts and earnings dates."],
  ["compare", "Space stocks compared", "Head-to-head comparisons of the space stocks investors weigh against each other most."],
  ["funds", "Funds and international", "Space ETFs, and the UK and European space companies."],
];

// The sign-up box placed inside each guide (after its first table): heading and one line.
// Guides without an entry get the default. Written to match what the reader came for.
// Inline sign-up box on guide pages: [heading, text, ticker to tag as followed, button label].
// Results pages get one built from the company name (see guideCta).
export function guideCta(path, results = [], profiles = {}) {
  if (path.startsWith("/earnings-preview/")) {
    const t = path.split("/")[2].toUpperCase(), n = profiles[t]?.name || t;
    return [`Get ${n}'s results in your inbox`, `The Sunday briefing after ${n} reports covers the numbers and how the stock reacted, with the rest of the week in space stocks. Free, five minutes.`, t, `Follow ${t}`];
  }
  const r = path.startsWith("/results/") && results.find((x) => `/results/${x.slug}` === path);
  if (r) return [`Get ${r.name || r.ticker}'s next results in your inbox`, `The Sunday briefing after each ${r.name || r.ticker} report covers the numbers and how the stock reacted, with the rest of the week in space stocks. Free, five minutes.`, r.ticker, `Follow ${r.ticker}`];
  return GUIDE_CTA[path] || GUIDE_CTA_DEFAULT;
}

// Stock page <title>, shared by the app and the prerender. US listings lead with the earnings date,
// the query people search every quarter.
export const stockTitle = (t, p) => p.listing || t === "MDA"
  ? `${t} Stock: ${p.name} Share Price, News and Results | Orbit Alpha`
  : `${t} Stock: ${p.name} Earnings Date, News and Filings | Orbit Alpha`;

export const GUIDE_CTA = {
  "/spacex-stock/lockup-calendar": ["Get a reminder the evening before the 8 December unlock", "Up to about 800 million more SpaceX shares are released on 8 December, the end of the main lock-up. We email you on 7 December with how many shares unlock and how SPCX traded on the earlier release days, then the week in space stocks every Sunday. Free, one click to unsubscribe.", "SPCX", "Remind me on 7 Dec"],
  "/articles/spacex-lock-up-ends-8-december": ["Get an email before the 8 December SpaceX unlock", "Sign up and the Sunday briefing before 8 December covers what unlocks and when, alongside the week in space stocks. Free.", "SPCX", "Remind me"],
  "/articles/rocket-lab-q3-2026-earnings-date": ["Get Rocket Lab's results in your inbox", "The Sunday briefing after Rocket Lab reports covers the numbers and how the stock reacted, with the rest of the week in space stocks. Free, five minutes.", "RKLB", "Follow RKLB"],
  "/articles/will-spacex-join-the-sp-500": ["Follow SpaceX every week", "Results, lock-up releases and index news for SPCX, with the rest of the space sector, in a free email every Sunday.", "SPCX", "Follow SPCX"],
  "/spacex-ipo": ["Follow SpaceX stock every week", "What moved SPCX, results, lock-up releases and analyst changes, with the rest of the space sector, in a free email every Sunday."],
  "/spacex-stock": ["Follow SpaceX stock every week", "What moved SPCX, results and analyst changes, with the rest of the space sector, in a free email every Sunday."],
  "/starlink-stock": ["Follow Starlink and SpaceX every week", "SpaceX results, Starlink news and the rest of the space sector, in a free email every Sunday."],
  "/space-stocks/earnings-calendar": ["Get space stock results in your inbox", "The Sunday issue covers the week's results, analyst changes and what moved each stock. Free."],
  "/space-stocks/insider-trading": ["Follow space stocks every week", "Moves, analyst changes, contracts and filings across every listed space company, every Sunday. Free."],
  "/space-stocks/cash-runway": ["Follow space stocks every week", "Moves, share offerings, contracts and filings across every listed space company, every Sunday. Free."],
  "/space-stocks/government-contracts": ["Follow space contract wins every week", "Contracts, launches and what moved each space stock, in a free email every Sunday."],
  "/space-stocks/this-week": ["Why they moved, every Sunday", "The Sunday issue explains the week's biggest space stock moves: results, contracts, filings and launches. Free, five minutes."],
  "/space-stocks/launch-events": ["Know what is launching each week", "The Sunday briefing lists the week's launches that matter for space stocks, with the results and the market reaction. Free, five minutes."],
  "/space-stocks/under-10": ["Follow the small space stocks every week", "What moved the smaller names, plus the rest of the sector, every Sunday. Free."],
  "/space-stocks/uk-europe": ["Space stocks for UK and European investors", "The week in space stocks, US and European names included, every Sunday. Free."],
};
export const GUIDE_CTA_DEFAULT = ["The week in space stocks, every Sunday", "Moves, contracts, filings and launches across every listed space company. Free, five minutes, one click to unsubscribe."];

// Evergreen guide pages: static pages built from live data at build time (scripts/guides.mjs)
// and shown in the app as-is. Path -> title, description and a short label for link lists.
export const GUIDES = {
  "/space-stocks": {
    group: "lists",
    label: "List of space stocks",
    title: "List of Space Stocks (2026): Every Listed Space Company by Sector | Orbit Alpha",
    description: "Every publicly traded space stock in one list: launch, satellite communications, Earth observation, infrastructure and exploration, with price, market cap and year-to-date return.",
  },
  "/space-stocks/this-week": {
    group: "lists",
    label: "Space stocks this week",
    title: "Space Stocks This Week: Biggest Gainers and Losers | Orbit Alpha",
    description: "How every listed space stock moved over the last five trading days, ranked from biggest gainer to biggest faller, with the UFO space ETF and the S&P 500 for comparison. Updated every trading day.",
  },
  "/space-stocks/statistics": {
    group: "lists",
    label: "Space stocks by the numbers",
    title: "Space Stocks by the Numbers: Sector Size, Returns, Profits and Cash | Orbit Alpha",
    description: "The listed space sector in figures, updated daily: combined market value, year-to-date returns against the S&P 500, how many are profitable, cash, insider trading and government contracts.",
  },
  "/articles": {
    group: "lists",
    label: "Space stock questions answered",
    title: "Space Stock Questions Answered: Articles | Orbit Alpha",
    description: "Short, sourced answers to the questions investors are asking about space stocks right now: SpaceX, lock-ups, index inclusion, launches and results.",
  },
  "/space-stocks/largest": {
    hubHide: true, // kept live for search, left off the guides page to keep it focused
    group: "lists",
    label: "Largest space companies by market cap",
    title: "Largest Space Companies by Market Cap (2026) | Orbit Alpha",
    description: "Every listed space company ranked by market value in US dollars, from SpaceX down to the small caps, with share price and year-to-date return. Updated every trading day.",
  },
  "/space-stocks/launch-events": {
    group: "lists",
    label: "Space stock launch events",
    title: "Space Stock Launch Calendar: the Launches That Move Space Stocks | Orbit Alpha",
    description: "Upcoming launches that matter for listed space stocks: first flights, constellation deployments and key missions, with dates, what is at stake and past share moves.",
  },
  "/space-stocks/insider-trading": {
    group: "lists",
    label: "Space stocks insider buying and selling",
    title: "Space Stocks Insider Buying and Selling: Form 4 Tracker | Orbit Alpha",
    description: "Which space company insiders are buying and selling their own stock: open-market Form 4 trades over the last 3 and 12 months, and the largest individual trades.",
  },
  "/space-stocks/cash-runway": {
    group: "lists",
    label: "Space stocks cash runway ranking",
    title: "Space Stocks Cash Runway Ranking: Who Needs to Raise Money? | Orbit Alpha",
    description: "Cash, free cash flow and months of runway for every US-listed space stock, ranked from shortest runway to cash generative, from SEC filings.",
  },
  "/space-stocks/government-contracts": {
    hubHide: true, // kept live for search, left off the guides page to keep it focused
    group: "lists",
    label: "Space company government contracts",
    title: "Space Company Government Contracts: NASA, Space Force and DoD Awards Ranked | Orbit Alpha",
    description: "US government contract awards to listed space companies over the last 12 months, ranked by value, with the latest NASA, Space Force and Department of Defense awards.",
  },
  "/space-stocks/earnings-calendar": {
    group: "lists",
    label: "Space stocks earnings calendar",
    title: "Space Stocks Earnings Calendar: Upcoming Report Dates and Estimates | Orbit Alpha",
    description: "When each US-listed space stock reports earnings next, with timing and consensus EPS estimates, plus what to watch in a space company's results.",
  },
  "/space-stocks/uk-europe": {
    group: "funds",
    label: "UK and European space stocks",
    title: "UK and European Space Stocks: Eutelsat, SES, OHB, Avio, Filtronic and More | Orbit Alpha",
    description: "Every listed space company in the UK and Europe, with price, market cap and year-to-date return, plus how UK investors can buy them in an ISA or SIPP.",
  },
  "/space-etfs": {
    group: "funds",
    label: "Space ETFs compared",
    title: "Space ETFs Compared: UFO, ARKX, ROKT, MARS and NASA Returns | Orbit Alpha",
    description: "Space ETFs and funds side by side: 1-month, 3-month, year-to-date and 1-year returns against the S&P 500 and Nasdaq 100, and how they differ from owning space stocks directly.",
  },
  // `tickers`: the stock pages that link to this guide. `parent`: the guide one level up (breadcrumbs).
  "/spacex-stock": {
    group: "spacex",
    label: "How to buy SpaceX (SPCX) stock",
    title: "How to Buy SpaceX Stock (SPCX) in the UK and US: ISA, Platforms and Costs | Orbit Alpha",
    description: "How to buy SpaceX shares (Nasdaq: SPCX) step by step, including in a UK Stocks and Shares ISA: platforms, currency fees, the W-8BEN form, fractional shares and what you actually own.",
    tickers: ["SPCX"],
  },
  "/spacex-ipo": {
    group: "spacex",
    label: "SpaceX IPO: price, date and performance",
    title: "SpaceX IPO: Price, Date, Valuation and How SPCX Has Traded Since | Orbit Alpha",
    description: "SpaceX's June 2026 IPO in one page: the $135 price, the $75 billion raise, the valuation, first-day close and how SPCX has traded since, plus the lock-up dates.",
    tickers: ["SPCX"],
  },
  "/spacex-stock/lockup-calendar": {
    group: "spacex",
    label: "SpaceX lockup calendar",
    title: "SpaceX (SPCX) Lockup Expiration Calendar: Every Unlock Date and Share Count | Orbit Alpha",
    description: "Every SpaceX lockup release date from the IPO prospectus, with shares unlocked, how SPCX traded on each day, the Q3 earnings tranche, 8 December expiry and when Elon Musk can sell.",
    tickers: ["SPCX"],
    parent: "/spacex-stock",
  },
  "/starlink-stock": {
    group: "spacex",
    label: "Starlink stock: how to invest in Starlink",
    title: "Starlink Stock: Can You Buy Starlink Shares? How to Invest in Starlink | Orbit Alpha",
    description: "Starlink has no separate stock. Here is how to invest in Starlink through SpaceX (SPCX), what share of SpaceX it is, subscriber and revenue figures, and the listed rivals.",
    tickers: ["SPCX"],
  },
  "/space-stocks/under-10": {
    hubHide: true, // kept live for search, left off the guides page to keep it focused
    group: "lists",
    label: "Space stocks under $10",
    title: "Space Stocks Under $10: Cheap Space Stocks by Market Cap, Cash and Dilution | Orbit Alpha",
    description: "Every US-listed space stock trading under $10 a share, with market cap, year-to-date return, cash runway and share dilution, updated from live prices and SEC filings.",
  },
  "/compare/spacex-vs-rocket-lab": {
    group: "compare",
    label: "SpaceX vs Rocket Lab stock",
    title: "SpaceX vs Rocket Lab Stock: SPCX vs RKLB Compared | Orbit Alpha",
    description: "SpaceX (SPCX) and Rocket Lab (RKLB) side by side: market cap, returns, revenue growth, cash, debt, dilution, insider trades and how the two launch companies differ.",
    tickers: ["SPCX", "RKLB"],
    compare: ["SPCX", "RKLB"],
  },
  "/compare/ast-spacemobile-vs-spacex": {
    group: "compare",
    label: "AST SpaceMobile vs SpaceX (Starlink)",
    title: "AST SpaceMobile vs SpaceX Starlink Stock: ASTS vs SPCX Compared | Orbit Alpha",
    description: "AST SpaceMobile (ASTS) against SpaceX (SPCX), whose Starlink runs a rival direct-to-cell service: market cap, returns, revenue, cash, dilution and the race to connect ordinary phones.",
    tickers: ["ASTS", "SPCX"],
    compare: ["ASTS", "SPCX"],
  },
  "/compare/rocket-lab-vs-ast-spacemobile": {
    group: "compare",
    label: "Rocket Lab vs AST SpaceMobile stock",
    title: "Rocket Lab vs AST SpaceMobile Stock Comparison: RKLB vs ASTS | Orbit Alpha",
    description: "Rocket Lab (RKLB) and AST SpaceMobile (ASTS), two of the most traded space stocks, side by side: market cap, returns, revenue, cash runway, dilution and insider trades.",
    tickers: ["RKLB", "ASTS"],
    compare: ["RKLB", "ASTS"],
  },
  "/compare/rocket-lab-vs-firefly": {
    group: "compare",
    label: "Rocket Lab vs Firefly Aerospace stock",
    title: "Rocket Lab vs Firefly Stock Comparison: RKLB vs FLY | Orbit Alpha",
    description: "Rocket Lab (RKLB) and Firefly Aerospace (FLY) side by side: market cap, returns, revenue growth, cash runway, dilution and how their rockets and lunar businesses compare.",
    tickers: ["RKLB", "FLY"],
    compare: ["RKLB", "FLY"],
  },
  "/results": {
    group: "lists",
    label: "Space stock results",
    title: "Space Stock Earnings Results: Latest Quarterly Results by Company | Orbit Alpha",
    description: "The latest quarterly results from listed space companies, published on results day: revenue, profit, guidance, key points and how the shares reacted.",
  },
  // Media kit for sponsors (no group, so it stays out of the guide lists).
  "/space-stocks-widget": {
    label: "Free space stocks widget",
    title: "Free Space Stocks Widget: Live Space Stock Prices for Your Website | Orbit Alpha",
    description: "Embed a free, live table of space stock prices on your website or blog with one line of code. SpaceX, Rocket Lab, AST SpaceMobile and more, refreshed every five minutes.",
  },
  "/advertise": {
    label: "Advertise with Orbit Alpha",
    title: "Advertise with Orbit Alpha: Space Stocks Newsletter Sponsorship | Orbit Alpha",
    description: "Sponsor the Orbit Alpha space stocks newsletter: one sponsored feature per Sunday issue at $500, who reads it and how to book.",
  },
  // The /guides hub. `hub` keeps it out of guide link lists (it is the list).
  "/guides": {
    hub: true,
    label: "All space stock guides",
    title: "Space Stock Guides: SpaceX, Rankings, Comparisons and ETFs | Orbit Alpha",
    description: "Every Orbit Alpha space stock guide in one place: how to buy SpaceX, the SPCX lockup calendar, space stock rankings, head-to-head comparisons and space ETFs.",
  },
};

// Guides in display order (by group), without the hub.
export const GUIDE_LIST = GUIDE_GROUPS.flatMap(([g]) => Object.entries(GUIDES).filter(([, x]) => x.group === g));
