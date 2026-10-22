// Launch-event pages: /launches/<slug>, one per launch that matters for a listed space stock (a first
// flight, a constellation deployment, a crewed or lunar mission), plus the /space-stocks/launch-events hub.
// Entries live in src/events.json and are researched and maintained by the "Space stock launch events"
// scheduled task. Entry shape:
//   { slug, title, tickers: [..], vehicle, status: "upcoming" | "done" | "scrubbed",
//     date: "YYYY-MM-DD" | null, dateText (as the source states it, e.g. "No earlier than December 2026"),
//     summary (2 sentences, under 300 characters), stakes: [why it matters for the stock, sourced],
//     facts: [[label, value]], history: [[earlier related event, date, outcome, share move]],
//     outcome?, reaction?, sources: [[title, url]], updated: "YYYY-MM-DD" }
import { GUIDES } from "../lib/pagemeta.js";

export function buildEvents(ctx) {
  const { SITE, ORG, crumbs, esc, list, fmtDate, profiles, events = [], asOf } = ctx;
  const ext = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const valid = events.filter((e) => e.slug && e.title && (e.tickers || []).every((t) => profiles[t]));
  const coLinks = (e) => (e.tickers || []).map((t) => `<a href="/stocks/${t.toLowerCase()}">${esc(profiles[t].name)} (${t})</a>`).join(", ");
  const when = (e) => (e.date ? fmtDate(e.date) : esc(e.dateText || "Date not yet set"));
  const order = (a, b) => (a.date || "9999").localeCompare(b.date || "9999");
  const upcoming = valid.filter((e) => e.status === "upcoming").sort(order);
  const past = valid.filter((e) => e.status !== "upcoming").sort((a, b) => order(b, a));

  const pages = valid.map((e) => {
    const path = `/launches/${e.slug}`;
    const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    return {
      path, guide: true, lastmod: e.updated || asOf,
      title: `${e.title}: Date and What It Means for ${(e.tickers || []).join(", ")} Stock | Orbit Alpha`,
      description: e.summary,
      body: `<div class="oa-guide"><h1>${esc(e.title)}</h1><!--oa-answer--><p>${e.status === "upcoming" ? "Scheduled" : e.status === "scrubbed" ? "Scrubbed or postponed" : "Flew"}: ${when(e)}${e.vehicle ? ` · ${esc(e.vehicle)}` : ""}. Companies involved: ${coLinks(e)}.</p>
${e.facts?.length ? `<h2>Key facts</h2>${table(["Item", "Detail"], e.facts)}` : ""}
${e.outcome ? `<h2>What happened</h2><p>${esc(e.outcome)}</p>` : ""}
${e.reaction ? `<h2>How the shares reacted</h2><p>${esc(e.reaction)}</p>` : ""}
${e.stakes?.length ? `<h2>Why it matters for the stock${(e.tickers || []).length > 1 ? "s" : ""}</h2>${list(e.stakes.map(esc))}` : ""}
${e.history?.length ? `<h2>Earlier launches and how the shares moved</h2>${table(["Event", "Date", "Outcome", "Share move"], e.history)}` : ""}
<h2>More</h2>${list([...(e.tickers || []).map((t) => `<a href="/stocks/${t.toLowerCase()}">${t} stock: live price, filings and contracts</a>`), `<a href="/space-stocks/launch-events">All space stock launch events</a>`, `<a href="/markets/launches">Full upcoming launch schedule</a>`])}
${e.sources?.length ? `<h2>Sources</h2>${list(e.sources.map(([t, u]) => ext(u, t)))}` : ""}
<p class="oa-note">Launch dates move often; this page is updated as they change. Orbit Alpha is information, not investment advice.</p></div>`,
      answer: esc(e.summary),
      ld: [ORG, { "@type": "Event", name: e.title, ...(e.date ? { startDate: e.date } : {}), eventStatus: `https://schema.org/${e.status === "scrubbed" ? "EventPostponed" : "EventScheduled"}`, eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: { "@type": "VirtualLocation", url: SITE + path }, description: e.summary, organizer: (e.tickers || []).map((t) => ({ "@type": "Corporation", name: profiles[t].name, tickerSymbol: t })) }, crumbs([["Home", "/"], ["Launch events", "/space-stocks/launch-events"], [e.title, path]])],
    };
  });

  const g = GUIDES["/space-stocks/launch-events"];
  const row = (e) => `<tr><td>${when(e)}</td><td><a href="/launches/${e.slug}">${esc(e.title)}</a></td><td>${(e.tickers || []).map((t) => `<a href="/stocks/${t.toLowerCase()}">${t}</a>`).join(", ")}</td></tr>`;
  const hub = {
    path: "/space-stocks/launch-events", guide: true, lastmod: valid.map((e) => e.updated).filter(Boolean).sort().pop() || asOf,
    title: g.title, description: g.description,
    body: `<div class="oa-guide"><h1>Space stock launch events</h1><!--oa-answer--><p>The launches that matter for listed space stocks: first flights of new rockets, constellation deployments and missions where a company's revenue or reputation is on the line. Each has its own page with the date, what is at stake and how the shares moved after earlier launches. For every scheduled launch, see the <a href="/markets/launches">full launch schedule</a>.</p>
${upcoming.length ? `<h2>Coming up</h2><table><thead><tr><th>Date</th><th>Launch</th><th>Stocks</th></tr></thead><tbody>${upcoming.map(row).join("")}</tbody></table>` : "<p>No launch events are listed right now.</p>"}
${past.length ? `<h2>Recent</h2><table><thead><tr><th>Date</th><th>Launch</th><th>Stocks</th></tr></thead><tbody>${past.slice(0, 20).map(row).join("")}</tbody></table>` : ""}
<p class="oa-note">Orbit Alpha is information, not investment advice.</p></div>`,
    answer: upcoming.length ? `The next launches that matter for space stocks: ${upcoming.slice(0, 3).map((e) => `${e.title} (${e.date ? fmtDate(e.date) : e.dateText || "date not set"})`).join("; ")}.` : "",
    ld: [ORG, crumbs([["Home", "/"], ["Launch events", "/space-stocks/launch-events"]])],
  };
  return [...pages, hub];
}
