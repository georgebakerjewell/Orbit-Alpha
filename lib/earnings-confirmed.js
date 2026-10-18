// Results dates companies have announced themselves. The Nasdaq calendar often shows a projected
// date for weeks after the company confirms the real one (it had SpaceX on 3 Nov after SpaceX
// announced 20 Oct), so a confirmed date here replaces whatever Nasdaq lists for that ticker.
// Entries can stay after the date passes; they are ignored once it is in the past.
export const CONFIRMED = [
  { ticker: "SPCX", name: "SpaceX", date: "2026-10-20", time: "After close", source: "https://ir.spacex.com/updates/default.aspx" },
];

export function withConfirmed(list, today = new Date().toISOString().slice(0, 10)) {
  const live = CONFIRMED.filter((c) => c.date >= today);
  const tickers = new Set(live.map((c) => c.ticker));
  return [...(list || []).filter((e) => !tickers.has(e.ticker)), ...live.map((c) => ({ ...c, confirmed: true }))]
    .sort((a, b) => a.date.localeCompare(b.date));
}
