// Builds X/Twitter post images from the live site: element screenshots wrapped in branded 16:9 cards.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { COVERED } from "../lib/roster.js";
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
writeFileSync("shots/facts.json", JSON.stringify(facts, null, 2));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("oa_popup_seen", "1"));
const page = await ctx.newPage();

await page.goto(`${BASE}/markets`, { waitUntil: "networkidle" }); await page.waitForTimeout(5000);
await page.locator("text=Space stocks heatmap").first().locator("xpath=../../..").screenshot({ path: "shots/el_heatmap.png" });

await page.goto(`${BASE}/markets/performance`, { waitUntil: "networkidle" }); await page.waitForTimeout(3000);
await page.getByRole("button", { name: "3M", exact: true }).click(); await page.waitForTimeout(5000);
const top = await page.locator("text=Space Stocks vs the Market").first().boundingBox();
const bottom = await page.locator("select").last().boundingBox();
await page.screenshot({ path: "shots/el_perf.png", fullPage: true, clip: { x: top.x - 10, y: top.y - 10, width: 1240 - 2 * (top.x - 10), height: bottom.y + bottom.height + 14 - (top.y - 10) } });
await page.locator("text=Sector summary").first().locator("xpath=..").screenshot({ path: "shots/el_sectors.png" });

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const card = (headline, sub, img) => `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:675px;background:radial-gradient(ellipse at top,#0d1730,#05070d 70%);font-family:Inter,sans-serif;color:#fff;padding:44px 52px 30px;display:flex;flex-direction:column}
h1{font-size:44px;font-weight:800;letter-spacing:-0.02em;line-height:1.1}h1 .g{color:#00ff88}h1 .r{color:#ff4466}p{color:#8a93a8;font-size:18px;margin-top:10px}
.img{flex:1;display:flex;align-items:center;justify-content:center;margin:20px 0 14px;min-height:0}.img img{max-width:100%;max-height:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.08)}
.f{display:flex;justify-content:space-between;align-items:center;font-size:16px;color:#8a93a8}.logo{font-weight:800;color:#fff;font-size:20px;letter-spacing:0.02em}.logo b{color:#00ff88}</style></head>
<body><h1>${headline}</h1><p>${sub}</p><div class="img"><img src="${img}"></div><div class="f"><span class="logo">ORBIT<b>ALPHA.</b></span><span>Free live data · orbitalpha.cloud</span></div></body></html>`;

const asOf = new Date(facts.asOf + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
const cards = {
  "x1_heatmap": card(`<span class="g">${up} of ${facts.total}</span> space stocks closed green`, `${asOf} close · tile size = size of the move`, b64("shots/el_heatmap.png")),
  "x2_performance": card(`Space ETF <span class="r">${pct(facts.ufo3)}</span> vs S&amp;P 500 <span class="g">${pct(facts.spy3)}</span> over 3 months`, "UFO, ARKX and MARS space ETFs against the S&amp;P 500, rebased to the start of the period", b64("shots/el_perf.png")),
  "x3_sectors": card("Every space sector is down over 3 months", "Equal-weighted sector returns, with the best and worst stock in each", b64("shots/el_sectors.png")),
};
const cp = await ctx.newPage();
await cp.setViewportSize({ width: 1200, height: 675 });
for (const [name, html] of Object.entries(cards)) {
  await cp.setContent(html, { waitUntil: "networkidle" }); await cp.waitForTimeout(800);
  await cp.screenshot({ path: `shots/${name}.png` });
}
await browser.close();
console.log(facts);
