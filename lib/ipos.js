// Space IPOs since 2025 and their lock-up expirations. Fixed facts from each company's pricing
// release or prospectus, with the source for every figure. Used by scripts/ipos.mjs for
// /space-stocks/ipos and /space-stocks/lockup-expirations. Add new listings here as they price.
//
// Per listing:
//   ticker, firstTrade (first day of trading, YYYY-MM-DD), price (IPO price, USD), shares (sold in the
//   IPO), raised (headline gross proceeds as text), exchange, sources: [[title, url]]
//   lockup: { date (first day locked-up shares could be sold, YYYY-MM-DD), note, shares?, sources }
//     or { schedule: "spacex" } for SpaceX's staged releases (kept on its own calendar page),
//     or null where no expiry date has been confirmed from a source.

export const IPOS = [
  {
    ticker: "SPCX", firstTrade: "2026-06-12", price: 135, shares: 555.6e6, raised: "$75 billion", exchange: "Nasdaq",
    sources: [["CNBC: SpaceX raises $75 billion in record-setting IPO", "https://www.cnbc.com/2026/06/11/spacex-raises-75-billion-in-record-setting-ipo-ahead-of-nasdaq-debut.html"]],
    lockup: { schedule: "spacex" },
  },
  {
    ticker: "HAWK", firstTrade: "2026-05-07", price: 26, shares: 16e6, raised: "$416 million", exchange: "NYSE",
    sources: [["HawkEye 360 announces pricing of initial public offering", "https://www.geoconnexion.com/news/hawkeye-360-announces-pricing-of-initial-public-offering"]],
    lockup: {
      date: "2026-09-02",
      note: "Released early. The 180-day lock-up would have ended in a quarterly blackout period, so under its terms all locked-up shares became free to sell from 2 September. Some IPO calendars still show 3 November.",
      sources: [["HawkEye 360 confirms early lock-up release for 2 September", "https://finviz.com/news/386800/hawkeye-360-confirms-early-lock-up-release-for-september-2nd-announces-preliminary-inclusion-in-the-russell-2000-index"]],
    },
  },
  {
    ticker: "YSS", firstTrade: "2026-01-29", price: 34, shares: 18.5e6, raised: "$629 million", exchange: "NYSE",
    sources: [["York Space Systems announces pricing of upsized IPO", "https://www.01net.it/york-space-systems-announces-pricing-of-upsized-initial-public-offering/"]],
    lockup: {
      date: "2026-07-28", note: "Standard 180-day lock-up for insiders and pre-IPO shareholders.",
      sources: [["MarketBeat: York Space Systems lock-up period to end on 28 July", "https://www.marketbeat.com/instant-alerts/york-space-systems-incs-lock-up-period-to-end-on-july-28th-nyseyss-2026-07-21/"]],
    },
  },
  {
    ticker: "FLY", firstTrade: "2025-08-07", price: 45, shares: 19.296e6, raised: "$868 million", exchange: "Nasdaq",
    sources: [["Firefly Aerospace announces pricing of upsized IPO", "https://www.globenewswire.com/news-release/2025/08/06/3128792/0/en/firefly-aerospace-announces-pricing-of-upsized-initial-public-offering.html"]],
    lockup: {
      date: "2026-02-03", shares: 125.9e6, note: "About 125.9 million shares could become eligible for sale, according to the prospectus. Shares issued in an acquisition stayed restricted until 7 February.",
      sources: [["TS2: Firefly lock-up ends 3 February", "https://ts2.tech/en/firefly-aerospace-stock-slides-10-as-fly-lock-up-deadline-hits-tuesday/"]],
    },
  },
  {
    ticker: "VOYG", firstTrade: "2025-06-11", price: 31, shares: 12348387, raised: "$383 million", exchange: "NYSE",
    sources: [["Voyager announces pricing of initial public offering", "https://voyagertechnologies.com/press-releases/voyager-announces-pricing-of-initial-public-offering/"]],
    lockup: null,
  },
  {
    ticker: "KRMN", firstTrade: "2025-02-13", price: 22, shares: 23e6, raised: "$506 million", exchange: "NYSE",
    sources: [["Karman announces pricing of its initial public offering (SEC 8-K)", "https://www.sec.gov/Archives/edgar/data/2040127/000119312525029677/d932505dex991.htm"]],
    lockup: {
      date: "2025-08-12", note: "Standard 180-day lock-up. The IPO included 14.6 million shares sold by existing holders.",
      sources: [["Karman lock-up period ends 12 August", "https://finder.techleap.nl/news/feed/karman-holdings-506m-lock-up-ends"]],
    },
  },
];

// Private space companies that have publicly filed to list. Empty until one files; the page says so
// and cites the trackers that were checked.
export const PIPELINE = [];
export const PIPELINE_CHECKED = {
  date: "2026-10-28",
  sources: [
    ["New Space Tracker: upcoming space IPOs (updated 21 Sep 2026)", "https://newspacetracker.com/ipos/"],
    ["Nasdaq Private Market: pre-IPO space companies after the SpaceX listing (26 Jun 2026)", "https://www.nasdaqprivatemarket.com/insights/weekly-commentary/space-ex-spacex-pre-ipo-space-companies/"],
  ],
  watch: ["Sierra Space", "Axiom Space", "Relativity Space", "Stoke Space", "Impulse Space", "Vast"],
};
