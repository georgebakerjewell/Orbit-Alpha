// Upcoming launches. Primary source: Launch Library 2 (The Space Devs), which lists every
// scheduled orbital launch. Fallback: rocketlaunch.live (free tier returns only the next 5).
// Output keeps the rocketlaunch.live shape ({ result: [...] }) that the site already reads.

const LL2 = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=40&mode=normal";
const RLL = "https://fdo.rocketlaunch.live/json/launches/next/50";
const TTL = 60 * 60 * 1000; // LL2's free tier allows 15 requests an hour, so cache for an hour
let cache = null;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ll2ToLaunch(l) {
  const net = new Date(l.net);
  const precision = typeof l.net_precision === "object" ? l.net_precision?.name : l.net_precision;
  const exactDay = !precision || ["Second", "Minute", "Hour", "Day"].includes(precision);
  const valid = !isNaN(net);
  const date_str = !valid ? "TBD"
    : exactDay ? `${MONTHS[net.getUTCMonth()]} ${net.getUTCDate()}`
    : precision === "Month" ? `${MONTHS[net.getUTCMonth()]} ${net.getUTCFullYear()}`
    : `NET ${MONTHS[net.getUTCMonth()]} ${net.getUTCFullYear()}`;
  const abbrev = l.status?.abbrev || "";
  return {
    name: l.name,
    date_str,
    sort_date: valid ? Math.floor(net.getTime() / 1000) : null,
    provider: { name: l.launch_service_provider?.name || "", slug: (l.launch_service_provider?.name || "").toLowerCase().replace(/\s+/g, "-") },
    vehicle: { name: l.rocket?.configuration?.name || "" },
    missions: [{ name: l.mission?.name || l.name?.split("|").pop()?.trim() || "" }],
    pad: { location: { name: l.pad?.location?.name || "" } },
    win_open: abbrev === "Go" ? l.net : null,
    result: abbrev === "Success" ? 1 : null,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (cache && Date.now() - cache.ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(cache.data);
  }
  try {
    const r = await fetch(LL2, { headers: { "User-Agent": "OrbitAlpha/1.0 (orbitalpha.cloud)" } });
    if (!r.ok) throw new Error(`LL2 ${r.status}`);
    const json = await r.json();
    const result = (json.results || []).map(ll2ToLaunch);
    if (!result.length) throw new Error("LL2 empty");
    const data = { result, source: "Launch Library 2" };
    cache = { ts: Date.now(), data };
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(data);
  } catch (e) {
    try {
      const r = await fetch(RLL, { headers: { "User-Agent": "OrbitAlpha/1.0" } });
      const data = await r.json();
      res.setHeader("Cache-Control", "s-maxage=600");
      return res.status(200).json({ ...data, source: "rocketlaunch.live" });
    } catch (e2) {
      return res.status(500).json({ error: `${e.message}; ${e2.message}` });
    }
  }
}
