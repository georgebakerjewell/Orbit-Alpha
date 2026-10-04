// Government contract awards (NASA, Space Force, DoD, etc.) to roster companies.
// Source: USAspending.gov public API (official US federal spending data, no key needed).
//   GET /api/contracts            -> recent awards across the whole roster
//   GET /api/contracts?ticker=RKLB -> awards for one company

// Recipient-name search terms per ticker. USAspending stores legal entity names in upper case,
// so terms must be specific enough not to match unrelated companies.
const RECIPIENTS = {
  RKLB: ["ROCKET LAB", "GEOST"],
  ASTS: ["AST & SCIENCE"],
  GSAT: ["GLOBALSTAR"],
  VSAT: ["VIASAT"],
  PL: ["PLANET LABS"],
  KRMN: ["KARMAN SPACE", "KARMAN HOLDINGS", "SYSTIMA TECHNOLOGIES"],
  MDA: ["MDA US SYSTEMS", "MACDONALD DETTWILER", "MDA SPACE"],
  FLY: ["FIREFLY AEROSPACE"],
  LUNR: ["INTUITIVE MACHINES"],
  TSAT: ["TELESAT"],
  RDW: ["REDWIRE"],
  BKSY: ["BLACKSKY"],
  SATL: ["SATELLOGIC"],
  SPIR: ["SPIRE GLOBAL"],
  SPCE: ["VIRGIN GALACTIC"],
  KULR: ["KULR TECHNOLOGY"],
  MNTS: ["MOMENTUS"],
  SPCX: ["SPACE EXPLORATION TECHNOLOGIES"],
  VOYG: ["VOYAGER TECHNOLOGIES", "VOYAGER SPACE", "NANORACKS"],
  YSS: ["YORK SPACE SYSTEMS"],
  HAWK: ["HAWKEYE 360"],
  SIDU: ["SIDUS SPACE"],
  ECHO: ["HUGHES NETWORK SYSTEMS", "ECHOSTAR"],
};

const API = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
const FIELDS = ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency", "Awarding Sub Agency", "Start Date", "Description"];
const TTL = 6 * 60 * 60 * 1000;
const cache = {};

const isoDate = (d) => d.toISOString().slice(0, 10);

export function tickerFor(recipient = "") {
  const name = recipient.toUpperCase();
  return Object.keys(RECIPIENTS).find((t) => RECIPIENTS[t].some((term) => name.includes(term))) || null;
}

// "IGF::OT::IGF LAUNCH SERVICES FOR ..." -> "Launch services for ..."
export function cleanDescription(desc = "") {
  const text = desc.replace(/^(IGF::\w+::IGF\s*)/i, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  return (lower.charAt(0).toUpperCase() + lower.slice(1)).slice(0, 220);
}

export function shapeResults(results, cutoff) {
  return results
    .map((r) => ({
      ticker: tickerFor(r["Recipient Name"]),
      recipient: r["Recipient Name"],
      amount: Number(r["Award Amount"]) || 0,
      agency: r["Awarding Agency"] || "",
      subAgency: r["Awarding Sub Agency"] || "",
      start: r["Start Date"] || "",
      description: cleanDescription(r["Description"]),
      awardId: r["Award ID"],
      url: r.generated_internal_id ? `https://www.usaspending.gov/award/${r.generated_internal_id}` : null,
    }))
    .filter((a) => a.ticker && a.amount > 0 && a.start >= cutoff);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "").toUpperCase();
  if (ticker && !RECIPIENTS[ticker]) return res.status(200).json({ awards: [], total: 0 });

  const key = ticker || "ALL";
  if (cache[key] && Date.now() - cache[key].ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json(cache[key].data);
  }

  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const terms = ticker ? RECIPIENTS[ticker] : Object.values(RECIPIENTS).flat();

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          award_type_codes: ["A", "B", "C", "D"], // definitive contracts and orders (not IDV ceilings)
          recipient_search_text: terms,
          time_period: [{ start_date: isoDate(yearAgo), end_date: isoDate(now) }],
        },
        fields: FIELDS,
        sort: "Start Date",
        order: "desc",
        limit: 100,
        page: 1,
      }),
    });
    if (!response.ok) throw new Error(`USAspending ${response.status}`);
    const json = await response.json();
    const awards = shapeResults(json.results || [], isoDate(yearAgo));
    const data = {
      awards: awards.slice(0, ticker ? 15 : 40),
      total: awards.reduce((sum, a) => sum + a.amount, 0),
      asOf: isoDate(now),
    };
    cache[key] = { ts: Date.now(), data };
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message, awards: [], total: 0 });
  }
}
