// /space-stocks/ipos (every US space IPO since 2025, with how each has traded since) and
// /space-stocks/lockup-expirations (when insiders could first sell, and how the stock moved that day).
// Listing and lock-up facts are fixed and sourced in lib/ipos.js; prices and day moves are live data.
// Called from scripts/guides.mjs with the shared guide helpers.
import { IPOS, PIPELINE, PIPELINE_CHECKED } from "../lib/ipos.js";

const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
// SpaceX: the main 180-day lock-up ends on day 180 after pricing on 11 June 2026 (see scripts/spacex.mjs).
const SPACEX_MAIN = { date: "2026-12-08", shares: "up to about 798 million shares, the remaining 17%" };

export function buildIpos(ctx) {
  const { profiles, quotes, perfBy, esc, list, fmtPrice, fmtCap, fmtPct, fmtDate, page, table, faq, and, asOfLine, asOf } = ctx;
  const today = ctx.today || asOf;
  const name = (t) => profiles[t]?.name || t;
  const link = (t) => `<a href="/stocks/${t.toLowerCase()}">${esc(name(t))}</a>`;
  const usd = (n) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
  const rows = IPOS.filter((x) => profiles[x.ticker]).map((x) => {
    const q = quotes[x.ticker];
    const since = q?.price != null ? (q.price / x.price - 1) * 100 : null;
    return { ...x, name: name(x.ticker), now: q?.price ?? null, cap: q?.marketCap ?? null, since };
  });
  const above = rows.filter((r) => r.since != null && r.since >= 0);
  const priced = rows.filter((r) => r.since != null);

  // Share move on a given trading day, from the daily performance series (YTD first, then 1 year).
  const dayMove = (t, date) => {
    for (const range of ["ytd", "1y"]) {
      const p = perfBy[range];
      const s = (p?.series || []).find((x) => x.id === t);
      const i = (p?.dates || []).indexOf(date);
      if (!s || i < 1 || s.values[i] == null) continue;
      let j = i - 1;
      while (j >= 0 && s.values[j] == null) j--;
      if (j < 0) continue;
      return ((100 + s.values[i]) / (100 + s.values[j]) - 1) * 100;
    }
    return null;
  };

  /* ── Space IPOs ─────────────────────────────────────────────────────────── */
  const ipoTable = table(["Company", "First trading day", "IPO price", "Raised", "Price now", "Since IPO"],
    rows.map((r) => [`${link(r.ticker)} (${r.ticker})`, fmtDate(r.firstTrade), usd(r.price), esc(r.raised), r.now != null ? fmtPrice(r.now) : null, r.since != null ? fmtPct(r.since) : null]));
  const best = [...priced].sort((a, b) => b.since - a.since)[0];
  const worst = [...priced].sort((a, b) => a.since - b.since)[0];
  const pipelineHtml = PIPELINE.length
    ? list(PIPELINE.map((p) => `${esc(p.name)}: ${esc(p.status)} (${ext(p.url, "source")})`))
    : `<p>As of ${fmtDate(PIPELINE_CHECKED.date)}, no private space company has publicly filed to list in the US. Companies often mentioned as candidates include ${and(PIPELINE_CHECKED.watch.map(esc))}; none has announced an IPO. Companies can file confidentially first, so a listing can be announced with a few weeks' notice. This page is updated when one files.</p>`;
  const ipoAnswer = `${rows.length} space companies have listed on US exchanges since February 2025, led by SpaceX, which raised $75 billion in June 2026, the largest IPO ever.${priced.length ? ` As of ${fmtDate(asOf)}, ${above.length} of ${priced.length} trade above their IPO price.` : ""}`;
  const ipoFaq = faq([
    ["What was the biggest space IPO?", "SpaceX, which priced at $135 a share on 11 June 2026 and raised $75 billion in the base offering, the largest IPO of any company. Before that, the largest recent space IPO was Firefly Aerospace, which raised $868 million in August 2025."],
    ...(priced.length ? [["Which space IPOs are trading above their IPO price?", above.length ? `As of ${fmtDate(asOf)}: ${and(above.map((r) => `${r.name} (${fmtPct(r.since)})`))}. ${priced.length - above.length === 1 ? "The other one trades" : `The other ${priced.length - above.length} trade`} below their IPO price.` : `As of ${fmtDate(asOf)}, none of the ${priced.length} space companies that listed since 2025 trades above its IPO price.`]] : []),
    ["Which space company will IPO next?", `No private space company had publicly filed to list in the US as of ${fmtDate(PIPELINE_CHECKED.date)}. Names often mentioned include ${and(PIPELINE_CHECKED.watch)}, but none has announced an IPO.`],
    ["When can insiders sell after a space IPO?", "Usually 180 days after the IPO, when the lock-up ends, though some agreements allow earlier releases. The dates for each recent space IPO are on the space stock lock-up expirations page."],
  ]);
  const ipoPage = page("/space-stocks/ipos", "Space IPOs: every listing since 2025 and how each has traded",
    `<p>Every space company that has listed on a US exchange since 2025, its IPO price and how the shares have traded since. Prices update every trading day.</p>
<h2>Which space companies have IPO'd?</h2>
${ipoTable}
<p>"Raised" is the headline gross proceeds in the base offering, before fees and any extra shares sold to underwriters. Karman's total includes shares sold by existing holders.</p>
${best && worst && best !== worst ? `<h2>Which space IPO has done best?</h2><p>${link(best.ticker)} is the best performer against its IPO price, ${fmtPct(best.since)} since ${fmtDate(best.firstTrade)}. ${link(worst.ticker)} has done worst, ${fmtPct(worst.since)} since ${fmtDate(worst.firstTrade)}.</p>` : ""}
<h2>Which space companies could IPO next?</h2>
${pipelineHtml}
<h2>When can insiders sell?</h2>
<p>Insiders and pre-IPO investors are usually barred from selling for about 180 days after an IPO. Every recent space lock-up, and how the shares moved when it ended, is on the <a href="/space-stocks/lockup-expirations">space stock lock-up expirations</a> page. SpaceX's staged releases have their own <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
${ipoFaq.html}
<h2>Sources</h2>${list([...rows.flatMap((r) => r.sources.map(([t, u]) => ext(u, esc(t)))), ...PIPELINE_CHECKED.sources.map(([t, u]) => ext(u, esc(t)))])}
${asOfLine("IPO terms from each company's pricing release; prices from Yahoo Finance.")}`,
    [ipoFaq.ld], asOf,
    { file: "og/guides/space-ipos.png", ticker: "IPOs", name: "Space IPOs", sector: "IPO tracker", path: "/space-stocks/ipos",
      headline: "Space IPOs since 2025, and how each has traded", asOf: fmtDate(asOf),
      stats: [["Listings", String(rows.length)], ...(priced.length ? [["Above IPO price", `${above.length} of ${priced.length}`]] : []), ["Largest", "SpaceX, $75bn"]] });
  ipoPage.answer = esc(ipoAnswer);

  /* ── Lock-up expirations ────────────────────────────────────────────────── */
  const lockRows = rows.filter((r) => r.lockup).map((r) => {
    if (r.lockup.schedule === "spacex") return { ...r, date: SPACEX_MAIN.date, staged: true };
    return { ...r, date: r.lockup.date, move: r.lockup.date <= today ? dayMove(r.ticker, r.lockup.date) : null };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = lockRows.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = lockRows.filter((r) => r.date < today);
  const status = (r) => (r.date > today ? "Upcoming" : r.date === today ? "Today" : "Ended");
  const lockTable = table(["Company", "IPO", "Lock-up end", "Status", "Move that day"],
    lockRows.map((r) => [`${link(r.ticker)} (${r.ticker})`, fmtDate(r.firstTrade),
      r.staged ? `${fmtDate(r.date)}, main lock-up (<a href="/spacex-stock/lockup-calendar">staged releases before it</a>)` : `${fmtDate(r.date)}${r.lockup.date && /early/i.test(r.lockup.note) ? " (released early)" : ""}`,
      status(r), r.move != null ? fmtPct(r.move) : r.date >= today ? "Not yet" : "-"]));
  const next = upcoming[0];
  const lockAnswer = `${next ? `The next space stock lock-up expiry is ${next.name}'s ${next.staged ? "main lock-up" : "lock-up"} on ${fmtDate(next.date)}${next.staged ? `, releasing ${SPACEX_MAIN.shares}` : ""}. ` : ""}Earlier space IPO lock-ups ended for ${and(past.map((r) => `${r.name} (${fmtDate(r.date)})`))}.`;
  const lockFaq = faq([
    ["What is a lock-up expiration?", "When a company goes public, its insiders and pre-IPO investors agree not to sell their shares for a set period, usually 180 days. When that lock-up ends, those shares can be sold for the first time, which can add a large supply of stock to the market."],
    ...(next?.staged ? [["When is the next space stock lock-up expiration?", `SpaceX's main lock-up ends on ${fmtDate(next.date)}, releasing ${SPACEX_MAIN.shares}. Several smaller SpaceX releases come before it; every date is on the SpaceX lockup calendar.`]] : []),
    ["When did the HawkEye 360 lock-up expire?", "All locked-up HawkEye 360 shares became free to sell from 2 September 2026, ahead of the standard 180 days, because the original date fell in a quarterly blackout period. Some IPO calendars still list 3 November."],
    ["Do space stocks fall when a lock-up ends?", `Not always. The table shows how each stock moved on the day its lock-up ended${past.some((r) => r.move != null) ? `: ${and(past.filter((r) => r.move != null).map((r) => `${r.name} ${fmtPct(r.move)}`))}` : ""}. Much of the selling can be priced in beforehand, and holders do not have to sell.`],
  ]);
  const lockPage = page("/space-stocks/lockup-expirations", "Space stock lock-up expiration dates",
    `<p>When insiders and pre-IPO investors in each recently listed space company could first sell, and how the shares moved that day. SpaceX releases its shares in stages, tracked day by day on the <a href="/spacex-stock/lockup-calendar">SpaceX lockup calendar</a>.</p>
<h2>When do space stock lock-ups expire?</h2>
${lockTable}
<p>"Move that day" is the share price change on the lock-up end date, from the previous close.</p>
<h2>Notes on each lock-up</h2>
${list(lockRows.map((r) => r.staged ? `${link(r.ticker)}: shares are released in stages after quarterly results and on set days, with the main lock-up ending ${fmtDate(r.date)}. Elon Musk's own lock-up runs for 366 days.` : `${link(r.ticker)}: ${esc(r.lockup.note)}`))}
<p>Voyager Technologies (VOYG), which listed in June 2025, is left out because its lock-up end date could not be confirmed from a public source.</p>
${lockFaq.html}
<h2>Sources</h2>${list(lockRows.flatMap((r) => (r.lockup.sources || []).map(([t, u]) => ext(u, esc(t)))))}
${asOfLine("Lock-up terms from company filings and releases; share moves from Yahoo Finance daily closes.")}`,
    [lockFaq.ld], asOf,
    { file: "og/guides/lockup-expirations.png", ticker: "UNLOCK", name: "Lock-ups", sector: "Lock-up tracker", path: "/space-stocks/lockup-expirations",
      headline: next ? `Next: ${next.name}, ${fmtDate(next.date)}` : "Space stock lock-up expirations", asOf: fmtDate(asOf),
      stats: past.slice(0, 3).map((r) => [r.name.split(" ")[0], r.move != null ? fmtPct(r.move) : fmtDate(r.date), r.move == null ? undefined : r.move >= 0 ? "#00ff88" : "#ff5c6c"]) });
  lockPage.answer = esc(lockAnswer);

  return [ipoPage, lockPage];
}
