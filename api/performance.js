// Relative performance: space ETFs, benchmarks and each covered stock,
// all rebased to % change from the start of the range.
//   GET /api/performance?range=ytd   (1mo | 3mo | 6mo | ytd | 1y)

export const config = { maxDuration: 30 };

export const BENCHMARKS = [
  { id: "SPY", label: "S&P 500", kind: "benchmark" },
  { id: "QQQ", label: "Nasdaq 100", kind: "benchmark" },
];
export const ETFS = [
  { id: "UFO", label: "Procure Space ETF", kind: "etf" },
  { id: "ARKX", label: "ARK Space ETF", kind: "etf" },
  { id: "ROKT", label: "SPDR Kensho Final Frontiers ETF", kind: "etf" },
  { id: "MARS", label: "Roundhill Space & Tech ETF", kind: "etf" },
  { id: "NASA", label: "Tema Space Innovators ETF", kind: "etf" },
];
export const ROSTER = ["RKLB", "ASTS", "GSAT", "VSAT", "PL", "KRMN", "MDA", "FLY", "LUNR", "TSAT", "RDW", "BKSY", "SATL", "SPIR", "SPCE", "KULR", "MNTS", "SPCX", "VOYG", "YSS", "HAWK", "SIDU", "ECHO"];

const RANGES = new Set(["1mo", "3mo", "6mo", "ytd", "1y"]);
const TTL = 30 * 60 * 1000;
const cache = {};

async function closes(symbol, range) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://finance.yahoo.com" },
    });
    const r = (await res.json())?.chart?.result?.[0];
    const ts = r?.timestamp || [];
    const cl = r?.indicators?.quote?.[0]?.close || [];
    const out = {};
    ts.forEach((t, i) => { if (cl[i] != null) out[new Date(t * 1000).toISOString().slice(0, 10)] = cl[i]; });
    return out;
  } catch {
    return {};
  }
}

const round = (v) => (v == null ? null : Math.round(v * 100) / 100);

// Map of date -> close, rebased to % change from the first available close in the range.
export function rebase(dates, byDate) {
  let base = null;
  return dates.map((d) => {
    const c = byDate[d];
    if (c == null) return null;
    if (base == null) base = c;
    return round((c / base - 1) * 100);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const range = RANGES.has(req.query.range) ? req.query.range : "ytd";
  if (cache[range] && Date.now() - cache[range].ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
    return res.status(200).json(cache[range].data);
  }

  const symbols = [...BENCHMARKS, ...ETFS].map((s) => s.id).concat(ROSTER);
  const maps = {};
  for (let i = 0; i < symbols.length; i += 10) {
    const batch = symbols.slice(i, i + 10);
    const results = await Promise.all(batch.map((s) => closes(s, range)));
    batch.forEach((s, j) => { maps[s] = results[j]; });
  }

  // Use the S&P 500 trading calendar as the date axis.
  const dates = Object.keys(maps.SPY || {}).sort();
  if (dates.length < 2) return res.status(502).json({ error: "No market data", dates: [], series: [] });

  const series = [
    ...[...BENCHMARKS, ...ETFS].map((s) => ({ ...s, values: rebase(dates, maps[s.id] || {}) })),
    ...ROSTER.map((t) => ({ id: t, label: t, kind: "stock", values: rebase(dates, maps[t] || {}) })),
  ].filter((s) => s.values.some((v) => v != null));

  const data = { range, dates, series, asOf: dates[dates.length - 1] };
  cache[range] = { ts: Date.now(), data };
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
  res.status(200).json(data);
}
