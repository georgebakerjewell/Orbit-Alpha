// Results dates companies have announced themselves. The Nasdaq calendar often shows a projected
// date for weeks after the company confirms the real one (it had SpaceX on 3 Nov after SpaceX
// announced 20 Oct), so a confirmed date here replaces whatever Nasdaq lists for that ticker.
// Entries can stay after the date passes; they are ignored once it is in the past.
export const CONFIRMED = [
  { ticker: "SPCX", name: "SpaceX", date: "2026-10-20", time: "After close", source: "https://ir.spacex.com/updates/default.aspx" },
  { ticker: "RKLB", name: "Rocket Lab", date: "2026-11-09", time: "After close", source: "https://www.globenewswire.com/news-release/2026/10/20/3385004/0/en/rocket-lab-announces-date-of-third-quarter-2026-financial-results.html" },
];

// After a confirmed date has passed, the calendar can still show its stale projection for the same
// quarter (Nasdaq kept SpaceX on 3 Nov after it reported on 20 Oct), so any entry for that ticker
// within 75 days after the confirmed date is dropped too.
const plusDays = (iso, n) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
export function withConfirmed(list, today = new Date().toISOString().slice(0, 10)) {
  const live = CONFIRMED.filter((c) => c.date >= today);
  const tickers = new Set(live.map((c) => c.ticker));
  const past = CONFIRMED.filter((c) => c.date < today);
  const stale = (e) => past.some((c) => c.ticker === e.ticker && e.date > c.date && e.date <= plusDays(c.date, 75));
  return [...(list || []).filter((e) => !tickers.has(e.ticker) && !stale(e)), ...live.map((c) => ({ ...c, confirmed: true }))]
    .sort((a, b) => a.date.localeCompare(b.date));
}
