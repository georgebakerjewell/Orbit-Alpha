// api/cron/fake-activity.js
// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron Job — runs on a schedule and posts fake threads/comments
// to random tickers to simulate organic forum activity.
//
// Setup:
//   1. Add to vercel.json:
//      { "crons": [{ "path": "/api/cron/fake-activity", "schedule": "0 9,13,17,21 * * *" }] }
//      (runs at 9am, 1pm, 5pm, 9pm UTC every day)
//
//   2. Set env vars in Vercel dashboard:
//      ANTHROPIC_API_KEY=sk-ant-...
//      UPSTASH_REDIS_REST_URL=https://...
//      UPSTASH_REDIS_REST_TOKEN=...
//      CRON_SECRET=any-random-string   (optional but recommended)
//
//   3. Deploy. Done.
// ─────────────────────────────────────────────────────────────────────────────

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
  "anonymous", "anonymous", "anonymous", // weight anonymous higher
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Decide what action to take this run
function pickAction() {
  const r = Math.random();
  if (r < 0.25) return "new_thread";    // 25% chance: post a new thread
  if (r < 0.85) return "new_comment";   // 60% chance: comment on existing thread
  return "vote_bump";                    // 15% chance: just bump some vote counts
}

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

async function getThreads(ticker) {
  const res = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/threads:${ticker}`,
    { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } }
  );
  const { result } = await res.json();
  if (!result) return [];
  try { return JSON.parse(result); } catch { return []; }
}


async function saveThreads(ticker, threads) {
  await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/set/threads:${ticker}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
      body: JSON.stringify(["SET", `threads:${ticker}`, JSON.stringify(threads)]),
    }
  );
}

// ── Action: post a new thread ─────────────────────────────────────────────────
async function postNewThread(ticker) {
  const author = randomFrom(USERNAMES);
  const prompt = `You are a retail investor posting on a stock forum about ${ticker}. 
Write a SHORT forum post (title + optional body) about ${ticker} stock. 

Rules:
- Title: 5-12 words, casual, opinionated, like a real Reddit post
- Body: 0-3 sentences max. Sometimes leave it blank (just a title post).
- Sound like a real person: mix of informed takes, casual vibes, occasional typos
- Mix of bullish, bearish, neutral, or just asking a question
- Reference real things: earnings, launch cadence, valuation, competitors, catalysts
- DO NOT use hashtags or emojis except occasionally in body
- Output ONLY valid JSON: {"title":"...","body":"..."} — nothing else, no markdown`;

  const raw = await callClaude(prompt);
  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    // fallback if Claude adds extra text
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
  const updated = [thread, ...threads];
  await saveThreads(ticker, updated);
  return { action: "new_thread", ticker, title: thread.title };
}

// ── Action: post a comment on an existing thread ──────────────────────────────
async function postComment(ticker) {
  const threads = await getThreads(ticker);
  if (threads.length === 0) return null;

  // pick a recent thread (bias towards first 5)
  const pool = threads.slice(0, Math.min(5, threads.length));
  const thread = randomFrom(pool);
  const author = randomFrom(USERNAMES);

  // show Claude existing comments for context
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

// ── Action: bump some vote counts (simulates organic voting) ─────────────────
async function bumpVotes(ticker) {
  const threads = await getThreads(ticker);
  if (threads.length === 0) return null;

  const updated = threads.map(thread => {
    // randomly upvote the thread itself
    const threadUpBump = Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
    // randomly upvote some comments
    const updatedComments = (thread.comments || []).map(c => ({
      ...c,
      upvotes: c.upvotes + (Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0),
    }));
    return { ...thread, upvotes: thread.upvotes + threadUpBump, comments: updatedComments };
  });

  await saveThreads(ticker, updated);
  return { action: "vote_bump", ticker };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Basic auth check (Vercel sends this header for cron jobs)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
