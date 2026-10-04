// Live data health check for orbitalpha.cloud. Calls every data endpoint, prints what came back,
// and exits non-zero if a critical one returns no real data. Run by .github/workflows/health-check.yml.
//   node scripts/smoke-test.mjs [baseUrl]

const BASE = process.argv[2] || "https://www.orbitalpha.cloud";
let failures = 0;
const report = [];
const log = (line) => { console.log(line); report.push(line); };

async function check(name, path, validate, { critical = true, timeoutMs = 60000 } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(timeoutMs) });
    const ms = Date.now() - started;
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}, not JSON: ${text.slice(0, 120)}`); }
    const { ok, summary, detail = [] } = validate(json, res.status);
    log(`${ok ? "PASS" : critical ? "FAIL" : "WARN"}  ${name}  (${ms} ms, HTTP ${res.status})  ${summary}`);
    detail.slice(0, 6).forEach((d) => log(`        ${d}`));
    if (!ok && critical) failures++;
  } catch (e) {
    log(`${critical ? "FAIL" : "WARN"}  ${name}  ${e.message}`);
    if (critical) failures++;
  }
}

const count = (n, min) => ({ ok: n >= min, summary: `${n} item(s)` });
const pctStr = (v) => (typeof v === "number" ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "-");

await check("Quotes (all, one request)", "/api/quotes", (j) => {
  const q = j.quotes || {};
  const n = Object.keys(q).length;
  const capB = (t) => (q[t]?.marketCap ? q[t].marketCap / 1e9 : null);
  // Sanity: market caps in a believable range (catches stale share counts like GSAT at $108B)
  const sane = capB("GSAT") > 3 && capB("GSAT") < 40 && capB("RKLB") > 10 && capB("SPCX") > 500;
  return {
    ok: n >= 26 && sane,
    summary: `${n} symbols${sane ? "" : ", MARKET CAPS LOOK WRONG"}`,
    detail: ["SPCX", "RKLB", "ASTS", "GSAT", "RDW", "SPIR", "SPCE", "TSAT", "UFO"].map((t) => `${t}: $${q[t]?.price} · ${pctStr(q[t]?.changePct)} · cap ${capB(t)?.toFixed(2)}B`),
  };
});

await check("Subscriber count", "/api/stats", (j) => ({ ok: typeof j.subscribers === "number", summary: `${j.subscribers ?? j.error}` }), { critical: false });

await check("Quote RKLB 1D intraday", "/api/quote?ticker=RKLB&range=1d", (j) => {
  const n = j?.chart?.result?.[0]?.timestamp?.length || 0;
  return { ok: n > 10, summary: `${n} intraday points` };
});

await check("Quote RKLB 6mo", "/api/quote?ticker=RKLB&range=6mo", (j) => {
  const r = j?.chart?.result?.[0];
  const n = r?.timestamp?.length || 0;
  return { ok: !!r?.meta?.regularMarketPrice && n > 60, summary: `price ${r?.meta?.regularMarketPrice}, ${n} daily points, mkt cap ${r?.meta?.marketCap ? (r.meta.marketCap / 1e9).toFixed(2) + "B" : "missing"}` };
});

for (const t of ["ECHO", "SIDU", "SPCX"]) {
  await check(`Quote ${t}`, `/api/quote?ticker=${t}&range=7d`, (j) => {
    const m = j?.chart?.result?.[0]?.meta;
    return { ok: !!m?.regularMarketPrice, summary: `price ${m?.regularMarketPrice}, mkt cap ${m?.marketCap ? (m.marketCap / 1e9).toFixed(2) + "B" : "missing"}` };
  });
}

await check("Performance YTD", "/api/performance?range=ytd", (j) => {
  const last = (id) => { const s = j.series?.find((x) => x.id === id); return s ? [...s.values].reverse().find((v) => v != null) : null; };
  const stocks = j.series?.filter((s) => s.kind === "stock").length || 0;
  return {
    ok: (j.dates?.length || 0) > 50 && last("SPY") != null && stocks >= 15,
    summary: `${j.dates?.length} dates (${j.dates?.[0]} to ${j.asOf}), ${j.series?.length} series, ${stocks} stocks`,
    detail: ["SPY", "QQQ", "UFO", "ARKX", "ROKT", "MARS", "NASA", "RKLB"].map((id) => `${id}: ${last(id)}%`),
  };
});

await check("Filings RKLB", "/api/filings?ticker=RKLB", (j) => ({
  ...count(j.filings?.length || 0, 1),
  detail: (j.filings || []).map((f) => `${f.date}  Form ${f.form}  ${f.label}${f.owner ? ` · ${f.owner} (${f.role}) ${f.value || ""}` : ""}`),
}));

await check("Filings all", "/api/filings", (j) => ({
  ...count(j.filings?.length || 0, 3),
  detail: (j.filings || []).map((f) => `${f.date}  ${f.ticker}  Form ${f.form}  ${f.label}`),
}));

await check("Contracts RKLB", "/api/contracts?ticker=RKLB", (j) => ({
  ok: Array.isArray(j.awards) && !j.error,
  summary: `${j.awards?.length} award(s), total $${((j.total || 0) / 1e6).toFixed(1)}M${j.error ? `, error: ${j.error}` : ""}`,
  detail: (j.awards || []).map((a) => `${a.start}  $${(a.amount / 1e6).toFixed(2)}M  ${a.subAgency || a.agency}  ${a.description?.slice(0, 60)}`),
}));

await check("Contracts all", "/api/contracts", (j) => ({
  ok: (j.awards?.length || 0) >= 3 && !j.error,
  summary: `${j.awards?.length} award(s)${j.error ? `, error: ${j.error}` : ""}`,
  detail: (j.awards || []).map((a) => `${a.start}  ${a.ticker}  $${(a.amount / 1e6).toFixed(2)}M  ${a.subAgency || a.agency}`),
}));

await check("Earnings", "/api/earnings", (j) => ({
  ok: Array.isArray(j),
  summary: `${Array.isArray(j) ? j.length : "not an array"} upcoming date(s)`,
  detail: (Array.isArray(j) ? j : []).map((e) => `${e.date}  ${e.ticker}  ${e.time}  EPS est ${e.epsEst}`),
}), { timeoutMs: 90000 });

await check("Launches", "/api/launches", (j) => ({ ok: (j.result?.length || 0) >= 5, summary: `${j.result?.length || 0} upcoming, source: ${j.source || "rocketlaunch.live"}`, detail: (j.result || []).slice(0, 4).map((l) => `${l.date_str}  ${l.provider?.name} ${l.vehicle?.name} / ${l.missions?.[0]?.name}`) }));
await check("News (Google)", "/api/news?limit=50", (j) => ({ ...count(Array.isArray(j) ? j.length : 0, 5), detail: (Array.isArray(j) ? j : []).slice(0, 3).map((n) => `${n.source}: ${n.title}`) }));
await check("News (Yahoo)", "/api/yahoonews", (j) => count(Array.isArray(j) ? j.length : 0, 5), { critical: false });

log(failures ? `${failures} critical check(s) failed` : "All critical checks passed");
// In GitHub Actions, also publish the full report as an annotation so it is readable from the run page and API.
if (process.env.GITHUB_ACTIONS) {
  const enc = (t) => t.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(`::${failures ? "error" : "notice"} title=Live data report::${enc(report.join("\n"))}`);
}
process.exit(failures ? 1 : 0);
