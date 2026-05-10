export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  const SPACE_TICKERS = [
    'RKLB', 'ASTS', 'HAWK', 'LUNR', 'PL', 'BKSY', 'RDW', 'MNTS',
    'SPCE', 'KRMN', 'SATL', 'KULR', 'GSAT', 'VSAT', 'MDA', 'SPIR',
    'DXYZ', 'LMT', 'FLY', 'OKLO', 'BA', 'NOC', 'RTX', 'UFO',
    'ARKX', 'TSAT', 'GILT', 'SATS', 'VOYG', 'YSS',
  ];

  const HIGH_SIGNAL_KEYWORDS = [
    'contract', 'IPO', 'earnings', 'revenue', 'quarterly', 'analyst',
    'price target', 'upgrade', 'downgrade', 'acquisition', 'partnership',
    'launch success', 'launch failure', 'raises', 'secures', 'wins',
    'billion', 'million contract', 'NASA award', 'FCC', 'record revenue',
    'guidance', 'beat', 'miss', 'forecast',
  ];

  const isHighSignal = (title) => {
    const text = title.toLowerCase();
    return HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));
  };

  const seenUrls = new Set();
  const allNews = [];

  const fetchTickerNews = async (ticker) => {
    try {
      const newsUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&newsCount=10&enableFuzzyQuery=false`;
      const newsRes = await fetch(newsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const newsData = await newsRes.json();
      const articles = newsData?.news || [];
      return articles.map(a => ({
        title: a.title,
        link: a.link,
        pubDate: new Date(a.providerPublishTime * 1000).toUTCString(),
        description: '',
        source: a.publisher || 'Yahoo Finance',
        ticker,
        highlight: isHighSignal(a.title || ''),
      }));
    } catch(e) {
      return [];
    }
  };

  try {
    const { ticker } = req.query;
    const tickers = ticker ? [ticker] : SPACE_TICKERS;

    const results = [];
    for (let i = 0; i < tickers.length; i += 5) {
      const batch = tickers.slice(i, i + 5);
      const batchResults = await Promise.allSettled(batch.map(t => fetchTickerNews(t)));
      results.push(...batchResults);
      if (i + 5 < tickers.length) await new Promise(r => setTimeout(r, 300));
    }

    results.forEach(r => {
      if(r.status === 'fulfilled') {
        r.value.forEach(article => {
          if(article.title && article.link && !seenUrls.has(article.link)) {
            seenUrls.add(article.link);
            allNews.push(article);
          }
        });
      }
    });

    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.status(200).json(allNews.slice(0, 60));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
