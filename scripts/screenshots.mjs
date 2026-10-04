// Builds X/Twitter post images from the live site: element screenshots wrapped in branded 16:9 cards.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { COVERED, SECTOR_ORDER } from "../lib/roster.js";
const BASE = "https://www.orbitalpha.cloud";
mkdirSync("shots", { recursive: true });
const get = async (p) => JSON.parse(await (await fetch(`${BASE}/api/${p}`)).text());
const quotes = (await get("quotes")).quotes;
const perf3 = await get("performance?range=3mo");
writeFileSync("shots/quotes.json", JSON.stringify(quotes));
writeFileSync("shots/perf3.json", JSON.stringify(perf3));
const covered = Object.keys(COVERED).filter((t) => quotes[t]?.changePct != null);
const up = covered.filter((t) => quotes[t].changePct > 0).length;
const last = (id) => [...perf3.series.find((s) => s.id === id).values].reverse().find((v) => v != null);
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const facts = { up, total: covered.length, ufo3: last("UFO"), spy3: last("SPY"), asOf: perf3.asOf };
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sectors = SECTOR_ORDER.map((sec) => {
  const m = Object.keys(COVERED).filter((t) => COVERED[t].sector === sec).map((t) => ({ t, v: perf3.series.find((s) => s.id === t) ? last(t) : null })).filter((x) => x.v != null).sort((a, b) => b.v - a.v);
  return { sec, v: avg(m.map((x) => x.v)), best: m[0], worst: m[m.length - 1] };
}).sort((a, b) => b.v - a.v);
const movers = covered.map((t) => ({ t, v: quotes[t].changePct })).sort((a, b) => b.v - a.v).slice(0, 5);
facts.sectors = sectors; facts.movers = movers;
writeFileSync("shots/facts.json", JSON.stringify(facts, null, 2));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("oa_popup_seen", "1"));
const page = await ctx.newPage();

await page.goto(`${BASE}/markets`, { waitUntil: "networkidle" }); await page.waitForTimeout(5000);
await page.locator("text=Space stocks heatmap").first().locator("xpath=../../../*[2]").screenshot({ path: "shots/el_heatmap.png" });

await page.goto(`${BASE}/markets/performance`, { waitUntil: "networkidle" }); await page.waitForTimeout(3000);
await page.getByRole("button", { name: "3M", exact: true }).click(); await page.waitForTimeout(5000);
const top = await page.locator("text=Space Stocks vs the Market").first().boundingBox();
const bottom = await page.locator("select").last().boundingBox();
await page.screenshot({ path: "shots/el_perf.png", fullPage: true, clip: { x: top.x - 10, y: top.y - 10, width: 1240 - 2 * (top.x - 10), height: bottom.y + bottom.height + 14 - (top.y - 10) } });
await page.locator("text=Sector summary").first().locator("xpath=..").screenshot({ path: "shots/el_sectors.png" });

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const card = (headline, sub, img, extra = "") => `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:675px;background:radial-gradient(ellipse at top,#0d1730,#05070d 70%);font-family:Inter,sans-serif;color:#fff;padding:44px 52px 30px;display:flex;flex-direction:column}
h1{font-size:44px;font-weight:800;letter-spacing:-0.02em;line-height:1.1}h1 .g{color:#00ff88}h1 .r{color:#ff4466}p{color:#8a93a8;font-size:18px;margin-top:10px}
.img{flex:1;display:flex;align-items:center;justify-content:center;margin:20px 0 14px;min-height:0}.img img{max-width:100%;max-height:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.08)}
.mv{display:flex;gap:14px;margin-bottom:16px}.mv div{flex:1;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:10px;padding:12px 16px}.mv b{display:block;font-size:20px}.mv span{color:#00ff88;font-size:26px;font-weight:800}
.bars{flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px;margin:16px 0}.row{display:grid;grid-template-columns:270px 1fr 300px;align-items:center;gap:18px}.nm{font-size:20px;font-weight:600}.trk{height:34px;position:relative}.bar{position:absolute;right:0;top:0;bottom:0;background:linear-gradient(90deg,#ff4466,#c0284a);border-radius:6px 0 0 6px;display:flex;align-items:center;padding-left:12px;font-weight:800;font-size:20px}.bw{font-size:15px;color:#8a93a8}.bw b{color:#fff}.g2{color:#00ff88}.r2{color:#ff4466}
.f{display:flex;justify-content:space-between;align-items:center;font-size:16px;color:#8a93a8}.logo{font-weight:800;color:#fff;font-size:20px;letter-spacing:0.02em}.logo b{color:#00ff88}</style></head>
<body><h1>${headline}</h1><p>${sub}</p>${img ? `<div class="img"><img src="${img}"></div>` : ""}${extra}<div class="f"><span class="logo">ORBIT<b>ALPHA.</b></span><span>Free live data · orbitalpha.cloud</span></div></body></html>`;

const asOf = new Date(facts.asOf + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
const cards = {
  "x1_heatmap": card(`<span class="g">${up} of ${facts.total}</span> space stocks closed green`, `${asOf} close · tile size = size of the move`, b64("shots/el_heatmap.png"),
    `<div class="mv">${movers.map((m) => `<div><b>$${m.t}</b><span>${pct(m.v)}</span></div>`).join("")}</div>`),
  "x2_performance": card(`Space ETF <span class="r">${pct(facts.ufo3)}</span> vs S&amp;P 500 <span class="g">${pct(facts.spy3)}</span> over 3 months`, "UFO, ARKX and MARS space ETFs against the S&amp;P 500, rebased to the start of the period", b64("shots/el_perf.png")),
  "x3_sectors": card(sectors.every((x) => x.v < 0) ? "Every space sector is down over 3 months" : "Space sectors over 3 months", "Equal-weighted sector returns, with the best and worst stock in each", null,
    `<div class="bars">${sectors.map((x) => { const w = Math.max(8, Math.abs(x.v) / Math.max(...sectors.map((y) => Math.abs(y.v))) * 100);
      const c = (v) => (v >= 0 ? "g2" : "r2");
      return `<div class="row"><div class="nm">${x.sec}</div><div class="trk"><div class="bar" style="width:${w}%;${x.v >= 0 ? "background:linear-gradient(90deg,#00c46a,#00ff88);color:#05070d;" : ""}">${pct(x.v)}</div></div><div class="bw">Best <b>${x.best.t}</b> <span class="${c(x.best.v)}">${pct(x.best.v)}</span> · Worst <b>${x.worst.t}</b> <span class="${c(x.worst.v)}">${pct(x.worst.v)}</span></div></div>`; }).join("")}</div>`),
};
const cp = await ctx.newPage();
await cp.setViewportSize({ width: 1200, height: 675 });
for (const [name, html] of Object.entries(cards)) {
  await cp.setContent(html, { waitUntil: "networkidle" }); await cp.waitForTimeout(800);
  await cp.screenshot({ path: `shots/${name}.png` });
}
await browser.close();
console.log(facts);
