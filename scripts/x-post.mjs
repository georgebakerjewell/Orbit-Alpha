// Daily X (Twitter) post: after the US close, builds a branded heatmap card from the live site
// and posts it with a short data-driven caption. Fridays add the 3-month sector card.
// Run by .github/workflows/x-autopost.yml.
//   node scripts/x-post.mjs            -> build and post (needs X_* secrets)
//   DRY_RUN=1 node scripts/x-post.mjs  -> build images and print the text only
// Secrets: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (an X app with Read and Write).
// Optional: X_LINK_REPLY=0 to skip the link reply (posts with links cost more on the X API).

import { chromium } from "playwright";
import { createHmac, randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { COVERED, SECTOR_ORDER } from "../lib/roster.js";

const BASE = "https://www.orbitalpha.cloud";
const OUT = "shots";
const env = process.env;
const DRY = env.DRY_RUN === "1" || env.DRY_RUN === "true" || !env.X_ACCESS_TOKEN;
mkdirSync(OUT, { recursive: true });

// ── 1. Skip days the US market was shut ─────────────────────────────────────────
const nyDate = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const spy = await (await fetch("https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=1d", { headers: { "User-Agent": "Mozilla/5.0" } })).json();
const lastSession = nyDate(spy.chart.result[0].meta.regularMarketTime * 1000);
const today = nyDate(Date.now());
if (lastSession !== today && env.FORCE !== "1") {
  console.log(`No US session today (${today}, last session ${lastSession}). Nothing posted.`);
  process.exit(0);
}

// ── 2. Data ─────────────────────────────────────────────────────────────────────
const get = async (p) => (await fetch(`${BASE}/api/${p}`)).json();
const { quotes } = await get("quotes");
const covered = Object.keys(COVERED).filter((t) => typeof quotes[t]?.changePct === "number");
const up = covered.filter((t) => quotes[t].changePct > 0).length;
const sorted = covered.map((t) => ({ t, v: quotes[t].changePct })).sort((a, b) => b.v - a.v);
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const isFriday = new Date(`${today}T12:00:00Z`).getUTCDay() === 5;

// ── 3. Caption (no links in the main post: X shows link posts to fewer people) ────
const n = covered.length;
const headline =
  up === n ? `All ${n} space stocks we track closed green today.`
  : up >= n * 0.8 ? `${up} of ${n} space stocks closed green today.`
  : up <= n * 0.2 ? `A red day for space stocks: only ${up} of ${n} closed higher.`
  : `A mixed day for space stocks: ${up} up, ${n - up} down.`;
const gainers = sorted.filter((x) => x.v > 0).slice(0, 3);
const losers = sorted.filter((x) => x.v < 0).slice(-2).reverse();
const lines = [
  ...gainers.map((x) => `$${x.t} ${pct(x.v)}`),
  ...(losers.length ? ["", ...losers.map((x) => `$${x.t} ${pct(x.v)}`)] : []),
];
const text = [headline, "", ...lines].join("\n");
const top = Math.abs(sorted[0].v) >= Math.abs(sorted[sorted.length - 1].v) ? sorted[0] : sorted[sorted.length - 1];
const replyText = `Live heatmap, filings and contracts for every space stock, free:\n${BASE.replace("https://www.", "")}/markets\n\n$${top.t} today: ${BASE.replace("https://www.", "")}/stocks/${top.t.toLowerCase()}`;

// ── 4. Images ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("oa_popup_seen", "1"));
const page = await ctx.newPage();
await page.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
await page.locator("text=Space stocks heatmap").first().locator("xpath=../../../*[2]").screenshot({ path: `${OUT}/el_heatmap.png` });

const css = `*{margin:0;box-sizing:border-box}body{width:1200px;height:675px;background:radial-gradient(ellipse at top,#0d1730,#05070d 70%);font-family:Inter,sans-serif;color:#fff;padding:44px 52px 30px;display:flex;flex-direction:column}
h1{font-size:44px;font-weight:800;letter-spacing:-0.02em;line-height:1.1}.g{color:#00ff88}.r{color:#ff4466}p{color:#8a93a8;font-size:18px;margin-top:10px}
.img{flex:1;display:flex;align-items:center;justify-content:center;margin:20px 0 14px;min-height:0}.img img{max-width:100%;max-height:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.08)}
.mv{display:flex;gap:14px;margin-bottom:16px}.mv div{flex:1;border-radius:10px;padding:12px 16px}.mv b{display:block;font-size:20px}.mv span{font-size:26px;font-weight:800}
.bars{flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px;margin:16px 0}.row{display:grid;grid-template-columns:270px 1fr 300px;align-items:center;gap:18px}.nm{font-size:20px;font-weight:600}.trk{height:34px;position:relative}.bar{position:absolute;top:0;bottom:0;display:flex;align-items:center;padding:0 12px;font-weight:800;font-size:20px}.bw{font-size:15px;color:#8a93a8}.bw b{color:#fff}
.f{display:flex;justify-content:space-between;align-items:center;font-size:16px;color:#8a93a8}.logo{font-weight:800;color:#fff;font-size:20px;letter-spacing:0.02em}.logo b{color:#00ff88}`;
const card = (h, sub, body) => `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"><style>${css}</style></head>
<body><h1>${h}</h1><p>${sub}</p>${body}<div class="f"><span class="logo">ORBIT<b>ALPHA.</b></span><span>Free live data · orbitalpha.cloud</span></div></body></html>`;
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const cardHead = up >= n / 2 ? `<span class="g">${up} of ${n}</span> space stocks closed green` : `<span class="r">${n - up} of ${n}</span> space stocks closed red`;
const movers = [...sorted.slice(0, 3), ...sorted.slice(-2)];
const moverBox = (m) => `<div style="background:${m.v >= 0 ? "rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2)" : "rgba(255,68,102,0.06);border:1px solid rgba(255,68,102,0.25)"}"><b>$${m.t}</b><span class="${m.v >= 0 ? "g" : "r"}">${pct(m.v)}</span></div>`;

const cards = [["x1_heatmap", card(cardHead, `${dateLabel} close · tile size = size of the move`, `<div class="img"><img src="${b64(`${OUT}/el_heatmap.png`)}"></div><div class="mv">${movers.map(moverBox).join("")}</div>`)]];

if (isFriday) {
  const perf = await get("performance?range=3mo");
  const last = (id) => { const s = perf.series.find((x) => x.id === id); return s ? [...s.values].reverse().find((v) => v != null) : null; };
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const secs = SECTOR_ORDER.map((sec) => {
    const m = Object.keys(COVERED).filter((t) => COVERED[t].sector === sec).map((t) => ({ t, v: last(t) })).filter((x) => x.v != null).sort((a, b) => b.v - a.v);
    return { sec, v: avg(m.map((x) => x.v)), best: m[0], worst: m[m.length - 1] };
  }).sort((a, b) => b.v - a.v);
  const max = Math.max(...secs.map((s) => Math.abs(s.v)));
  const anyUp = secs.some((s) => s.v >= 0), anyDown = secs.some((s) => s.v < 0);
  const c = (v) => (v >= 0 ? "g" : "r");
  const bars = secs.map((s) => {
    const w = Math.max(8, (Math.abs(s.v) / max) * (anyUp && anyDown ? 50 : 100));
    const pos = s.v >= 0 ? `left:${anyDown ? 50 : 0}%;width:${w}%;background:linear-gradient(90deg,#00c46a,#00ff88);color:#05070d;border-radius:0 6px 6px 0` : `right:${anyUp ? 50 : 0}%;width:${w}%;background:linear-gradient(90deg,#ff4466,#c0284a);border-radius:6px 0 0 6px`;
    return `<div class="row"><div class="nm">${s.sec}</div><div class="trk"><div class="bar" style="${pos}">${pct(s.v)}</div></div><div class="bw">Best <b>${s.best.t}</b> <span class="${c(s.best.v)}">${pct(s.best.v)}</span> · Worst <b>${s.worst.t}</b> <span class="${c(s.worst.v)}">${pct(s.worst.v)}</span></div></div>`;
  }).join("");
  const h = secs.every((s) => s.v < 0) ? "Every space sector is down over 3 months" : secs.every((s) => s.v >= 0) ? "Every space sector is up over 3 months" : "Space sectors over 3 months";
  cards.push(["x2_sectors", card(h, `Equal-weighted sector returns to ${dateLabel}, with the best and worst stock in each`, `<div class="bars">${bars}</div>`)]);
}

const cp = await ctx.newPage();
await cp.setViewportSize({ width: 1200, height: 675 });
const files = [];
for (const [name, html] of cards) {
  await cp.setContent(html, { waitUntil: "networkidle" });
  await cp.waitForTimeout(800);
  await cp.screenshot({ path: `${OUT}/${name}.png` });
  files.push(`${OUT}/${name}.png`);
}
await browser.close();
writeFileSync(`${OUT}/post.txt`, `${text}\n\n--- reply ---\n${replyText}\n`);
console.log(`${text}\n\n--- reply ---\n${replyText}\n\nImages: ${files.join(", ")}`);
if (DRY) { console.log("Dry run: nothing posted."); process.exit(0); }

// ── 5. Post via X API v2 (OAuth 1.0a user context) ──────────────────────────────
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
function oauthHeader(method, url) {
  const o = {
    oauth_consumer_key: env.X_API_KEY, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0",
  };
  const params = Object.keys(o).sort().map((k) => `${enc(k)}=${enc(o[k])}`).join("&");
  const base = [method, enc(url), enc(params)].join("&");
  o.oauth_signature = createHmac("sha1", `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_SECRET)}`).update(base).digest("base64");
  return "OAuth " + Object.keys(o).sort().map((k) => `${enc(k)}="${enc(o[k])}"`).join(", ");
}
async function x(url, body) {
  const res = await fetch(url, { method: "POST", headers: { Authorization: oauthHeader("POST", url), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
const mediaIds = [];
for (const f of files) {
  const up = await x("https://api.x.com/2/media/upload", { media: readFileSync(f).toString("base64"), media_category: "tweet_image" });
  mediaIds.push(up.data.id);
}
const post = await x("https://api.x.com/2/tweets", { text, media: { media_ids: mediaIds } });
console.log(`Posted: https://x.com/i/status/${post.data.id}`);
if (env.X_LINK_REPLY !== "0") {
  const reply = await x("https://api.x.com/2/tweets", { text: replyText, reply: { in_reply_to_tweet_id: post.data.id } });
  console.log(`Reply: https://x.com/i/status/${reply.data.id}`);
}
