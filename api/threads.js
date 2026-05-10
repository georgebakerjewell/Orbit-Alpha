const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  return JSON.parse(data.result);
}

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  });
  return res.json();
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
      const threads = await redisGet(key);
      return res.status(200).json(threads || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const threads = (await redisGet(key)) || [];
      const { type, author, thread, comment, threadId, targetId, dir } = req.body;

      if (type === "thread") {
        const newThread = {
          id: `t${Date.now()}`,
          author: author || "anonymous",
          time: new Date().toISOString(),
          title: (thread?.title || "").slice(0, 200),
          body: (thread?.body || "").slice(0, 1000),
          upvotes: 0,
          downvotes: 0,
          comments: [],
        };
        threads.unshift(newThread);
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

      await redisSet(key, threads);
      return res.status(200).json(threads);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
