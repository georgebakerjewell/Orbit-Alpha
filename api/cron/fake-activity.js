// api/cron/fake-activity.js

const ACTIVE_TICKERS = [
  // High activity (appear 5x)
  "RKLB","RKLB","RKLB","RKLB","RKLB",
  "ASTS","ASTS","ASTS","ASTS","ASTS",
  "LMT","LMT","LMT","LMT","LMT",
  "BA","BA","BA","BA","BA",
  // Medium activity (appear 3x)
  "LUNR","LUNR","LUNR",
  "OKLO","OKLO","OKLO",
  "SPCE","SPCE","SPCE",
  "DXYZ","DXYZ","DXYZ",
  "HAWK","HAWK","HAWK",
  // Low activity (appear 1x)
  "PL","BKSY","RDW","MNTS","KRMN",
  "SATL","KULR","TSAT","GSAT","VSAT",
  "MDA","SPIR","GILT","FLY","NOC",
  "RTX","UFO","ARKX","SATS","VOYG","YSS",
];

const TICKER_CONTEXT = {
  RKLB: `Rocket Lab (RKLB). Small/medium launch company.
- Electron rocket: 55+ launches, ~$8M per launch, small sat dedicated launch, reusable first stage
- Neutron rocket: medium lift, 13,000kg to LEO, 8m fairing, LOX/methane, targeting first launch 2026, RTLS reusable, Archimedes engine testing at Stennis
- Space Systems: satellites, components, reaction wheels, solar panels — segment-profitable
- Q1 2026: revenue $122M (+78% YoY), backlog $1.07B
- VICTUS HAZE (US Space Force 24hr responsive launch), HASTE hypersonic program
- NSSL Phase 3 Lane 1 winner alongside SpaceX
- Short interest ~12%, Stifel PT $105, consensus ~$26. CEO Peter Beck.`,

  ASTS: `AST SpaceMobile (ASTS). Space-based cellular broadband direct to standard phones.
- BlueBird Block 1 (5 sats) launched Sep 2024, first voice calls from space to unmodified phones
- BlueBird 7 failed to reach orbit Feb 2026, BlueBird 8-10 targeting mid-June 2026 via SpaceX
- Partners: AT&T, Verizon, Rakuten, Vodafone. FCC approval received.
- ~$800M cash after equity raise, pre-revenue at scale. CEO Abel Avellan.`,

  LUNR: `Intuitive Machines (LUNR). Lunar services company.
- IM-1 (Feb 2024): first US Moon landing since Apollo, tipped on side, partial success
- IM-2 (early 2026): landed near lunar south pole, carried NASA ice drill
- IM-3: scheduled late 2026, carries NASA comms relay
- NASA Near Space Network contract: $4.82B, 10 years
- 2026 revenue guidance $900M-$1B. High short interest ~22%. CEO Steve Altemus.`,

  OKLO: `Oklo (OKLO). Advanced fission microreactor company.
- Aurora microreactor: 15MW target, compact fast fission design
- NRC license application resubmitted 2024, pending approval
- Power purchase agreements with data centers and US government sites
- Backed by Sam Altman (OpenAI CEO, board chair). Pre-revenue, pre-commercial. HQ Santa Clara.`,

  SPCE: `Virgin Galactic (SPCE). Space tourism company.
- VSS Unity completed commercial flights 2023, now grounded for Delta class vehicle development
- Delta class vehicle targeting 2026 commercial service restart
- Very high burn rate, multiple dilutive raises, down significantly from 2021 peak of $55+
- Founder Richard Branson, HQ Truth or Consequences NM.`,

  HAWK: `HawkEye 360 (HAWK). RF signals intelligence from space.
- Detects, geolocates and characterizes RF signals from satellite clusters
- Customers: US DoD, intelligence community, maritime domain awareness
- IPO priced at top of range 2026, stock +30% on debut
- Proprietary signal detection tech, hard to replicate. HQ Herndon VA.`,

  BA: `Boeing (BA). Aerospace and defense giant.
- Starliner: helium leaks and thruster failures Jun 2024, crew stranded on ISS 9 months, returned via SpaceX Mar 2025
- 737 MAX: ongoing quality/safety scrutiny, DOJ investigation, production issues
- Defense: fixed-price contracts causing billions in losses
- New CEO Kelly Ortberg since Aug 2024. Machinists strike Sep-Nov 2024 cost $5B+.
- Raised $24B equity Nov 2024. Space: SLS rocket contractor for NASA Artemis.`,

  LMT: `Lockheed Martin (LMT). Largest US defense contractor.
- F-35: ~$100B+ program, ongoing deliveries to US and allies
- Orion spacecraft for NASA Artemis. Sikorsky helicopters (Black Hawk, CH-53K).
- GPS satellites, missile defense, hypersonics. Revenue ~$70B/year.
- Benefits from increased NATO spending. CEO Jim Taiclet. Dividend payer.`,

  PL: `Planet Labs (PL). Daily Earth observation from space.
- ~200 Dove + SkySat satellites, images entire land surface daily
- Pelican satellites: next gen high resolution, launching 2025-2026
- Revenue ~$220M annual run rate, not yet profitable
- Transitioning to high-res tasking to improve margins. CEO Will Marshall.`,

  BKSY: `BlackSky Technology (BKSY). Space-based intelligence and analytics.
- High-revisit imaging satellites over strategic locations, AI analytics platform
- Customers: US government, intelligence agencies, commercial
- Revenue ~$100M annual, growing on defence contract wins. HQ Herndon VA.`,

  DXYZ: `Destiny Tech100 (DXYZ). Closed-end fund with exposure to private tech companies.
- Holdings include SpaceX (~30%+), OpenAI, Stripe, Anthropic, Epic Games
- Closest public proxy for SpaceX exposure
- Trades at large premium to NAV (often 100-300%) due to SpaceX scarcity
- Premium compresses when SpaceX IPO speculation cools. ~$1.1B market cap.`,

  FLY: `Firefly Aerospace (FLY). Small launch and lunar lander company.
- Alpha rocket: reached orbit 2022, several successful launches since
- Blue Ghost lunar lander: successfully landed on Moon Feb 2026, operated full lunar day
- NASA CLPS contract winner. Medium launch vehicle in development. Recent IPO 2025.`,

  NOC: `Northrop Grumman (NOC). Major US defense and space contractor.
- B-21 Raider stealth bomber: low-rate initial production, first new US bomber in 30 years
- Built James Webb Space Telescope
- Sentinel ICBM modernization program. Revenue ~$40B/year. Benefits from nuclear modernization.`,

  RTX: `RTX Corp (RTX). Defense and aerospace conglomerate.
- Pratt & Whitney GTF engine powder metal defect: massive inspection/repair program, costing billions
- Raytheon missiles (Patriot, AMRAAM, Stinger): high demand from Ukraine war and allies rearming
- Collins Aerospace: avionics, interiors, systems. Revenue ~$70B/year.`,

  MDA: `MDA Space (MDA). Canadian space tech company.
- Canadarm3: robotic arm for NASA Gateway lunar space station
- CHORUS: planned broadband LEO constellation
- SAR imaging satellites. Revenue ~$1B CAD annually. Strong NASA relationships.`,

  SPIR: `Spire Global (SPIR). Space-based data and analytics.
- LEMUR satellites: maritime AIS tracking, weather data, aviation ADSB
- GNSS-R: GPS signal reflection for soil moisture, ocean winds
- Revenue ~$120M annual. Government and commercial data contracts.`,

  GSAT: `Globalstar (GSAT). Satellite communications company.
- Apple partnership: satellite SOS for iPhone 14/15/16 emergency messaging
- Apple deal provides ~85% of revenue guarantees through 2026+
- New satellite constellation planned with Apple funding. High legacy debt.`,

  VSAT: `Viasat (VSAT). Satellite internet and government comms.
- ViaSat-3 Americas: launched 2023, reflector deployment failure, partial capacity only
- Acquired Inmarsat 2023 for $7.3B, significant integration debt
- Government tactical data links, in-flight WiFi. Revenue ~$4B but margins under pressure.`,

  KULR: `KULR Technology (KULR). Thermal management for batteries and electronics.
- Lithium-ion battery thermal runaway prevention technology
- Customers: NASA, US military, commercial electronics
- Small cap, high volatility, revenue growing from near zero. Benefits from EV/energy storage.`,

  KRMN: `Karman Space (KRMN). Space and defense hardware manufacturer.
- Makes structural components, fairings, thermal protection for rockets and spacecraft
- Customers: SpaceX, ULA, US government. IPO'd 2025.
- Revenue ~$400M, profitable. Beneficiary of launch market growth.`,

  UFO: `Procure Space ETF (UFO). Space sector ETF launched 2019.
- Holds publicly traded space companies globally
- Top holdings: SES, Iridium, DigitalBridge, Viasat. ~$60M AUM. Expense ratio 0.75%.`,

  ARKX: `ARK Space Exploration ETF (ARKX). Actively managed space ETF by ARK Invest.
- Holds space-adjacent companies: Amazon (Kuiper), Iridium, Trimble, Kratos
- Controversial for including non-pure-play companies. ~$200M AUM.`,

  SATS: `EchoStar (SATS). Satellite technology and services.
- Owns Hughes Network Systems: satellite internet provider
- DISH Network merger completed 2024. Significant debt. Competing with Starlink on rural broadband.`,

  VOYG: `Voyager Technologies (VOYG). Space and defense systems company.
- Components and systems for spacecraft and defense. Recent IPO. Growing on DoD space spending.`,

  YSS: `York Space Systems (YSS). Satellite manufacturer.
- S-CLASS satellite bus: standardized, mass-produced small satellites
- US Space Force and commercial customers. Factory production approach. IPO'd 2025.`,

  TSAT: `Telesat (TSAT). Canadian satellite operator.
- Telesat Lightspeed: planned 198-satellite LEO broadband constellation, financing unresolved
- Legacy GEO satellites providing current revenue. High debt. Canadian government anchor customer.`,

  MNTS: `Momentus (MNTS). In-space transportation company.
- Vigoride space tug: orbital transfer vehicle for last-mile satellite delivery
- Several missions with mixed results. Very small revenue, high burn rate. Micro-cap, speculative.`,

  RDW: `Redwire (RDW). Space infrastructure and manufacturing.
- Makes solar arrays, structure, 3D printing hardware for spacecraft
- ISS customer: multiple payloads aboard station. UK expansion via European acquisitions.
- Revenue ~$250M annual. Government and commercial customers.`,

  SATL: `Satellogic (SATL). Earth observation company.
- Sub-meter resolution satellites, high revisit rate. South American company on Nasdaq.
- Small revenue, cash constrained. High risk, speculative.`,

  GILT: `Gilat Satellite Networks (GILT). Satellite ground systems and VSAT.
- VSAT terminals, network equipment, satellite broadband infrastructure
- Customers: telecom operators, governments, rural broadband. Israeli company on Nasdaq.
- Revenue ~$250M annual, profitable but slow-growing.`,
};

const COMPANY_KEYWORDS = {
  RKLB: ["Rocket Lab","RKLB","Electron","Neutron","Peter Beck"],
  ASTS: ["AST SpaceMobile","ASTS","BlueBird","Abel Avellan"],
  LUNR: ["Intuitive Machines","LUNR","IM-3","IM-4","lunar lander"],
  PL:   ["Planet Labs","PBC","Pelican"],
  BKSY: ["BlackSky","BKSY"],
  RDW:  ["Redwire","RDW"],
  MNTS: ["Momentus","MNTS"],
  SPCE: ["Virgin Galactic","SPCE","VSS"],
  KRMN: ["Karman","KRMN"],
  SATL: ["Satellogic","SATL"],
  KULR: ["KULR Technology","KULR"],
  TSAT: ["Telesat","TSAT","Lightspeed"],
  GSAT: ["Globalstar","GSAT"],
  VSAT: ["Viasat","VSAT"],
  MDA:  ["MDA Space","MDA"],
  SPIR: ["Spire Global","SPIR"],
  GILT: ["Gilat Satellite","GILT"],
  DXYZ: ["Destiny Tech","DXYZ"],
  LMT:  ["Lockheed Martin","LMT"],
  FLY:  ["Firefly Aerospace","FLY","Blue Ghost"],
  OKLO: ["Oklo","OKLO","microreactor"],
  BA:   ["Boeing","BA","Starliner"],
  NOC:  ["Northrop Grumman","NOC","B-21"],
  RTX:  ["RTX","Raytheon","Pratt & Whitney"],
  UFO:  ["Procure Space ETF","UFO"],
  ARKX: ["ARK Space","ARKX"],
  HAWK: ["HawkEye 360","HAWK"],
  VOYG: ["Voyager Technologies","VOYG"],
  YSS:  ["York Space","YSS"],
  SATS: ["EchoStar","SATS","Hughes"],
};

const USERNAMES = [
  "NeutronStar99", "Apogee_Al", "OrbitalOliver", "Perihelion_Pete",
  "VelocityVince", "StarLinkKiller", "GeoOrbitGuy", "LunarLong",
  "BuyTheDip2049", "ShotgunShorts", "BearInOrbit", "RealTalkRocket",
  "GovContractGuru", "TechnicalTerry", "NeutronWatch",

  "matthew_b",
  "Chris M",
  "james87",
  "oldmanriver",
  "tomk_1991",
  "Lisa P",
  "benjamin",
  "Mike from Dallas",
  "sarah_connor",
  "DaveR",
  "Peter H",
  "jonny_5",
  "Rach",
  "Alan",
  "theothersteve",
  "Will M.",
  "NinaK",
  "Rob_1978",
  "Claire",
  "Samir",
  "Jules",
  "Tommy Two Tabs",
  "Mark H",
  "ellie_rose",
  "Daniel",
  "KieranL",
  "Big Dave",
  "paul_w",
  "RebeccaS",
  "notthatjames",
  "Terry from accounts",
  "Laura_22",
  "Gaz",
  "Ollie",
  "Martin P",
  "Nick.",
  "JennyT",
  "Ahmed",
  "Steve probably",
  "charliebrown",
  "George K",
  "Molly",
  "andrew_uk",
  "Brian",
  "Hannah B",
  "Si",
  "Jackie",
  "PhilW",
  "Dom",
  "Rory",
  "kate_m",
  "DanTheMan",
  "Lucy",
  "Mr Spreadsheet",
  "gareth1975",
  "joel",
  "Amy",
  "Patrick",
  "Luke S",
  "Vanessa",
  "Tim in Ohio",
  "Barry",
  "Eddie",
  "Fiona C",
  "Nathan",
  "TheRealAlan",
  "Mick",
  "Olivia",
  "SeanP",
  "Rachel",
  "Kev",
  "anonymous",
  "anonymous",
  "anonymous",
  "anonymous",
  "anonymous",
  "anonymous"
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getContext(ticker) {
  return TICKER_CONTEXT[ticker] || `${ticker} is a publicly traded space or defense company.`;
}

// ── Fetch recent news for a ticker from your own news API ─────────────────────
async function getRecentNews(ticker) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://orbitalpha.cloud";

    const keywords = COMPANY_KEYWORDS[ticker] || [ticker];

    // fetch from your Yahoo news endpoint
    const res = await fetch(`${baseUrl}/api/yahoonews?ticker=${ticker}`, {
      headers: { "User-Agent": "orbitalpha-cron/1.0" },
    });

    if (!res.ok) return "";

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return "";

    // filter to only items mentioning this ticker's keywords
    const relevant = items
      .filter(item => {
        const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
        return keywords.some(k => text.includes(k.toLowerCase()));
      })
      .slice(0, 5);

    if (relevant.length === 0) return "";

    const headlines = relevant
      .map(item => {
        const date = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "";
        return `- ${date ? `[${date}] ` : ""}${item.title}`;
      })
      .join("\n");

    return `\nRecent news headlines about ${ticker}:\n${headlines}\n`;
  } catch (e) {
    return "";
  }
}

// ── Redis helper ──────────────────────────────────────────────────────────────
async function redis(command, args) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
  });
  const data = await res.json();
  return data.result;
}

async function getThreads(ticker) {
  try {
    const raw = await redis("GET", [`threads:${ticker}`]);
    if (!raw) return [];
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function saveThreads(ticker, threads) {
  await redis("SET", [`threads:${ticker}`, JSON.stringify(threads)]);
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function postNewThread(ticker) {
  const author = randomFrom(USERNAMES);
  const [context, news] = await Promise.all([
    getContext(ticker),
    getRecentNews(ticker),
  ]);

  const prompt = `You are a retail investor posting on a stock discussion forum.

Background facts about ${ticker}:
${context}
${news}
Write a short forum post (title + optional body) about ${ticker}.

Rules:
- Title: 5-12 words, casual and opinionated, like a real Reddit post
- Body: 0-3 sentences max. Sometimes leave blank.
- If recent news headlines are provided above, you may reference them — but only facts explicitly stated in the headlines or background, never invented details
- Sound like a real retail investor: mix of sharp takes, casual language, occasional typos fine
- Can be bullish, bearish, neutral, or just a question
- No hashtags. Occasional emoji in body only.
- Output ONLY valid JSON: {"title":"...","body":"..."} — nothing else, no markdown`;

  const raw = await callClaude(prompt);
  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { parsed = JSON.parse(match[0]); } catch (e2) { return null; }
  }

  const thread = {
    id: `t${Date.now()}`,
    author,
    time: new Date().toISOString(),
    title: parsed.title || "Thoughts?",
    body: parsed.body || "",
    upvotes: Math.floor(Math.random() * 8) + 1,
    downvotes: Math.floor(Math.random() * 3),
    comments: [],
  };

  const threads = await getThreads(ticker);
  await saveThreads(ticker, [thread, ...threads]);
  return { action: "new_thread", ticker, title: thread.title };
}

async function postComment(ticker) {
  const threads = await getThreads(ticker);
  if (!threads || threads.length === 0) return postNewThread(ticker);

  const pool = threads.slice(0, Math.min(5, threads.length));
  const thread = randomFrom(pool);
  const author = randomFrom(USERNAMES);

  const [context, news] = await Promise.all([
    getContext(ticker),
    getRecentNews(ticker),
  ]);

  const existingComments = (thread.comments || [])
    .slice(-3)
    .map(c => `${c.author}: ${c.body}`)
    .join("\n");

  const prompt = `You are a retail investor commenting on a stock forum thread about ${ticker}.

Background facts about ${ticker}:
${context}
${news}
Thread title: "${thread.title}"
${thread.body ? `Thread body: "${thread.body}"` : ""}
${existingComments ? `Recent comments:\n${existingComments}` : ""}

Write ONE short comment replying to this thread.

Rules:
- 1-3 sentences MAX. Often just 1. Sometimes just 2-6 words ("agreed", "this exactly", "lol same").
- Only reference facts from the background or news above — never invent numbers or events
- Sound like a real person: casual, sometimes slightly off-topic, occasional typos fine
- Mix of styles: sharp insight, basic reaction, dumb question, mild disagreement, one-liner
- No hashtags
- Output ONLY the comment text — no quotes, no JSON, no explanation`;

  const comment = await callClaude(prompt);
  if (!comment || comment.length > 300) return postNewThread(ticker);

  const newComment = {
    id: `c${Date.now()}`,
    author,
    time: new Date().toISOString(),
    body: comment.trim(),
    upvotes: Math.floor(Math.random() * 12) + 1,
    downvotes: Math.floor(Math.random() * 4),
  };

  const updated = threads.map(t =>
    t.id === thread.id
      ? { ...t, comments: [...(t.comments || []), newComment] }
      : t
  );
  await saveThreads(ticker, updated);
  return { action: "new_comment", ticker, threadTitle: thread.title, body: newComment.body };
}

async function bumpVotes(ticker) {
  const threads = await getThreads(ticker);
  if (!threads || threads.length === 0) return postNewThread(ticker);

  const updated = threads.map(thread => ({
    ...thread,
    upvotes: thread.upvotes + (Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0),
    comments: (thread.comments || []).map(c => ({
      ...c,
      upvotes: c.upvotes + (Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0),
    })),
  }));

  await saveThreads(ticker, updated);
  return { action: "vote_bump", ticker };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ticker = randomFrom(ACTIVE_TICKERS);
  const r = Math.random();
  const action = r < 0.25 ? "new_thread" : r < 0.85 ? "new_comment" : "vote_bump";

  let result;
  try {
    if (action === "new_thread")  result = await postNewThread(ticker);
    if (action === "new_comment") result = await postComment(ticker);
    if (action === "vote_bump")   result = await bumpVotes(ticker);
  } catch (e) {
    console.error("Cron error:", e.message);
    return res.status(500).json({ error: e.message });
  }

  console.log("Cron result:", JSON.stringify(result));
  return res.status(200).json({ ok: true, result });
}
