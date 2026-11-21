// Feed for the Orbit Alpha Devvit app (posts new stories to the subreddit).
// Reuses /api/news and filters out price-movement and clickbait headlines.
import crypto from 'node:crypto';

const EXCLUDE = [
  /\b(stock|shares?)\b.*\b(falls?|fell|rises?|rose|jumps?|soars?|plunges?|drops?|slides?|surges?|tumbles?|gains?|sinks?|rall(y|ies)|climbs?|dips?)\b/i,
  /\b(falls?|fell|rises?|rose|jumps?|soars?|plunges?|drops?|slides?|surges?|tumbles?|sinks?)\b.*\d+(\.\d+)?%/i,
  /price target/i,
  /\bstock\b.*\b(crash(es|ing)?|dropped|lifts?|slump(s|ed)?)\b|\b(crash(es|ing)?|dropped|lifts?)\b.*\bstock\b|stock price, news|\bquote & history\b/i,
  /\b(is|are) (falling|rising|soaring|plunging|down|up) today\b|\bcramer\b|\bforget\b|\bstocks? to research\b|\bbuying opportunity\b|\breal winner\b|\banalysts? warns?\b|\bfool\b/i,
  /\b(raised|lowered|cut|upgraded|downgraded) to\b|\brating\b|\b(fully|over|under)\s?(valued|priced)\b|\bvaluation\b|\bprediction\b|than i thought|here('|’)?s (what|why|how)|\?$/i,
  /\bshould you\b|\bis it time to\b|\bbuy (now|today)\b|\bstocks? to (buy|watch)\b|\bmillionaire\b|\bbetter buy\b/i,
];

const isPriceOrClickbait = (title) => EXCLUDE.some((re) => re.test(title));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  try {
    const host = req.headers.host || 'www.orbitalpha.cloud';
    const r = await fetch(`https://${host}/api/news?limit=50`);
    if (!r.ok) throw new Error(`news ${r.status}`);
    const news = await r.json();

    const items = news
      .filter((n) => n.title && n.link && !isPriceOrClickbait(n.title))
      .filter((n, i, a) => a.findIndex((m) => m.title.toLowerCase() === n.title.toLowerCase()) === i)
      .slice(0, 20)
      .map((n) => ({
        id: crypto.createHash('sha1').update(n.title.toLowerCase().trim()).digest('hex').slice(0, 16),
        title: n.title,
        summary: (n.description || '').trim(),
        url: 'https://orbitalpha.cloud/news',
        source: n.source || undefined,
        sourceUrl: n.link,
        publishedAt: new Date(n.pubDate).toISOString(),
      }));

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
