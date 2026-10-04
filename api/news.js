export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  const { ticker, limit = 50 } = req.query;

  // Covered stocks (keep in step with src/stocks.json) plus industry context.
  // Excluded from Orbit Alpha coverage, so not queried: LMT, BA, NOC, OKLO, GILT, DXYZ.
  const GOOGLE_QUERIES = ticker ? [
    { q: `${ticker} stock` },
  ] : [
    { q: 'Rocket Lab RKLB stock' },
    { q: 'AST SpaceMobile ASTS stock' },
    { q: 'Intuitive Machines LUNR stock' },
    { q: 'Planet Labs PL stock' },
    { q: 'BlackSky Technology BKSY stock' },
    { q: 'Redwire RDW stock' },
    { q: 'Momentus MNTS stock' },
    { q: 'Virgin Galactic SPCE stock' },
    { q: 'Karman Space KRMN stock' },
    { q: 'Satellogic SATL stock' },
    { q: 'KULR Technology stock' },
    { q: 'Telesat TSAT stock' },
    { q: 'Globalstar GSAT stock' },
    { q: 'Viasat VSAT stock' },
    { q: 'MDA Space stock' },
    { q: 'Spire Global SPIR stock' },
    { q: 'Firefly Aerospace FLY stock' },
    { q: 'SpaceX SPCX stock' },
    { q: 'HawkEye 360 HAWK stock' },
    { q: 'EchoStar ECHO stock' },
    { q: 'Voyager Technologies VOYG stock' },
    { q: 'York Space Systems YSS stock' },
    { q: 'Sidus Space SIDU stock' },
    { q: 'space stocks' },
    { q: 'NASA commercial space contract' },
    { q: 'US Space Force contract award' },
    { q: 'Blue Origin New Glenn' },
  ];

  const HIGH_SIGNAL_KEYWORDS = [
    'contract', 'IPO', 'earnings', 'revenue', 'quarterly', 'analyst',
    'price target', 'upgrade', 'downgrade', 'acquisition', 'partnership',
    'raises', 'secures', 'wins', 'billion', 'guidance', 'beat', 'miss',
    'record', 'award', 'FCC', 'regulatory', 'launch success', 'launch failure',
  ];

  const EXCLUDE_KEYWORDS = [
    'Star Wars', 'Star Trek', 'sci-fi', 'science fiction', 'movie', 'film',
    'Lego', 'toy', 'video game', 'skywatching', 'meteor shower', 'eclipse',
    'astrophotography', 'horoscope', 'zodiac', 'astrology', 'thriller',
    'best photos', 'flower moon', 'stormtroopers',
  ];

  const MAX_AGE = 14 * 86_400_000; // Google News search returns some old articles; skip them
  const escapeRe = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const decode = (str) => str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

  const isHighSignal = (text) =>
    HIGH_SIGNAL_KEYWORDS.some(k => text.toLowerCase().includes(k.toLowerCase()));

  const isExcluded = (text) =>
    EXCLUDE_KEYWORDS.some(k => text.toLowerCase().includes(k.toLowerCase()));

  const fetchGoogleNews = async ({ q }) => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await response.text();
      const items = [];
      const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const item = match[1];
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                      item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] ||
                     item.match(/<guid>(.*?)<\/guid>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || 'Google News';
        const clean = decode(title).replace(new RegExp(`\\s+-\\s+${escapeRe(decode(source).trim())}$`), '').trim();
        const age = Date.now() - new Date(pubDate).getTime();
        if (clean && link && !isExcluded(clean) && !(age > MAX_AGE)) {
          items.push({
            title: clean,
            link: link.trim(),
            pubDate,
            description: '',
            source: decode(source).trim(),
            highlight: isHighSignal(clean),
          });
        }
      }
      return items;
    } catch(e) {
      return [];
    }
  };

  try {
    const seenUrls = new Set();
    const allNews = [];

    const results = [];
    for (let i = 0; i < GOOGLE_QUERIES.length; i += 5) {
      const batch = GOOGLE_QUERIES.slice(i, i + 5);
      const batchResults = await Promise.allSettled(batch.map(q => fetchGoogleNews(q)));
      results.push(...batchResults);
      if (i + 5 < GOOGLE_QUERIES.length) await new Promise(r => setTimeout(r, 300));
    }

    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.forEach(article => {
          if (article.link && !seenUrls.has(article.link)) {
            seenUrls.add(article.link);
            allNews.push(article);
          }
        });
      }
    });

    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.status(200).json(allNews.slice(0, parseInt(limit)));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
