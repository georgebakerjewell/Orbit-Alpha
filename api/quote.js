const cache = {};
const CACHE_TTL = 5 * 60 * 1000;
const SHARES = {
  SPCX: 13180000000, RKLB: 639410000, ASTS: 299790000, LUNR: 160450000, PL: 356000000,
  BKSY: 40920000, RDW: 25000000, MNTS: 22000000, SPCE: 467000000,
  KRMN: 133000000, SATL: 154000000, KULR: 46000000, TSAT: 15000000,
  GSAT: 1300000000, VSAT: 138000000, MDA: 162000000, SPIR: 391000000,
  DXYZ: 30000000, LMT: 231000000, FLY: 167000000, OKLO: 186000000,
  BA: 762000000, NOC: 149000000, RTX: 1330000000, ECHO: 290800000,
  IRDM: 135000000, VOYG: 61000000, YSS: 128000000,
  UFO: 20000000, ARKX: 22000000, NASA: 8000000, MARS: 383000, ROKT: 2100000,
  HAWK: 119000000, SIDU: 101230000,
};
// Chart ranges the site may request (anything else falls back to 7d).
const RANGES = new Set(['5d', '7d', '1mo', '3mo', '6mo', '1y']);
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker provided' });
  const symbol = ticker.toUpperCase();
  const range = RANGES.has(req.query.range) ? req.query.range : '7d';
  const key = `${symbol}:${range}`;
  const now = Date.now();
  if (cache[key] && (now - cache[key].ts) < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache[key].data);
  }
  try {
    const [chartRes, res5d] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com' }
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com' }
      })
    ]);
    const chartData = await chartRes.json();
    const data5d = await res5d.json();
    const meta = chartData?.chart?.result?.[0]?.meta;
    const closes5d = data5d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
    const price = meta?.regularMarketPrice;
    const prevClose = closes5d.length >= 2 ? closes5d[closes5d.length - 2] : null;
    if (meta) {
      if (prevClose && price) {
        meta.accuratePrevClose = prevClose;
        meta.regularMarketChangePercent = ((price - prevClose) / prevClose) * 100;
        meta.regularMarketChange = price - prevClose;
      }
      const shares = SHARES[symbol];
      if (shares && price) meta.marketCap = shares * price;
    }
    cache[key] = { ts: now, data: chartData };
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json(chartData);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
