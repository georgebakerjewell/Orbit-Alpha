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

// Real context per ticker — used to ground Claude's output in facts
const TICKER_CONTEXT = {
  RKLB: `Rocket Lab (RKLB). Small/medium launch company. Key facts:
- Electron rocket: 55+ launches, ~$8M per launch, small sat dedicated launch
- Neutron rocket: medium lift, 13,000kg to LEO, 8m fairing, LOX/methane, targeting first launch 2026, RTLS reusable first stage, Archimedes engine in testing at Stennis
- Space Systems segment: makes satellites, spacecraft components, reaction wheels, solar panels — already segment-profitable
- Q1 2026: revenue $122M (+78% YoY), backlog $1.07B
- Government contracts: VICTUS HAZE (US Space Force 24hr responsive launch), HASTE hypersonic test program
- NSSL Phase 3 Lane 1 winner alongside SpaceX
- Short interest ~12%, Stifel PT $105, consensus ~$26
- CEO Peter Beck, based in Long Beach CA and NZ, listed on Nasdaq`,

  ASTS: `AST SpaceMobile (ASTS). Space-based cellular broadband direct to standard mobile phones. Key facts:
- BlueBird satellites: Block 1 (5 sats) launched Sep 2024, provided first voice calls from space to unmodified phones
- Block 2: BlueBird 7 failed to reach orbit Feb 2026 (launch anomaly), BlueBird 8-10 targeting mid-June 2026 via SpaceX Falcon 9
- Partners: AT&T, Verizon, Rakuten, Vodafone, others — revenue share model
- FCC approval received for commercial operations in US
- TAM: every mobile phone user without reliable coverage globally
- Cash runway: ~$800M after recent equity raise, still pre-revenue at scale
- CEO Abel Avellan, HQ Midland TX`,

  LUNR: `Intuitive Machines (LUNR). Lunar lander company. Key facts:
- IM-1 (Feb 2024): first US soft landing on moon since Apollo, landed but tipped on its side, partial mission success
- IM-2 (early 2026): carried NASA PRIME-1 ice drill, landed near south pole
- IM-3: scheduled late 2026, carries NASA comms relay payload
- NASA CLPS contract: ~$4.8B total pool for lunar deliveries, LUNR is primary awardee
- 2026 revenue guidance: $900M-$1B (includes Near Space Network contract)
- Also builds space infrastructure: lunar data relay network, OMES orbital services
- High short interest ~22%, very volatile stock
- CEO Steve Altemus, HQ Houston TX`,

  OKLO: `Oklo (OKLO). Advanced nuclear fission company, microreactor focused. Key facts:
- Aurora microreactor design: compact fast fission reactor, 15MW target output
- NRC license application resubmitted 2024 after initial rejection, still pending approval
- Power purchase agreements signed: data center customers, US government sites
- Backed by Sam Altman (OpenAI CEO) who is board chair
- No revenue yet, pre-commercial stage
- Tailwinds: AI data center power demand driving nuclear interest
- Merged with AltC Acquisition Corp to go public 2024
- HQ Santa Clara CA`,

  SPCE: `Virgin Galactic (SPCE). Space tourism company. Key facts:
- VSS Unity (SpaceShipTwo): completed commercial flights 2023, then grounded for Delta class vehicle development
- Delta class vehicle: next gen spaceship, targeting 2026 commercial service restart
- Burned through most original capital, multiple dilutive raises
- Very high burn rate, limited near-term revenue until Delta flies
- Stock down significantly from 2021 peak of $55+
- Founder Richard Branson, HQ Truth or Consequences NM
- Controversial: many retail investors burned by timeline slippage`,

  HAWK: `HawkEye 360 (HAWK). RF signals intelligence from space. Key facts:
- Operates clusters of small satellites that detect, geolocate and characterize RF signals
- Customers: US DoD, intelligence community, maritime domain awareness
- IPO priced at top of range 2026, stock +30% on debut
- Revenue growing rapidly on government contract wins
- Proprietary signal detection tech, hard to replicate
- HQ Herndon VA`,

  BA: `Boeing (BA). Aerospace and defense giant. Key facts:
- Starliner CST-100: crewed capsule had helium leaks and thruster failures on ISS mission Jun 2024, crew (Butch Wilmore and Suni Williams) stranded on ISS for 9 months, returned via SpaceX Dragon Mar 2025
- 737 MAX: ongoing quality and safety scrutiny, DOJ investigation, production rate issues
- Defense: fixed-price contracts causing billions in losses (KC-46, T-7A, Starliner)
- New CEO Kelly Ortberg since Aug 2024, trying to stabilize
- Strike by machinists Sep-Nov 2024, cost $5B+
- Credit rating near junk, raised $24B equity Nov 2024 to avoid downgrade
- Space: SLS rocket contractor for NASA Artemis`,

  LMT: `Lockheed Martin (LMT). Largest US defense contractor. Key facts:
- F-35 fighter jet: ~$100B+ program, deliveries ongoing to US and allies
- Orion spacecraft: NASA Artemis crew capsule
- Sikorsky helicopters: Black Hawk, CH-53K
- Space: GPS satellites, missile defense systems, hypersonics
- Revenue ~$70B/year, very consistent margins
- Benefits from increased NATO defense spending post-Ukraine war
- CEO Jim Taiclet
- Dividend payer, relatively defensive stock`,

  PL: `Planet Labs (PL). Daily Earth observation from space. Key facts:
- Operates world's largest constellation of Earth imaging satellites (~200 Doves + SkySat)
- Images entire land surface of Earth every day
- Pelican satellites: next gen high resolution, launching 2025-2026
- Customers: government, agriculture, forestry, insurance, financial analytics
- Revenue ~$220M annual run rate, still not profitable
- Transitioning from low-res daily to high-res tasking to improve margins
- CEO Will Marshall, HQ San Francisco`,

  BKSY: `BlackSky Technology (BKSY). Space-based intelligence and analytics. Key facts:
- Operates high-revisit imaging satellites over strategic locations
- AI analytics platform on top of imagery
- Customers: US government, intelligence agencies, commercial
- Revenue ~$100M annual, growing on defence contract wins
- Competes with Planet Labs but more focused on analytics than raw data
- HQ Herndon VA`,

  DXYZ: `Destiny Tech100 (DXYZ). Closed-end fund providing retail access to private tech companies. Key facts:
- Holdings include SpaceX, OpenAI, Stripe, Anthropic, Epic Games among others
- SpaceX is largest holding ~30%+ of portfolio
- Trades at significant premium to NAV (often 100-300% premium) due to scarcity of SpaceX access
- Premium compresses when SpaceX IPO speculation cools
- Not a direct SpaceX investment but closest public proxy
- ~$1.1B market cap`,

  FLY: `Firefly Aerospace (FLY). Small launch and lunar lander company. Key facts:
- Alpha rocket: reached orbit 2022, several successful launches since
- Blue Ghost lunar lander: landed on Moon successfully Feb 2026, mission success, operated for full lunar day
- NASA CLPS contract winner
- Medium launch vehicle in development
- Private company that went public via SPAC 2025
- Competes with Rocket Lab on small launch`,

  LUNR: `Intuitive Machines (LUNR). Lunar services company. Key facts:
- IM-1 mission: landed Feb 2024, first US Moon landing since 1972, tipped on landing
- IM-2: landed near lunar south pole early 2026
- NASA Near Space Network contract: $4.82B, 10 years, provides lunar comms relay
- 2026 revenue guidance $900M-$1B
- Very high short interest, volatile`,

  NOC: `Northrop Grumman (NOC). Major US defense and space contractor. Key facts:
- B-21 Raider stealth bomber: in low-rate initial production, first new US bomber in 30 years
- James Webb Space Telescope: built the observatory
- GBSD/Sentinel: intercontinental ballistic missile modernization program
- Space systems: missile warning satellites, classified programs
- Revenue ~$40B/year, stable margins
- Benefits from nuclear modernization spending`,

  RTX: `RTX Corp (RTX). Defense and aerospace conglomerate. Key facts:
- Pratt & Whitney engines: GTF engine had powder metal defect issue, massive inspection/repair program ongoing costing billions
- Raytheon missiles: Patriot, AMRAAM, Stinger — high demand from Ukraine war and allies rearming
- Collins Aerospace: avionics, interiors, systems
- Revenue ~$70B/year
- GTF issue still dragging margins but resolving through 2026`,

  MDA: `MDA Space (MDA). Canadian space tech company. Key facts:
- Canadarm3: robotic arm for NASA Gateway lunar space station, major contract
- CHORUS satellite constellation: planned broadband LEO constellation
- Radar satellites: SAR imaging
- Listed on TSX, also traded OTC in US
- Revenue ~$1B Canadian annually, growing
- Strong government/NASA relationships`,

  SPIR: `Spire Global (SPIR). Space-based data and analytics. Key facts:
- LEMUR satellites: constellation for maritime AIS tracking, weather data, aviation ADSB
- GNSS-R: GPS signal reflection for soil moisture, ocean winds — unique dataset
- Government and commercial data contracts
- Revenue ~$120M annual, pursuing profitability
- Competes with Planet on some government contracts`,

  GSAT: `Globalstar (GSAT). Satellite communications company. Key facts:
- Apple partnership: provides satellite SOS for iPhone 14/15/16 emergency messaging
- Apple deal provides ~85% of revenue guarantees through 2026+
- LEO constellation, voice and data services
- New satellite constellation planned with Apple funding
- High debt load historically
- Stock sensitive to Apple news`,

  VSAT: `Viasat (VSAT). Satellite internet and government comms. Key facts:
- ViaSat-3 Americas: launched 2023, experienced reflector deployment failure, partial capacity
- Government segment: tactical data links, in-flight connectivity for military
- In-flight WiFi: commercial airlines
- Acquired Inmarsat 2023 for $7.3B, integration ongoing, added significant debt
- Revenue ~$4B annual but margins under pressure from ViaSat-3 issue and Inmarsat integration`,

  KULR: `KULR Technology (KULR). Thermal management for batteries and electronics. Key facts:
- Lithium-ion battery safety: thermal runaway prevention technology
- Customers: NASA, US military, commercial
- Small cap, high volatility
- Revenue growing from near zero but still small
- Benefits from EV and energy storage tailwinds`,

  KRMN: `Karman Space (KRMN). Space and defense hardware manufacturer. Key facts:
- Makes structural components, fairings, thermal protection systems for rockets and spacecraft
- Customers: SpaceX, ULA, US government
- IPO'd 2025
- Revenue ~$400M, profitable
- Beneficiary of launch market growth`,

  UFO: `Procure Space ETF (UFO). Space sector ETF. Key facts:
- Holds publicly traded space companies globally
- Top holdings: SES, Iridium, Maxar (acquired), DigitalBridge, Viasat, Intelsat
- ~$60M AUM, relatively small ETF
- Expense ratio 0.75%
- Launched 2019, one of first pure-play space ETFs`,

  ARKX: `ARK Space Exploration ETF (ARKX). Actively managed space ETF by Cathie Wood's ARK Invest. Key facts:
- Holds space-adjacent companies as well as pure plays
- Top holdings include Amazon (Project Kuiper), Iridium, Trimble, Kratos
- Controversial: includes non-pure-play space companies like Netflix (uses satellites for content)
- ~$200M AUM
- Actively managed, higher turnover than passive ETFs`,

  SATS: `EchoStar (SATS). Satellite technology and services company. Key facts:
- Owns Hughes Network Systems: satellite internet provider
- DISH Network merger completed 2024, combined entity
- Significant debt load
- Competes with Starlink on rural broadband
- Revenue declining as Starlink takes market share`,

  VOYG: `Voyager Technologies (VOYG). Space and defense systems company. Key facts:
- Makes components and systems for spacecraft and defense applications
- Government and commercial customers
- Recent IPO, growing revenue
- Beneficiary of increased DoD space spending`,

  YSS: `York Space Systems (YSS). Satellite manufacturer. Key facts:
- S-CLASS satellite bus: standardized, mass-produced small satellites
- US Space Force and commercial customers
- Factory-style production approach to drive down costs
- Recent IPO 2025
- Revenue growing on government contracts`,

  TSAT: `Telesat (TSAT). Canadian satellite operator. Key facts:
- Telesat Lightspeed: planned LEO broadband constellation, 198 satellites
- Legacy GEO satellites providing revenue
- Significant financing needed for Lightspeed, still unresolved
- Canadian government customer anchor
- High debt, execution risk on Lightspeed`,

  MNTS: `Momentus (MNTS). In-space transportation and services. Key facts:
- Vigoride space tug: orbital transfer vehicle for last-mile satellite delivery
- Several missions flown with mixed results
- Very small revenue, high burn rate
- Multiple setbacks including regulatory issues with original CEO
- High risk, highly speculative micro-cap`,

  RDW: `Redwire (RDW). Space infrastructure and manufacturing company. Key facts:
- Makes solar arrays, structure, 3D printing hardware for spacecraft
- ISS customer: multiple payloads and experiments aboard station
- UK expansion: acquired several European space companies
- Revenue ~$250M annual, growing
- Government and commercial customers`,

  SATL: `Satellogic (SATL). Earth observation company. Key facts:
- Sub-meter resolution satellites, high revisit rate
- South American company (Uruguay/Argentina), listed on Nasdaq
- Government and commercial customers globally
- Revenue small, cash constrained
- High risk, speculative`,

  GILT: `Gilat Satellite Networks (GILT). Satellite ground systems and VSAT. Key facts:
- Makes VSAT terminals, network equipment, satellite broadband infrastructure
- Customers: telecom operators, governments, rural broadband
- Israeli company, listed on Nasdaq
- Profitable, consistent but slow-growing
- Revenue ~$250M annual`,

  MARS: `Roundhill Space & Tech ETF (MARS). Space and technology ETF. Key facts:
- Holds mix of space and tech companies
- Includes both large and small cap exposure
- Relatively new ETF`,

  ROKT: `SPDR Kensho Final Frontiers ETF (ROKT). Space and ocean exploration ETF. Key facts:
- Tracks Kensho Final Frontiers index
- Holds companies in space, ocean and polar exploration
- Includes defense, satellite, and launch companies
- ~$100M AUM`,
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
  const context = getContext(ticker);

  const prompt = `You are a retail investor posting on a stock discussion forum.

Here is accurate background information about ${ticker}:
${context}

Write a short forum post (title + optional body) about ${ticker}.

Rules:
- Title: 5-12 words, casual and opinionated, like a real Reddit post
- Body: 0-3 sentences max. Sometimes leave blank — title-only posts are fine.
- Only reference facts from the context above — do not invent numbers or events
- Sound like a real retail investor: mix of sharp takes, casual language, occasional typos fine
- Can be bullish, bearish, neutral, or just a question
- No hashtags. Occasional emoji in body only.
- Output ONLY valid JSON: {"title":"...","body":"..."} — nothing else, no markdown fences`;

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
  const context = getContext(ticker);

  const existingComments = (thread.comments || [])
    .slice(-3)
    .map(c => `${c.author}: ${c.body}`)
    .join("\n");

  const prompt = `You are a retail investor commenting on a stock forum thread about ${ticker}.

Here is accurate background information about ${ticker}:
${context}

Thread title: "${thread.title}"
${thread.body ? `Thread body: "${thread.body}"` : ""}
${existingComments ? `Recent comments:\n${existingComments}` : ""}

Write ONE short comment replying to this thread.

Rules:
- 1-3 sentences MAX. Often just 1. Sometimes just 2-6 words ("agreed", "this exactly", "lol same", "not sure about that").
- Only reference facts from the context above — do not invent numbers or events
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
