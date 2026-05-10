const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, args) {
  const res = await fetch(`${REDIS_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
  });
  const data = await res.json();
  return data.result;
}

function parseThreads(raw) {
  if (!raw) return [];
  try {
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    // Handle double-encoded JSON
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const key = `threads:${ticker}`;

  if (req.method === "GET") {
    try {
      const raw = await redis("GET", [key]);
      return res.status(200).json(parseThreads(raw));
    } catch (e) {
      console.error("GET error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const raw = await redis("GET", [key]);
      const threads = parseThreads(raw);
      const { type, author, thread, comment, threadId, targetId, dir } = req.body;

      if (type === "thread") {
        threads.unshift({
          id: `t${Date.now()}`,
          author: author || "anonymous",
          time: new Date().toISOString(),
          title: (thread?.title || "").slice(0, 200),
          body: (thread?.body || "").slice(0, 1000),
          upvotes: 0,
          downvotes: 0,
          comments: [],
        });
      }

      if (type === "comment") {
        const t = threads.find(t => t.id === threadId);
        if (t) {
          t.comments.push({
            id: `c${Date.now()}`,
            author: author || "anonymous",
            time: new Date().toISOString(),
            body: (comment || "").slice(0, 500),
            upvotes: 0,
            downvotes: 0,
          });
        }
      }

      if (type === "vote") {
        for (const t of threads) {
          if (t.id === targetId) {
            if (dir === "up") t.upvotes += 1;
            if (dir === "down") t.downvotes += 1;
            break;
          }
          for (const c of t.comments || []) {
            if (c.id === targetId) {
              if (dir === "up") c.upvotes += 1;
              if (dir === "down") c.downvotes += 1;
              break;
            }
          }
        }
      }

      await redis("SET", [key, JSON.stringify(threads)]);
      return res.status(200).json(threads);
    } catch (e) {
      console.error("POST error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
