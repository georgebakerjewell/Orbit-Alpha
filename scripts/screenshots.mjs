// Captures full-page screenshots of the live site plus the data behind them, for social posts.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = "https://www.orbitalpha.cloud";
mkdirSync("shots", { recursive: true });
for (const p of ["quotes", "performance?range=ytd", "performance?range=3mo", "performance?range=1mo", "launches", "contracts", "filings", "earnings"]) {
  try { writeFileSync(`shots/${p.replace(/[?=&]/g, "_")}.json`, await (await fetch(`${BASE}/api/${p}`)).text()); } catch (e) { console.log(p, e.message); }
}
const q = JSON.parse(await (await fetch(`${BASE}/api/quotes`)).text()).quotes || {};
const movers = Object.entries(q).filter(([t]) => !["SPY","QQQ","UFO","ARKX","ROKT","MARS","NASA"].includes(t)).sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct)).slice(0, 2).map(([t]) => t.toLowerCase());
const pages = ["/", "/markets", "/markets/performance", "/markets/launches", "/markets/contracts", "/markets/filings", "/markets/earnings", "/news", ...movers.map((t) => `/stocks/${t}`), "/stocks/rklb", "/stocks/asts"];
const browser = await chromium.launch();
for (const [tag, vp] of [["d", { width: 1280, height: 800 }], ["m", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem("oa_popup_seen", "1"));
  for (const path of [...new Set(pages)]) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(6000);
      if (path === "/markets/launches") { const d = page.getByText("Details ▾").first(); if (await d.count()) { await d.click(); await page.waitForTimeout(1500); } }
      await page.screenshot({ path: `shots/${tag}${path === "/" ? "_home" : path.replace(/\//g, "_")}.png`, fullPage: true });
    } catch (e) { console.log(path, e.message); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
