const cache = {};
const CACHE_TTL = 5 * 60 * 1000;
const SHARES = {
  RKLB: 581000000, ASTS: 405000000, LUNR: 120000000, PL: 370000000,
  BKSY: 85000000, RDW: 68000000, MNTS: 28000000, SPCE: 240000000,
  KRMN: 65000000, SATL: 180000000, KULR: 155000000, TSAT: 50000000,
  GSAT: 1850000000, VSAT: 124000000, MDA: 108000000, SPIR: 262000000,
  DXYZ: 28000000, LMT: 237000000, FLY: 42000000, OKLO: 210000000,
  BA: 762000000, NOC: 149000000, RTX: 1330000000, SATS: 84000000,
  IRDM: 135000000, VOYG: 61000000, YSS: 128000000,
  UFO: 20000000, ARKX: 22000000, NASA: 8000000, MARS: 383000, ROKT: 2100000,
  HAWK: 119000000,
};
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker provided' });
  const key = ticker.toUpperCase();
  const now = Date.now();
  if (cache[key] && (now - cache[key].ts) < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache[key].data);
  }
  try {
    const [chartRes, res5d] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${key}?interval=1d&range=7d`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com' }
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${key}?interval=1d&range=5d`, {
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
      const shares = SHARES[key];
      if (shares && price) meta.marketCap = shares * price;
    }
    cache[key] = { ts: now, data: chartData };
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(chartData);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
