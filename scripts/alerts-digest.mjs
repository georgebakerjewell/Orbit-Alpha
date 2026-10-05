// Daily alerts digest ("Orbit Alpha Daily Flash").
// Builds one email per alert subscriber from the live site's data: share price moves for every
// followed company (always shown), plus new government contracts, SEC filings and insider trades,
// top news, and upcoming earnings and launches.
//
//   MODE=preview TICKERS=RKLB,ASTS   writes sample emails to out/alerts/ (nothing is sent)
//   MODE=send                        (next step) sends to alert subscribers via Resend
import { mkdirSync, writeFileSync } from "node:fs";
import { COVERED } from "../lib/roster.js";

const BASE = "https://www.orbitalpha.cloud";
const env = process.env;
const MODE = env.MODE || "preview";
const NOW = Date.now();
const DAY = 86_400_000;

const get = async (path) => {
  try { const r = await fetch(BASE + path); return r.ok ? await r.json() : null; } catch { return null; }
};

// ── Data ─────────────────────────────────────────────────────────────────────
const [quotesRes, contractsRes, filingsRes, earningsRes, launchesRes, news, yahooNews] = await Promise.all([
  get("/api/quotes"), get("/api/contracts"), get("/api/filings"), get("/api/earnings"), get("/api/launches"), get("/api/news?limit=80"), get("/api/yahoonews"),
]);
const quotes = quotesRes?.quotes || {};
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reWord = (w) => new RegExp(`(^|[^A-Za-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i");
const KEYWORDS = Object.fromEntries(Object.entries(COVERED).map(([t, c]) => [t, (c.keywords || [c.name]).map(reWord)]));
const LAUNCH_RE = Object.fromEntries(Object.entries(COVERED).filter(([, c]) => c.launch).map(([t, c]) => [t, new RegExp(c.launch, "i")]));
const ageDays = (iso) => (NOW - new Date(iso).getTime()) / DAY;

// Contracts: new awards (USAspending posts them with a lag, so look back two weeks).
const contracts = (contractsRes?.awards || []).filter((a) => ageDays(a.start) <= 14);
// Filings: last three days. Insider trades, offerings, big holders, reports, company updates.
const filings = (filingsRes?.filings || []).filter((f) => ageDays(f.date) <= 3 && ["insider", "dilution", "holder", "report", "event"].includes(f.kind));
// News: last ~36 hours, tagged to companies by ticker (Yahoo) or by keyword in the headline.
const seenTitle = new Set();
const newsItems = [...(yahooNews || []), ...(news || [])]
  .filter((n) => n?.title && n.pubDate && ageDays(n.pubDate) <= 1.5)
  .filter((n) => { const k = n.title.toLowerCase().slice(0, 60); if (seenTitle.has(k)) return false; seenTitle.add(k); return true; })
  .map((n) => ({ ...n, title: n.title.replace(/\s*[\u2014\u2013]\s*|\s+--\s+/g, ": ") })) // house style: no em dashes, even in quoted headlines
  .map((n) => ({ ...n, tickers: n.ticker && COVERED[n.ticker] ? [n.ticker] : Object.keys(KEYWORDS).filter((t) => KEYWORDS[t].some((re) => re.test(n.title))) }));
// Coming up: earnings in the next 7 days, launches in the next 3.
const earnings = (Array.isArray(earningsRes) ? earningsRes : []).filter((e) => { const d = (new Date(e.date).getTime() - NOW) / DAY; return d >= -0.5 && d <= 7; });
const launches = (launchesRes?.result || []).filter((l) => l.sort_date && (l.sort_date * 1000 - NOW) / DAY >= -0.2 && (l.sort_date * 1000 - NOW) / DAY <= 3)
  .map((l) => { const text = [l.provider?.name, l.vehicle?.name, l.name, ...(l.missions || []).map((m) => m.name)].join(" "); return { ...l, tickers: Object.keys(LAUNCH_RE).filter((t) => LAUNCH_RE[t].test(text)) }; });

// ── Formatting ───────────────────────────────────────────────────────────────
const CUR = { USD: ["$", ""], EUR: ["€", ""], CAD: ["C$", ""], GBp: ["", "p"], SEK: ["", " kr"] };
const money = (v, cur = "USD") => { const [a, b] = CUR[cur] || ["", ` ${cur}`]; return `${a}${v.toFixed(2)}${b}`; };
const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}K`);
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const GREEN = "#0a8f5a", RED = "#c62f3c", MUTED = "#6b7280", INK = "#111827", LINE = "#e5e7eb";
const color = (v) => (v >= 0 ? GREEN : RED);
const fmtDate = (iso, opts) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", ...opts });

function buildDigest(follow) {
  const tickers = follow === "ALL" ? Object.keys(COVERED) : follow.filter((t) => COVERED[t]);
  const priced = tickers.filter((t) => quotes[t]?.price != null).sort((a, b) => Math.abs(quotes[b].changePct) - Math.abs(quotes[a].changePct));

  // Events per company.
  const events = {};
  const add = (t, kind, html, weight) => { (events[t] ||= []).push({ kind, html, weight }); };
  for (const a of contracts) if (tickers.includes(a.ticker))
    add(a.ticker, "Contract", `<b>${usd(a.amount)}</b> from ${esc(a.subAgency || a.agency)}: ${esc((a.description || "").replace(/^./, (c) => c.toUpperCase()))} <a href="${a.url}" style="color:${MUTED}">(source)</a>`, 3 + Math.log10(a.amount));
  for (const f of filings) if (tickers.includes(f.ticker)) {
    const who = f.owner ? ` · ${esc(f.owner)}${f.role ? `, ${esc(f.role)}` : ""}` : "";
    const val = f.value ? ` · ${usd(f.value)}` : "";
    add(f.ticker, f.kind === "insider" ? "Insider" : "Filing", `${esc(f.label)}${who}${val} <a href="${f.url}" style="color:${MUTED}">(SEC ${esc(f.form)})</a>`, f.kind === "insider" && f.direction === "buy" ? 6 : f.kind === "dilution" ? 6 : 4);
  }
  const newsCount = {};
  for (const n of newsItems) for (const t of n.tickers) if (tickers.includes(t) && (newsCount[t] = (newsCount[t] || 0) + 1) <= 3)
    add(t, "News", `<a href="${esc(n.link)}" style="color:${INK};text-decoration:none">${esc(n.title)}</a> <span style="color:${MUTED}">· ${esc(n.source || "")}</span>`, n.highlight ? 3 : 2);
  for (const e of earnings) if (tickers.includes(e.ticker))
    add(e.ticker, "Earnings", `Reports ${fmtDate(e.date + "T12:00:00Z", { weekday: "long", day: "numeric", month: "short" })}${e.time ? ` (${esc(e.time.toLowerCase())})` : ""}${e.epsEst ? ` · EPS estimate ${esc(e.epsEst)}` : ""}`, 5);
  for (const l of launches) for (const t of l.tickers) if (tickers.includes(t))
    add(t, "Launch", `${esc(l.name)} · ${new Date(l.sort_date * 1000).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UK`, 2);

  const withEvents = Object.keys(events).sort((a, b) => events[b].reduce((s, e) => s + e.weight, 0) - events[a].reduce((s, e) => s + e.weight, 0) || Math.abs(quotes[b]?.changePct || 0) - Math.abs(quotes[a]?.changePct || 0));

  // Subject: the biggest move plus the most notable event.
  const top = priced[0];
  const firstEvent = withEvents[0] && events[withEvents[0]].sort((a, b) => b.weight - a.weight)[0];
  const subject = [
    top ? `$${top} ${pct(quotes[top].changePct)}` : null,
    firstEvent ? `${firstEvent.kind === "Contract" ? "new contract" : firstEvent.kind === "Insider" ? "insider trade" : firstEvent.kind === "Earnings" ? "earnings this week" : firstEvent.kind.toLowerCase()} for $${withEvents[0]}` : null,
  ].filter(Boolean).join(", ");

  const row = (t) => {
    const q = quotes[t], name = COVERED[t].name;
    return `<tr><td style="padding:7px 0;border-bottom:1px solid ${LINE}"><a href="${BASE}/stocks/${t.toLowerCase()}" style="color:${INK};text-decoration:none"><b>${t}</b> <span style="color:${MUTED}">${esc(name)}</span></a></td>
      <td style="padding:7px 0;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap">${money(q.price, q.currency)}</td>
      <td style="padding:7px 0 7px 12px;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap;color:${color(q.changePct)};font-weight:600">${pct(q.changePct)}</td></tr>`;
  };
  const section = (t) => {
    const q = quotes[t];
    const items = events[t].sort((a, b) => b.weight - a.weight).map((e) =>
      `<tr><td style="padding:5px 10px 5px 0;vertical-align:top;white-space:nowrap"><span style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${e.kind}</span></td><td style="padding:5px 0;font-size:14px;line-height:1.45">${e.html}</td></tr>`).join("");
    return `<div style="margin:0 0 22px">
      <div style="font-size:16px;margin-bottom:4px"><a href="${BASE}/stocks/${t.toLowerCase()}" style="color:${INK};text-decoration:none"><b>$${t}</b> ${esc(COVERED[t].name)}</a>${q ? ` <span style="color:${color(q.changePct)};font-weight:600">${pct(q.changePct)}</span>` : ""}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${items}</table></div>`;
  };

  const dateLine = new Date(NOW).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" });
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7">
<div style="max-width:600px;margin:0 auto;background:#fff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
  <div style="background:#05070d;padding:20px 24px"><div style="color:#00ff88;font-weight:800;font-size:18px;letter-spacing:.02em">ORBIT ALPHA</div>
    <div style="color:#9aa3b2;font-size:12px;margin-top:2px">Daily Flash · ${dateLine}</div></div>
  <div style="padding:20px 24px">
    <h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};margin:0 0 6px">Share prices · last close</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${priced.map(row).join("")}</table>
    ${withEvents.length ? `<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};margin:26px 0 12px">What happened</h2>${withEvents.map(section).join("")}` : `<p style="color:${MUTED};font-size:14px;margin-top:20px">No new contracts, filings or headlines for your companies since yesterday.</p>`}
    <p style="margin:26px 0 0"><a href="${BASE}/markets" style="display:inline-block;background:#05070d;color:#00ff88;text-decoration:none;padding:10px 16px;border-radius:4px;font-size:13px;font-weight:600">Open the live dashboard</a></p>
  </div>
  <div style="padding:16px 24px 24px;border-top:1px solid ${LINE};font-size:11px;color:${MUTED};line-height:1.6">
    You follow ${follow === "ALL" ? "every company Orbit Alpha covers" : tickers.map((t) => "$" + t).join(", ")}. <a href="{{MANAGE_URL}}" style="color:${MUTED}">Change companies</a> · <a href="{{UNSUBSCRIBE_URL}}" style="color:${MUTED}">Stop daily alerts</a><br>
    Prices are delayed closing prices; non-US listings are shown in their trading currency. Orbit Alpha is information, not investment advice.
  </div>
</div></body></html>`;
  return { subject: `Orbit Alpha Daily: ${subject || "your space stocks"}`, html, tickers, eventCount: withEvents.length };
}

// ── Run ──────────────────────────────────────────────────────────────────────
if (MODE === "preview") {
  mkdirSync("out/alerts", { recursive: true });
  const sets = { custom: (env.TICKERS || "RKLB,ASTS,SPCX").toUpperCase() === "ALL" ? "ALL" : (env.TICKERS || "RKLB,ASTS,SPCX").toUpperCase().split(",").map((s) => s.trim()), all: "ALL" };
  for (const [name, follow] of Object.entries(sets)) {
    const d = buildDigest(follow);
    writeFileSync(`out/alerts/preview-${name}.html`, d.html.replace("{{MANAGE_URL}}", "#").replace("{{UNSUBSCRIBE_URL}}", "#"));
    writeFileSync(`out/alerts/preview-${name}.txt`, d.subject);
    console.log(`::notice::${name}: "${d.subject}" · ${d.tickers.length} companies, ${d.eventCount} with news`);
  }
  console.log(`Data: ${Object.keys(quotes).length} quotes, ${contracts.length} contracts, ${filings.length} filings, ${newsItems.length} news, ${earnings.length} earnings, ${launches.length} launches`);
} else {
  console.log("::error::Send mode is not wired up yet (needs RESEND_API_KEY and the alert sign-up list).");
  process.exit(1);
}
