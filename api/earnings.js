export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SPACE_TICKERS = new Set([
    'RKLB','ASTS','LUNR','PL','BKSY','RDW','MNTS','SPCE',
    'KRMN','SATL','KULR','GSAT','VSAT','MDA','SPIR','DXYZ',
    'LMT','FLY','OKLO','BA','NOC','RTX','TSAT','HAWK',
    'GILT','SATS','VOYG','YSS','KRMN','UFO','ARKX',
  ]);

  try {
    const today = new Date();
    const results = [];

    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      try {
        const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateStr}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.nasdaq.com',
            'Referer': 'https://www.nasdaq.com/market-activity/earnings',
          }
        });
        const data = await response.json();
        const rows = data?.data?.rows || [];
        rows.forEach(row => {
          const ticker = row.symbol?.toUpperCase();
          if (SPACE_TICKERS.has(ticker)) {
            results.push({
              ticker,
              name: row.name || ticker,
              date: new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              }),
              timestamp: date.getTime() / 1000,
              time: row.time || 'TBD',
              epsEst: row.epsForecast || 'N/A',
              revEst: 'N/A',
            });
          }
        });
      } catch(e) {}
    }

    results.sort((a, b) => a.timestamp - b.timestamp);
    res.status(200).json(results);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
