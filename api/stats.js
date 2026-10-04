// Public newsletter stats for the website (currently just the subscriber count).
// Cached for an hour so Beehiiv is called at most once an hour.
const PUBLICATION = "pub_e101efa6-d509-4743-a46d-ff8ada14d522";
let cache = null;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (cache && Date.now() - cache.ts < 60 * 60 * 1000) {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(cache.data);
  }
  try {
    const r = await fetch(`https://api.beehiiv.com/v2/publications/${PUBLICATION}?expand[]=stats`, {
      headers: { Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}` },
    });
    const json = await r.json();
    const subscribers = json?.data?.stats?.active_subscriptions;
    if (!r.ok || typeof subscribers !== "number") throw new Error(`Beehiiv ${r.status}`);
    const data = { subscribers };
    cache = { ts: Date.now(), data };
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (e) {
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(502).json({ error: e.message });
  }
}
