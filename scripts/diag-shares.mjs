// One-off diagnostic: compare share counts / market caps from SEC, Nasdaq and the hardcoded table,
// and time two ways of fetching earnings dates. Output is published as a GitHub Actions annotation.
const ROSTER = ["RKLB", "ASTS", "GSAT", "VSAT", "PL", "KRMN", "MDA", "FLY", "LUNR", "TSAT", "RDW", "BKSY", "SATL", "SPIR", "SPCE", "KULR", "MNTS", "SPCX", "VOYG", "YSS", "HAWK", "SIDU", "ECHO"];
const ETFS = ["UFO", "ARKX", "ROKT", "MARS", "NASA"];
const HARD = { SPCX: 13180000000, RKLB: 639410000, ASTS: 299790000, LUNR: 160450000, PL: 356000000, BKSY: 40920000, RDW: 25000000, MNTS: 22000000, SPCE: 467000000, KRMN: 133000000, SATL: 154000000, KULR: 46000000, TSAT: 15000000, GSAT: 1300000000, VSAT: 138000000, MDA: 162000000, SPIR: 391000000, FLY: 167000000, ECHO: 290800000, VOYG: 61000000, YSS: 128000000, HAWK: 119000000, SIDU: 101230000, UFO: 20000000, ARKX: 22000000, NASA: 8000000, MARS: 383000, ROKT: 2100000 };
const SEC = { "User-Agent": "Orbit Alpha OrbitAlphaApp@proton.me" };
const NQ = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json, text/plain, */*", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" };
const out = [];
const log = (s) => { console.log(s); out.push(s); };
const B = (n) => (n == null ? "-" : n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : (n / 1e6).toFixed(1) + "M");

const ciks = {};
Object.values(await (await fetch("https://www.sec.gov/files/company_tickers.json", { headers: SEC })).json()).forEach((c) => (ciks[c.ticker] = c.cik_str));

async function yahooPrice(t) {
  const j = await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=5d`, { headers: { "User-Agent": "Mozilla/5.0" } })).json();
  return j?.chart?.result?.[0]?.meta?.regularMarketPrice;
}
async function secShares(t) {
  if (!ciks[t]) return { note: "no CIK" };
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${String(ciks[t]).padStart(10, "0")}/dei/EntityCommonStockSharesOutstanding.json`, { headers: SEC });
  if (!r.ok) return { note: `HTTP ${r.status}` };
  const arr = (await r.json()).units?.shares || [];
  const latestEnd = arr.reduce((m, f) => (f.end > m ? f.end : m), "");
  const latest = arr.filter((f) => f.end === latestEnd);
  return { end: latestEnd, values: latest.map((f) => `${B(f.val)}(${f.form})`).join(" "), sum: latest.reduce((a, f) => a + f.val, 0), max: Math.max(...latest.map((f) => f.val)) };
}
async function nasdaq(t, etf) {
  try {
    const j = await (await fetch(`https://api.nasdaq.com/api/quote/${t}/summary?assetclass=${etf ? "etf" : "stocks"}`, { headers: NQ })).json();
    const sd = j?.data?.summaryData || {};
    return { cap: sd.MarketCap?.value || sd.MarketCapitalization?.value || null, keys: Object.keys(sd).slice(0, 12).join(",") };
  } catch (e) { return { cap: null, keys: e.message }; }
}

log("TICKER | price | hardcoded cap | SEC shares (latest end: values) | SEC cap (max) | Nasdaq cap");
for (const t of [...ROSTER, ...ETFS]) {
  const etf = ETFS.includes(t);
  const [p, s, n] = await Promise.all([yahooPrice(t).catch(() => null), etf ? Promise.resolve({}) : secShares(t).catch((e) => ({ note: e.message })), nasdaq(t, etf)]);
  log(`${t} | ${p} | ${B(HARD[t] * p)} | ${s.note || `${s.end}: ${s.values}`} | ${s.max ? B(s.max * p) : "-"} | ${n.cap}${n.cap ? "" : ` [${n.keys}]`}`);
  await new Promise((r) => setTimeout(r, 150));
}

// Earnings timing: per-day calendar fully parallel vs per-symbol endpoint
const days = [];
for (let i = 0; i <= 75; i++) { const d = new Date(Date.now() + i * 864e5); if (d.getUTCDay() % 6) days.push(d.toISOString().slice(0, 10)); }
let t0 = Date.now(), errs = 0, hits = 0;
await Promise.all(days.map(async (d) => { try { const j = await (await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${d}`, { headers: NQ })).json(); hits += (j?.data?.rows || []).filter((r) => ROSTER.includes(r.symbol)).length; } catch { errs++; } }));
log(`Earnings calendar, ${days.length} days fully parallel: ${Date.now() - t0} ms, ${errs} errors, ${hits} roster rows`);
t0 = Date.now(); errs = 0; const sample = [];
await Promise.all(ROSTER.map(async (t) => { try { const j = await (await fetch(`https://api.nasdaq.com/api/analyst/${t}/earnings-date`, { headers: NQ })).json(); sample.push(`${t}: ${(j?.data?.announcement || "").slice(0, 60)}`); } catch { errs++; } }));
log(`Earnings per-symbol, ${ROSTER.length} parallel: ${Date.now() - t0} ms, ${errs} errors`);
sample.slice(0, 6).forEach((s) => log("   " + s));

const enc = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Diag report::${enc(out.join("\n"))}`);
