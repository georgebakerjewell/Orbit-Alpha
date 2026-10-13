// Temporary: dump trimmed SEC company facts for debugging the financial snapshot.
import fs from "node:fs";
import { US_ROSTER } from "../lib/roster.js";
const H = { "User-Agent": "Orbit Alpha OrbitAlphaApp@proton.me", Accept: "application/json" };
const map = {};
Object.values(await (await fetch("https://www.sec.gov/files/company_tickers.json", { headers: H })).json()).forEach((c) => (map[c.ticker.toUpperCase()] = c.cik_str));
fs.mkdirSync("debug", { recursive: true });
const keep = /Revenue|Sales|Cost|GrossProfit|NetIncome|ProfitLoss|CashProvided|CashFlows|PaymentsToAcquire|Purchase|Cash|Investments|Debt|Notes|Borrowings|Shares|Stock/i;
for (const t of US_ROSTER) {
  if (!map[t]) { console.log(t, "no cik"); continue; }
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(map[t]).padStart(10, "0")}.json`, { headers: H });
  if (!r.ok) { console.log(t, r.status); continue; }
  const j = await r.json();
  const out = { cik: map[t], facts: {} };
  for (const [ns, tags] of Object.entries(j.facts || {})) {
    out.facts[ns] = {};
    for (const [tag, v] of Object.entries(tags)) {
      if (!keep.test(tag)) continue;
      const units = {};
      for (const [u, arr] of Object.entries(v.units)) units[u] = arr.filter((f) => f.end >= "2022-06-01").map(({ start, end, val, form, filed, accn, fp, fy }) => ({ start, end, val, form, filed, accn, fp, fy }));
      out.facts[ns][tag] = { units };
    }
  }
  fs.writeFileSync(`debug/${t}.json`, JSON.stringify(out));
  console.log(t, "ok");
  await new Promise((ok) => setTimeout(ok, 300));
}
