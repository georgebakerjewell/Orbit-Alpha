// Step 1 scaffold: dump raw API data so the digest format can be built against real shapes.
import { mkdirSync, writeFileSync } from "node:fs";
const BASE = "https://www.orbitalpha.cloud";
mkdirSync("out/alerts/raw", { recursive: true });
for (const [name, path] of [["quotes", "/api/quotes"], ["contracts", "/api/contracts"], ["filings", "/api/filings"], ["earnings", "/api/earnings"], ["launches", "/api/launches"], ["news", "/api/news?limit=60"], ["yahoonews", "/api/yahoonews"]]) {
  try { const r = await fetch(BASE + path); writeFileSync(`out/alerts/raw/${name}.json`, await r.text()); console.log(name, r.status); }
  catch (e) { console.log(name, "failed", e.message); }
}
