// SpaceX guide pages: /spacex-stock (how to buy SPCX, with the UK angle) and
// /spacex-stock/lockup-calendar (every lock-up release date). Called from scripts/guides.mjs with the
// same data and helpers as the other guides. Live figures (price, next earnings date, insider sales)
// come from the build-time data; the IPO and lock-up terms are fixed facts from the June 2026
// prospectus, so they live here with their sources.

import { CONFIRMED } from "../lib/earnings-confirmed.js";

const IPO_PRICE = 135;
const PRICING = "2026-06-11"; // lock-up day counts run from the pricing date
const PROSPECTUS = "https://www.sec.gov/Archives/edgar/data/1181412/000162828026042639/spaceexplorationtechnologi.htm";

// US market holidays to the end of the lock-up schedule (Nasdaq calendar).
const HOLIDAYS = new Set(["2026-11-26", "2026-12-25", "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06"]);
const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const weekday = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
const isTrading = (iso) => weekday(iso) % 6 !== 0 && !HOLIDAYS.has(iso);
const tradingOnOrAfter = (iso) => { while (!isTrading(iso)) iso = addDays(iso, 1); return iso; };
// "The second full trading day after the earnings release": results after the close on day D make
// D+1 the first full trading day; results before the open make D itself the first.
function secondFullTradingDay(date, time = "") {
  let d = /before|pre/i.test(time) && isTrading(date) ? date : addDays(date, 1);
  d = tradingOnOrAfter(d);
  return tradingOnOrAfter(addDays(d, 1));
}
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const dayN = (n) => addDays(PRICING, n);
const shares = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")} billion` : `${(n / 1e6).toFixed(1).replace(/\.0$/, n % 1e6 ? ".0" : "")} million`);
import { chartLinkHtml } from "../lib/affiliates.js";
import { readNextHtml } from "../lib/readnext.js";
const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;

export function buildSpaceX(ctx) {
  const { quotes, earnings, filingsBy, asOf, esc, list, fmtPrice, fmtCap, fmtPct, fmtUsd, fmtDate, page, table, faq, asOfLine } = ctx;
  const today = ctx.today || asOf;
  const q = quotes.SPCX;
  const price = q?.price;
  const vsIpo = price != null ? (price / IPO_PRICE - 1) * 100 : null;
  const e = (earnings || []).find((x) => x.ticker === "SPCX" && x.date >= today);
  const short = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  /* ── The standard 180-day lock-up (employees and most pre-IPO investors) ── */
  // The Q3 release is dated from SpaceX's confirmed Q3 results date (kept after it passes), or failing
  // that from a projected date in the earnings calendar.
  const q3Src = CONFIRMED.find((c) => c.ticker === "SPCX" && c.date >= "2026-10-01" && c.date <= "2026-12-07")
    || (e && e.date <= "2026-12-07" ? e : null);
  const q3Firm = !!q3Src?.confirmed || CONFIRMED.includes(q3Src);
  const q3 = q3Src ? secondFullTradingDay(q3Src.date, q3Src.time) : null;
  const TRANCHES = [
    { date: "2026-08-06", what: "Second full trading day after Q2 results (4 Aug)", n: 911.5e6, pct: "20%", move: "+6%" },
    { date: dayN(70), what: "Day 70", n: 319.0e6, pct: "7%", move: "About -4%" },
    { date: dayN(90), what: "Day 90", n: 319.0e6, pct: "7%", move: "About -4%" },
    { date: dayN(105), what: "Day 105", n: 328.4e6, pct: "7%", move: "-0.2%" },
    { date: dayN(120), what: "Day 120", n: 328.4e6, pct: "7%", move: "+1%" },
    { date: dayN(135), what: "Day 135", n: 328.4e6, pct: "7%", move: "-0.4%" },
    { date: q3, what: "Second full trading day after Q3 results", n: 1.3e9, pct: "28%", q3: true, move: "-9%" },
    { date: dayN(180), what: "Day 180: lock-up expires", n: 798e6, pct: "Remaining 17%", approx: true },
  ].map((t) => ({ ...t, trade: t.date ? tradingOnOrAfter(t.date) : null }));
  const status = (t) => (!t.trade ? "Date not yet set" : t.trade < today ? "Released" : t.trade === today ? "Today" : "Upcoming");
  const next = TRANCHES.filter((t) => t.trade && t.trade >= today).sort((a, b) => a.trade.localeCompare(b.trade))[0] || null;
  const q3Row = TRANCHES.find((t) => t.q3);
  const released = TRANCHES.filter((t) => t.trade && t.trade < today);
  const releasedShares = released.reduce((s, t) => s + t.n, 0) + (today > "2026-09-10" ? 59.1e6 : 0);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const whenText = (t) => `${t.q3 && !q3Firm ? "expected " : ""}${DAYS[weekday(t.trade)]} ${fmtDate(t.trade)}${t.trade !== t.date ? ` (day ${daysBetween(PRICING, t.date)} is a ${DAYS[weekday(t.date)]})` : ""}${t.q3 ? (q3Firm ? `, two trading days after SpaceX's Q3 results on ${fmtDate(q3Src.date)}` : ", based on the expected results date") : ""}`;
  const dateCell = (t) => (t.trade ? `${t.q3 && !q3Firm ? "Expected " : ""}${fmtDate(t.date)}${t.trade !== t.date ? ` (trades ${short(t.trade)})` : ""}` : q3Pending);
  const sortKey = (t) => t.trade || "2026-11-15"; // an undated Q3 row sorts before 8 Dec // undated Q3 row sorts before 8 Dec
  const q3Pending = "When Q3 results are dated";

  /* ── Extended lock-up (Musk and certain large holders) ── */
  const EXTENDED = [
    { when: "Second full trading day after Q4 2026 results", date: null, release: "20% of the extended group's shares" },
    { when: "Day 280", date: dayN(280), release: "A further 10%" },
    { when: "Second full trading day after Q1 2027 results", date: null, release: "A further 20%" },
    { when: "Day 340", date: dayN(340), release: "A further 10%" },
    { when: "Day 366", date: dayN(366), release: "A further 20%, and Elon Musk's own lock-up ends" },
    { when: "Second full trading day after Q2 2027 results", date: null, release: "The rest of the extended group's shares" },
  ];
  const musk = tradingOnOrAfter(addDays(dayN(366), 1)); // released after the close on day 366

  /* ── Insider selling since the first release (Form 4 sales and Form 144 notices) ── */
  const sales = (filingsBy.SPCX || []).filter((f) => f.date >= "2026-08-06" && ((f.form === "4" && f.direction === "sale") || f.form === "144"));
  const salesHtml = sales.length
    ? table(["Date", "Filing", "Insider", "Value"], sales.map((f) => [fmtDate(f.date), ext(f.url, f.form === "144" ? "Form 144 (notice of planned sale)" : "Form 4 (sale)"), f.owner ? `${esc(f.owner)}${f.role ? `, ${esc(f.role)}` : ""}` : "See filing", f.value ? fmtUsd(f.value) : null]))
    : "<p>No insider sales or Form 144 notices have been filed since the first release on 6 August.</p>";

  const priceLine = price != null
    ? `SPCX last traded at ${fmtPrice(price)}, ${vsIpo >= 0 ? "up" : "down"} ${Math.abs(vsIpo).toFixed(1)}% on the $135 IPO price${q.marketCap ? `, valuing SpaceX at about ${fmtCap(q.marketCap)}` : ""}.`
    : "";
  const nextLine = next
    ? `The next lock-up release is ${next.q3 ? "the Q3 earnings tranche" : `the ${next.what.toLowerCase().replace(": lock-up expires", "")} release`} on ${fmtDate(next.trade)}${next.trade === today ? " (today)" : `, ${daysBetween(today, next.trade)} days away`}, freeing up to ${shares(next.n)} shares.`
    : "";
  const sources = (items) => `<h2>Sources</h2>${list(items.map(([u, t]) => ext(u, t)))}`;

  /* ═══ Page 1: How to buy SpaceX stock ═══════════════════════════════════════ */
  const buyFaq = faq([
    ["Can I buy SpaceX stock?", "Yes. SpaceX has been listed on Nasdaq since 12 June 2026 under the ticker SPCX, so anyone with a brokerage account that offers US shares can buy it, in the US, the UK and most other countries."],
    ["What is SpaceX's stock ticker?", "SPCX, on Nasdaq. Be careful not to confuse it with SPCE, which is Virgin Galactic, a different company."],
    ["Can I buy SpaceX shares in the UK?", "Yes. Most UK investment platforms that offer US shares list SPCX, including Hargreaves Lansdown, AJ Bell, interactive investor, Trading 212, IG and Interactive Brokers. You will usually need to complete a W-8BEN form first."],
    ["Can I hold SpaceX in a Stocks and Shares ISA?", "Yes. SPCX is listed on Nasdaq, which HMRC recognises as a stock exchange, so it can be held in a Stocks and Shares ISA or a SIPP on platforms that offer it. Gains inside an ISA are free of UK tax."],
    ["Do I pay stamp duty on SpaceX shares?", "No. The 0.5% UK stamp duty applies to shares in UK companies. US shares such as SPCX do not carry it, though platforms charge their own dealing and currency fees."],
    ["Does SpaceX pay a dividend?", "No. The IPO prospectus says SpaceX does not expect to pay cash dividends in the foreseeable future and plans to reinvest any earnings in the business."],
    ["How much does one SpaceX share cost?", price != null ? `SPCX last traded at about ${fmtPrice(price)} a share. Many platforms offer fractional shares, so you can invest a set amount, such as £50, rather than buying a whole share.` : "The price changes through the trading day. Many platforms offer fractional shares, so you can invest a set amount rather than buying a whole share."],
    ["What price did SpaceX IPO at?", "SpaceX priced its IPO at $135 a share on 11 June 2026, raising $75 billion in the base offering, the largest IPO ever. The shares closed their first day of trading at $161."],
    ["When can Elon Musk sell his SpaceX shares?", `Musk agreed to a 366-day lock-up with no early release, so he cannot sell before ${fmtDate(musk)}, the first trading day after it ends.`],
  ]);
  const buyPage = page("/spacex-stock", "How to buy SpaceX stock (SPCX)",
    `<p>SpaceX became a public company on 12 June 2026, when its Class A shares began trading on Nasdaq under the ticker <a href="/stocks/spcx">SPCX</a>. Buying it now works like buying any other US share: open an account with a platform that offers US stocks, fund it, search for SPCX and place an order. This guide covers each step, with the details that matter for UK investors: ISAs, currency fees and the W-8BEN form.</p>
${price != null || next ? `<div class="oa-callout"><p><b>SpaceX stock today.</b> ${priceLine} ${nextLine}${e ? ` SpaceX ${CONFIRMED.some((c) => c.ticker === "SPCX" && c.date === e.date) ? "reports" : "is expected to report"} its next results on ${fmtDate(e.date)}${e.time && e.time !== "Time TBC" ? `, ${esc(e.time.toLowerCase())}` : ""}.` : ""}</p><p>Live price and chart, filings and news: <a href="/stocks/spcx">SPCX stock page</a>.</p></div>` : ""}
<h2>How to buy SpaceX shares, step by step</h2>
<ol>
<li><b>Choose a platform and account.</b> Any broker that offers US shares will list SPCX. In the UK, decide first whether to buy inside a Stocks and Shares ISA (no UK tax on gains), a SIPP (pension, with tax relief on contributions) or an ordinary dealing account.</li>
<li><b>Complete a W-8BEN form.</b> UK and other non-US investors fill this in once, usually online when they first buy a US share. It confirms you are not a US taxpayer. SpaceX pays no dividend, so it does not affect SPCX today, but most platforms require it before you can trade any US stock.</li>
<li><b>Add money and decide on currency.</b> SPCX trades in US dollars. Most UK platforms convert your pounds automatically when you buy and convert back when you sell, charging a currency fee each time. Some let you hold dollars, which avoids paying the fee on every trade.</li>
<li><b>Search for SPCX.</b> Check the name reads Space Exploration Technologies Corp. or SpaceX. SPCE is Virgin Galactic, a separate company whose ticker is often confused with SpaceX's.</li>
<li><b>Choose an order type.</b> A market order buys straight away at the current price. A limit order only buys at your chosen price or lower, which is useful for a stock that can move several percent in a day. US markets open at 2:30pm UK time (9:30am in New York) for most of the year.</li>
<li><b>Pick the amount.</b> With fractional shares you can invest a fixed sum instead of paying for a whole share. Not every platform offers fractions on US stocks, or inside an ISA, so check before you buy.</li>
</ol>
<h2>How do you buy SpaceX stock in the UK?</h2>
<p>UK investors can buy SPCX through most of the main platforms, including Hargreaves Lansdown, AJ Bell, interactive investor, Trading 212, IG and Interactive Brokers. Hargreaves Lansdown and interactive investor also offered shares in the IPO itself, including inside ISAs.</p>
<h3>ISA and SIPP</h3>
<p>SPCX can be held in a Stocks and Shares ISA because Nasdaq is a stock exchange recognised by HMRC. Any gain made inside the ISA is free of capital gains tax, which matters for a volatile stock. The same applies inside a SIPP. Outside these wrappers, gains above the annual capital gains tax allowance are taxable when you sell.</p>
<h3>What it costs</h3>
${list([
      "Dealing commission: from nothing on app-based platforms to around £12 a trade on traditional ones, often less for frequent traders.",
      "Currency conversion: usually the biggest cost for small trades. Fees on US shares range from about 0.15% to 1.5% of the trade depending on the platform and the size of the deal, charged on the way in and again on the way out.",
      "Account fees: some platforms charge a percentage of your holdings or a flat monthly fee, which can matter more than dealing costs over time.",
      "Stamp duty: none. The 0.5% UK stamp duty does not apply to US shares.",
    ])}
<p>Platforms change their fees often, so compare the current tariff before choosing.</p>
<h2>How do you buy SpaceX stock in the US?</h2>
<p>US investors can buy SPCX through any brokerage account, including tax-advantaged accounts such as IRAs, at the normal commission for US stocks (zero at most large brokers). SPCX trades on Nasdaq during regular hours, 9:30am to 4pm Eastern, and many brokers also offer pre-market and after-hours trading.</p>
<h2>What do you own when you buy SPCX?</h2>
<p>Public investors own Class A shares, with one vote each. Elon Musk and a small group of insiders hold Class B shares with ten votes each, which gives Musk control of the company even though he owns less than half of the shares. Shareholders share in SpaceX's results but have little say in how it is run.</p>
<p>SPCX is a bet on several businesses at once: Falcon 9 and Starship launches, the Starlink satellite broadband network, and the xAI artificial intelligence business, which includes X. Starlink is the largest business, and in the first quarter of 2026 it was the only one making a profit. SpaceX has not paid a dividend and the prospectus says it does not expect to.</p>
<h2>SpaceX IPO facts</h2>
${table(["", ""], [
      ["Priced", "11 June 2026 at $135 a share"],
      ["Shares sold", "555.6 million Class A shares, plus an over-allotment option of 83.3 million"],
      ["Money raised", "$75 billion in the base offering, the largest IPO ever"],
      ["Valuation at the IPO price", "About $1.77 trillion"],
      ["First day of trading", "12 June 2026 on Nasdaq; closed at $161, up 19%"],
      ["Lead banks", "Goldman Sachs and Morgan Stanley"],
      ["Index inclusion", "Joined the Nasdaq-100 in July 2026"],
    ])}
<p>The shares rose above $200 in the week after listing, then fell below the IPO price and traded around $108 in early August, before the first lock-up release. ${price != null ? `They now trade at ${fmtPrice(price)}.` : ""}</p>
<h2>When can SpaceX insiders sell their shares?</h2>
<p>Most SpaceX shares are still held by employees, early investors and Musk, and they become free to sell in stages under the IPO lock-up. ${released.length ? `${["", "One release has", "Two releases have", "Three releases have", "Four releases have", "Five releases have", "Six releases have", "Seven releases have", "Eight releases have"][released.length]} passed so far, freeing up to ${shares(releasedShares)} shares.` : ""} The biggest single release, up to 1.3 billion shares, ${q3Row.trade && q3Row.trade < today ? "came" : "comes"} two trading days after SpaceX reports third-quarter results, and the main lock-up ${today > dayN(180) ? "ended" : "ends"} on 8 December 2026. Musk cannot sell until ${fmtDate(musk)}.</p>
<p>Every date and share count is on the <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
<h2>Which funds hold SpaceX stock?</h2>
<p>If you would rather not hold a single stock, SpaceX is also owned by funds you may already have. Since joining the Nasdaq-100 in July 2026, SPCX is held by every Nasdaq-100 tracker, including the US-listed QQQ and the Nasdaq-100 ETFs listed in London, many of which can go in an ISA. Several space ETFs, including the Procure Space ETF (UFO), hold it too, some as one of their largest positions. Fund weightings change, so check the current holdings on the issuer's website. The <a href="/space-etfs">space ETF comparison</a> shows how each fund has performed.</p>
<h2>What are the risks of SpaceX stock?</h2>
${list([
      "Valuation: at around $2 trillion, SpaceX is priced for many years of fast growth, and the share price has swung by more than 40% from peak to trough since the IPO.",
      "Share supply: billions of locked-up shares become sellable over the next year, which can weigh on the price around each release.",
      "Control: Musk's voting power means outside shareholders cannot change the board or block decisions.",
      "Currency: for UK investors, a stronger pound reduces the value of a US share in sterling terms, even if the share price does not move.",
    ])}
${buyFaq.html}
${sources([
      [PROSPECTUS, "SpaceX IPO prospectus (Form 424B4), SEC EDGAR"],
      ["https://www.cnbc.com/2026/06/11/spacex-raises-75-billion-in-record-setting-ipo-ahead-of-nasdaq-debut.html", "CNBC: SpaceX raises $75 billion in record-setting IPO"],
      ["https://techcrunch.com/2026/06/11/spacex-officially-prices-shares-at-135-in-the-largest-ipo-ever/", "TechCrunch: SpaceX prices shares at $135"],
      ["https://www.hl.co.uk/spacex", "Hargreaves Lansdown: SpaceX IPO, what UK investors need to know"],
      ["https://www.thisismoney.co.uk/money/investing/article-15894841/What-SpaceX-IPO-means-UK-investors-questions-answered.html", "This is Money: What the SpaceX IPO means for UK investors"],
      ["https://www.gov.uk/individual-savings-accounts", "GOV.UK: Individual Savings Accounts"],
    ])}
<p class="oa-note">Live figures as of ${fmtDate(asOf)}, refreshed whenever the site updates. Orbit Alpha is information, not investment or tax advice; tax treatment depends on your circumstances. Capital is at risk.</p>`,
    [buyFaq.ld, { "@type": "Article", headline: "How to buy SpaceX stock (SPCX)", dateModified: asOf, author: { "@id": `${ctx.SITE}/#org` }, publisher: { "@id": `${ctx.SITE}/#org` }, about: { "@type": "Corporation", name: "SpaceX", tickerSymbol: "SPCX" } }],
    asOf,
    {
      ticker: "SPCX", name: "SpaceX", headline: "How to buy SpaceX stock", sector: "UK and US guide", path: "/spacex-stock",
      file: "og/guides/spacex-stock.png", asOf: price != null ? fmtDate(asOf) : null,
      stats: [
        ...(price != null ? [["SPCX", fmtPrice(price)], ["vs $135 IPO", fmtPct(vsIpo), vsIpo >= 0 ? "#00ff88" : "#ff5c6c"]] : []),
        ...(q?.marketCap ? [["Market cap", fmtCap(q.marketCap)]] : []),
      ],
    });

  /* ═══ Page 2: Lockup calendar ═══════════════════════════════════════════════ */
  const lockFaq = faq([
    ["When does the SpaceX lockup expire?", "The main 180-day lock-up for employees and most pre-IPO investors ends on 8 December 2026. A group of large holders and Elon Musk are under a longer lock-up that runs into mid-2027."],
    ["How many SpaceX shares unlock after Q3 earnings?", `Up to 1.3 billion shares, 28% of the shares under the main lock-up, become free to sell at the start of the second full trading day after SpaceX reports third-quarter results.${q3Row.trade ? (q3Firm ? ` SpaceX reports Q3 results after the close on ${fmtDate(q3Src.date)}, so the release is on ${fmtDate(q3Row.trade)}.` : ` On the expected results date that would be ${fmtDate(q3Row.trade)}.`) : " SpaceX had not confirmed the results date at the last update."}`],
    ["When can Elon Musk sell SpaceX stock?", `Not before ${fmtDate(musk)}. Musk's lock-up lasts 366 days from the IPO pricing on 11 June 2026, with no early release of any kind. Day 366 is ${fmtDate(dayN(366))}, a ${weekday(dayN(366)) === 6 ? "Saturday" : "weekday"}, so the first trading day he could sell is ${fmtDate(musk)}.`],
    ["Does a lockup expiry mean insiders will sell?", "No. An unlock gives holders permission to sell, not an obligation. Many employees and investors keep their shares, and sales by directors and officers show up afterwards in Form 4 filings, often after a Form 144 notice."],
    ["What happened to SPCX stock on past unlock days?", "Moves were mixed: up about 6% on the first release on 6 August, down about 4% on 20 August and 9 September, roughly flat on 24 September, up about 1% on 9 October and down about 9% on 22 October, the largest release, a day after shares rose about 8% on Q3 results, and down about 0.4% on 26 October. Across the first five releases the stock rose about 50%, from around $108 before the first one to about $163. After the 22 October release it closed at about $145, about 34% above that starting level, and on 26 October it closed at about $147, about 36% above."],
  ]);
  const lockPage = page("/spacex-stock/lockup-calendar", "SpaceX lockup calendar",
    `<p>Most SpaceX shares were not sold in the IPO. They belong to employees, early investors and Elon Musk, who agreed not to sell for a set period. Instead of releasing everything on one date, SpaceX's lock-up frees the shares in stages, some on fixed days counted from the IPO pricing on 11 June 2026 and some two trading days after quarterly results. This page lists every release with its date and share count, taken from the IPO prospectus.</p>
${next && (next.trade !== today || priceLine) ? `<div class="oa-callout"><p>${next.trade !== today ? `<b>${daysBetween(today, next.trade)} days</b> to the next release. ` : "<b>The next release is today.</b> "}${priceLine ? `${priceLine} <a href="/stocks/spcx">Live SPCX price</a> · ${chartLinkHtml("SPCX", "lockup-calendar", esc)}.` : ""}${today < "2026-12-08" ? ` <a href="#remind"><b>Follow SPCX in the free Sunday briefing</b></a>.` : ""}</p></div>` : ""}
<h2>When do SpaceX shares unlock? Every main lock-up release</h2>
<p>This 180-day lock-up covers most employees and early investors. Each release lets holders sell up to the stated share of what they held; percentages are of each holder's locked shares, so the share counts are maximums.</p>
${table(["Date", "Release", "Shares, up to", "Share of pool", "Status", "SPCX on the day"], [...TRANCHES].sort((a, b) => sortKey(a).localeCompare(sortKey(b))).map((t) => [
      dateCell(t), esc(t.what), `${t.approx ? "About " : ""}${shares(t.n)}`, t.pct, status(t), t.move || (status(t) === "Released" ? "n/a" : "-"),
    ]))}
${list([
      "On 6 August a price-based bonus could have released a further 10%, if SPCX had closed at $175.50 or more (30% above the IPO price) on five of the ten trading days to 4 August. It did not, so those shares stayed locked.",
      "On 10 September, a separate block of up to 59.1 million shares held by affiliates also became free. Affiliates sell under SEC Rule 144 volume limits, so these shares can only reach the market gradually.",
      q3Firm
        ? `SpaceX confirmed on 16 October that it will post Q3 results after the market closes on ${DAYS[weekday(q3Src.date)]} ${fmtDate(q3Src.date)}. ${fmtDate(addDays(q3Src.date, 1))} is the first full trading day after the release, so the Q3 shares become free at the start of ${DAYS[weekday(q3Row.trade)]} ${fmtDate(q3Row.trade)}${q3Row.trade < tradingOnOrAfter(dayN(135)) ? ", before the day-135 release" : ""}.`
        : `The Q3 release depends on when SpaceX reports. ${q3Src ? `Results are expected on ${fmtDate(q3Src.date)}, which would put the release on ${fmtDate(q3Row.trade)}.` : "SpaceX had not confirmed a date at the last update."} If results came after 8 December, the full expiry would release these shares first.`,
      "Shares bought in the IPO through the directed share programme (up to 5% of the offering, reserved for employees and people chosen by SpaceX) were never locked up.",
    ])}
${readNextHtml({ ticker: "SPCX", profiles: ctx.profiles, esc, placement: "lockup-calendar" })}
<h2>When can Elon Musk sell SpaceX shares?</h2>
<p>Elon Musk and a group of large shareholders, together holding about 7.8 billion shares (more than 63% of the shares outstanding before the IPO), agreed to stricter terms that run beyond December. Musk himself gets no early release at all.</p>
${table(["Date", "Trigger", "What is released"], EXTENDED.map((x) => [x.date ? `${fmtDate(x.date)}${tradingOnOrAfter(x.date) !== x.date ? ` (trades ${short(tradingOnOrAfter(x.date))})` : ""}` : "Depends on results date", esc(x.when), esc(x.release)]))}
<p>Musk's lock-up ends after the close of trading on day 366, ${fmtDate(dayN(366))}, so the first day he could sell is ${fmtDate(musk)}. He holds his stake mostly in ten-vote Class B shares; any Class B shares sold to outside investors convert into one-vote Class A shares.</p>
<h2>Have SpaceX insiders sold shares since the unlocks began?</h2>
<p>Directors and officers must report sales on Form 4 within two business days, and usually file a Form 144 notice beforehand. These are the filings for SpaceX since 6 August:</p>
${salesHtml}
<p>Employees who are not officers and venture investors below 10% do not file Form 4s, so most lock-up selling never appears by name. Volume on release days is the better guide to how much stock is changing hands.</p>
<h2>Why do lock-up releases matter for SPCX stock?</h2>
<p>A release adds shares that can be sold, and the stock often drifts lower in the days before a large one as traders position for extra supply. What actually happens depends on how many holders choose to sell, which is why SPCX has risen on some release days and fallen on others. The Q3 tranche is the largest of 2026, more than four times the size of the day-90 release, and the 8 December expiry frees the rest of the main pool.</p>
<p>For context: SpaceX has about 13.6 billion shares outstanding, so the main lock-up pool is roughly a third of the company, while the extended group, led by Musk, holds most of the rest.</p>
<p>How other recent space IPOs traded when their lock-ups ended, including HawkEye 360, York Space Systems and Firefly, is on the <a href="/space-stocks/lockup-expirations">space stock lock-up expirations</a> page. Every space listing since 2025 and its return since IPO: <a href="/space-stocks/ipos">space IPOs</a>.</p>
${lockFaq.html}
${sources([
      [PROSPECTUS, "SpaceX IPO prospectus (Form 424B4), SEC EDGAR, 12 June 2026"],
      ["https://ir.spacex.com/updates/releases-details/2026/SpaceX-to-Post-Third-Quarter-2026-Results-and-Host-Webcast-on-October-20-2026-2026-QssQGye3im/default.aspx", "SpaceX: Third quarter 2026 results date (16 October 2026)"],
      ["https://www.cnbc.com/2026/07/21/spacex-spcx-earnings-lock-up-expiration.html", "CNBC: SpaceX sets earnings date, triggering first big share unlock"],
      ["https://financefeeds.com/spacex-lock-up-schedule-pre-ipo-holders/", "FinanceFeeds: SpaceX lock-up schedule, when pre-IPO holders can sell"],
      ["https://www.fool.com/investing/2026/10/13/spacex-stock-has-climbed-about-50-through-6-insider-share-unlocks-the-biggest-is-still-ahead/", "The Motley Fool: SpaceX stock through six insider share unlocks"],
      ["https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001181412&type=4&owner=include", "SpaceX Form 4 filings, SEC EDGAR"],
      ["https://stockanalysis.com/stocks/spcx/history/", "StockAnalysis: SPCX daily price history"],
    ])}
<p class="oa-note">Release dates and share counts are from the IPO prospectus as reported by the sources above; share counts are maximums. Live figures and filings as of ${fmtDate(asOf)}, refreshed whenever the site updates. Orbit Alpha is information, not investment advice.</p>`,
    [lockFaq.ld, {
      "@type": "ItemList", name: "SpaceX lock-up release dates",
      itemListElement: [...TRANCHES].filter((t) => t.trade).sort((a, b) => a.trade.localeCompare(b.trade)).map((t, i) => ({ "@type": "ListItem", position: i + 1, name: `${fmtDate(t.trade)}: ${t.what}, up to ${shares(t.n)} shares` })),
    }],
    latest(asOf, sales[0]?.date),
    {
      ticker: "SPCX", name: "SpaceX", headline: "SpaceX lockup calendar", sector: "Lock-up tracker", path: "/spacex-stock/lockup-calendar",
      file: "og/guides/spacex-lockup-calendar.png", asOf: fmtDate(asOf),
      stats: next
        ? [["Next release", next.trade ? short(next.trade) : "After Q3 results"], ["Shares, up to", shares(next.n).replace(" million", "M").replace(" billion", "B")], ...(price != null ? [["SPCX", fmtPrice(price)]] : [])]
        : [],
    });

  buyPage.answer = `SpaceX trades on Nasdaq under the ticker SPCX. Buy it through any platform that offers US shares; in the UK it can be held in a Stocks and Shares ISA or SIPP after you complete a W-8BEN form, with no stamp duty to pay.${price != null ? ` As of ${fmtDate(asOf)}, SPCX was ${fmtPrice(price)}, ${vsIpo >= 0 ? "up" : "down"} ${Math.abs(vsIpo).toFixed(1)}% on the $135 IPO price.` : ""}`;
  lockPage.answer = `${next ? `The next SpaceX lockup release is ${DAYS[weekday(next.trade)]} ${fmtDate(next.trade)}: up to ${shares(next.n)} shares become free to sell (${next.q3 ? "the second full trading day after Q3 results" : next.what.toLowerCase()}). ` : ""}The main 180-day lock-up ${today > dayN(180) ? "ended" : "ends"} on 8 December 2026, and Elon Musk cannot sell before ${fmtDate(musk)}, after a 366-day lock-up.`;
  lockPage.datasets = [{
    slug: "spacex-lockup-schedule", name: "SpaceX (SPCX) lock-up release schedule", description: "Every SpaceX IPO lock-up release from the June 2026 prospectus: date, first trading day, trigger, maximum shares released and share of the main lock-up pool.",
    columns: ["date", "first_trading_day", "release", "shares_up_to", "share_of_pool", "status"],
    rows: [...TRANCHES].sort((x, y) => sortKey(x).localeCompare(sortKey(y))).map((t) => [t.date || "", t.trade || "", t.what, Math.round(t.n), t.pct, status(t)]),
  }];
  // Lead the title and description with the next unlock, so "SpaceX unlock <date>" searches match.
  if (next) {
    // Matches what people search: "spacex lockup expiration dates", "when is the next spacex lockup".
    const shortN = next.n >= 1e9 ? `${(next.n / 1e9).toFixed(1).replace(/\.0$/, "")}bn` : `${Math.round(next.n / 1e6)}M`;
    lockPage.title = `SpaceX Lockup Expiration Dates: Next Unlock ${next.trade === today ? "Today" : short(next.trade)} (${shortN} Shares)`;
    lockPage.description = `When is the next SpaceX lockup expiration? ${next.q3 && !q3Firm ? "Expected: up" : "Up"} to ${shares(next.n)} SPCX shares unlock ${next.trade === today ? "today" : `on ${DAYS[weekday(next.trade)]} ${short(next.trade)}`}. Every date, share count and stock move.`;
  }
  /* ═══ Page 3: SpaceX IPO ════════════════════════════════════════════════════ */
  // "SpaceX IPO" is still one of the most searched SpaceX queries. Facts are the same sourced
  // IPO terms as the buy guide; the live price comparison updates every build.
  const ipoFaq = faq([
    ["When did SpaceX go public?", "SpaceX priced its IPO on 11 June 2026 and its shares started trading on Nasdaq on 12 June 2026 under the ticker SPCX."],
    ["What was the SpaceX IPO price?", "$135 a share. The shares closed their first day of trading at $161, up 19%."],
    ["How much did SpaceX raise in its IPO?", "$75 billion in the base offering, from 555.6 million Class A shares, the largest IPO ever. The over-allotment option covered a further 83.3 million shares."],
    ["What was SpaceX valued at in the IPO?", "About $1.77 trillion at the $135 IPO price."],
    ["Can I still buy SpaceX shares after the IPO?", "Yes. SPCX trades on Nasdaq like any other listed stock, so it can be bought through most platforms that offer US shares, including in a UK Stocks and Shares ISA."],
    ...(price != null ? [["Is SpaceX stock above its IPO price?", `As of ${fmtDate(asOf)}, SPCX was ${fmtPrice(price)}, ${vsIpo >= 0 ? "up" : "down"} ${Math.abs(vsIpo).toFixed(1)}% on the $135 IPO price.`]] : []),
  ]);
  const ipoPage = page("/spacex-ipo", "SpaceX IPO",
    `<p>SpaceX became a public company in June 2026 in the largest stock market listing ever. This page sets out the IPO terms from the prospectus, how the shares have traded since, and what comes next for holders, including the lock-up releases.</p>
<h2>When did SpaceX IPO, and at what price?</h2>
${table(["", ""], [
      ["Priced", "11 June 2026 at $135 a share"],
      ["First day of trading", "12 June 2026 on Nasdaq; closed at $161, up 19%"],
      ["Ticker", "SPCX (Nasdaq)"],
      ["Shares sold", "555.6 million Class A shares, plus an over-allotment option of 83.3 million"],
      ["Money raised", "$75 billion in the base offering, the largest IPO ever"],
      ["Valuation at the IPO price", "About $1.77 trillion"],
      ["Lead banks", "Goldman Sachs and Morgan Stanley"],
      ...(price != null ? [["Latest close", `${fmtPrice(price)} (${fmtDate(asOf)}), ${fmtPct(vsIpo)} on the IPO price${q.marketCap ? `; market value about ${fmtCap(q.marketCap)}` : ""}`]] : []),
    ])}
<h2>How has SpaceX stock done since the IPO?</h2>
<p>The shares rose above $200 in the week after listing, then fell below the IPO price and traded around $108 in early August, before the first lock-up release. SpaceX joined the Nasdaq-100 in July 2026. ${price != null ? `SPCX last closed at ${fmtPrice(price)}. <a href="/stocks/spcx">Live SPCX price and chart</a>.` : ""}</p>
<p>SpaceX reported its first results as a listed company in August and its third-quarter results on 20 October 2026: <a href="/results/spcx-q3-2026">SpaceX Q3 2026 results</a>.</p>
<h2>When can SpaceX insiders sell?</h2>
<p>Most SpaceX shares are held by employees, early investors and Elon Musk, and become free to sell in stages under the IPO lock-up. ${next ? `The next release is ${fmtDate(next.trade)}, of up to ${shares(next.n)} shares. ` : ""}The main lock-up ${today > dayN(180) ? "ended" : "ends"} on 8 December 2026, and Musk cannot sell before ${fmtDate(musk)}. Every date is on the <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
<h2>Can you still buy SpaceX shares?</h2>
<p>SPCX can be bought through most platforms that offer US shares, in the US, the UK and elsewhere, including inside a UK Stocks and Shares ISA. The step-by-step guide is <a href="/spacex-stock">how to buy SpaceX stock</a>.</p>
${ipoFaq.html}
${sources([
      [PROSPECTUS, "SpaceX IPO prospectus (Form 424B4), SEC EDGAR"],
      ["https://www.cnbc.com/2026/06/11/spacex-raises-75-billion-in-record-setting-ipo-ahead-of-nasdaq-debut.html", "CNBC: SpaceX raises $75 billion in record-setting IPO"],
    ])}${asOfLine("Price from Yahoo Finance; IPO terms from the prospectus.")}`,
    [ipoFaq.ld], asOf);
  ipoPage.answer = `SpaceX priced its IPO at $135 a share on 11 June 2026 and began trading on Nasdaq as SPCX on 12 June, raising $75 billion, the largest IPO ever, at a valuation of about $1.77 trillion.${price != null ? ` As of ${fmtDate(asOf)}, SPCX was ${fmtPrice(price)}, ${vsIpo >= 0 ? "up" : "down"} ${Math.abs(vsIpo).toFixed(1)}% on the IPO price.` : ""}`;
  lockPage.next = next ? { date: next.trade, n: next.n, label: shares(next.n) } : null; // read by prerender for the homepage "What's next" strip
  return [buyPage, lockPage, ipoPage];
}
const latest = (...d) => d.filter(Boolean).sort().pop();
