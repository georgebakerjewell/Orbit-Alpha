const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  const res = await fetch(`${REDIS_URL}/${command}/${args.map(a => encodeURIComponent(JSON.stringify(a))).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  if (req.method === "GET") {
    try {
      const raw = await redis("get", `threads:${ticker}`);
      const threads = raw ? JSON.parse(raw) : [];
      return res.status(200).json(threads);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { type, thread, comment, threadId } = req.body;

      const raw = await redis("get", `threads:${ticker}`);
      const threads = raw ? JSON.parse(raw) : [];

      if (type === "thread") {
        const newThread = {
          id: `t${Date.now()}`,
          author: "anonymous",
          time: new Date().toISOString(),
          title: thread.title?.slice(0, 200) || "",
          body: thread.body?.slice(0, 1000) || "",
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
            author: "anonymous",
            time: new Date().toISOString(),
            body: comment?.slice(0, 500) || "",
            upvotes: 0,
            downvotes: 0,
          });
        }
      }

      if (type === "vote") {
        const { targetId, dir } = req.body;
        for (const t of threads) {
          if (t.id === targetId) {
            if (dir === "up") t.upvotes += 1;
            if (dir === "down") t.downvotes += 1;
            break;
          }
          for (const c of t.comments) {
            if (c.id === targetId) {
              if (dir === "up") c.upvotes += 1;
              if (dir === "down") c.downvotes += 1;
              break;
            }
          }
        }
      }

      await redis("set", `threads:${ticker}`, JSON.stringify(threads));
      return res.status(200).json(threads);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
