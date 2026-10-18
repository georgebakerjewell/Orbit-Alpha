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
