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

const USERNAMES = [
  "NeutronStar99", "Apogee_Al", "OrbitalOliver", "Perihelion_Pete",
  "VelocityVince", "StarLinkKiller", "GeoOrbitGuy", "LunarLong",
  "BuyTheDip2049", "ShotgunShorts", "BearInOrbit", "RealTalkRocket",
  "GovContractGuru", "TechnicalTerry", "NeutronWatch", "anonymous",
  "anonymous", "anonymous", "anonymous",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickAction() {
  const r = Math.random();
  if (r < 0.25) return "new_thread";
  if (r < 0.85) return "new_comment";
  return "vote_bump";
}

// ── Redis helper — matches threads.js exactly ─────────────────────────────────
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
  const raw = await redis("GET", [`threads:${ticker}`]);
  if (!raw) return [];
  try {
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
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
  const prompt = `You are a retail investor posting on a stock forum about ${ticker}.
Write a SHORT forum post (title + optional body) about ${ticker} stock.

Rules:
- Title: 5-12 words, casual, opinionated, like a real Reddit post
- Body: 0-3 sentences max. Sometimes leave it blank.
- Sound like a real person: mix of informed takes, casual vibes, occasional typos
- Mix of bullish, bearish, neutral, or just asking a question
- Reference real things: earnings, valuation, competitors, catalysts
- DO NOT use hashtags or emojis except occasionally in body
- Output ONLY valid JSON: {"title":"...","body":"..."} — nothing else, no markdown`;

  const raw = await callClaude(prompt);
  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { parsed = JSON.parse(match[0]); } catch { return null; }
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
  if (threads.length === 0) return null;

  const pool = threads.slice(0, Math.min(5, threads.length));
  const thread = randomFrom(pool);
  const author = randomFrom(USERNAMES);

  const existingComments = (thread.comments || [])
    .slice(-3)
    .map(c => `${c.author}: ${c.body}`)
    .join("\n");

  const prompt = `You are a retail investor commenting on a stock forum thread about ${ticker}.

Thread title: "${thread.title}"
${thread.body ? `Thread body: "${thread.body}"` : ""}
${existingComments ? `Recent comments:\n${existingComments}` : ""}

Write ONE short comment replying to this thread.

Rules:
- 1-3 sentences MAX. Often just 1. Sometimes just 2-5 words ("agreed", "this", "lol same").
- Sound like a real person: casual, sometimes slightly off-topic, occasional typos ok
- Mix of: sharp insight, basic reaction, dumb question, mild disagreement, one-liner
- Do NOT use hashtags
- Output ONLY the comment text — nothing else, no quotes, no JSON`;

  const comment = await callClaude(prompt);
  if (!comment || comment.length > 300) return null;

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
  if (threads.length === 0) return null;

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
  const action = pickAction();

  let result;
  try {
    if (action === "new_thread")  result = await postNewThread(ticker);
    if (action === "new_comment") result = await postComment(ticker);
    if (action === "vote_bump")   result = await bumpVotes(ticker);
  } catch (e) {
    console.error("Cron error:", e);
    return res.status(500).json({ error: e.message });
  }

  console.log("Cron result:", result);
  return res.status(200).json({ ok: true, result });
}
