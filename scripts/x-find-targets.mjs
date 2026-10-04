// Searches X (recent search, last few hours) for popular posts about the roster's cashtags
// and writes a ranked list plus live quotes to out/latest.json for the reply-drafting task.
// Env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET, HOURS (default 8), MAX (default 20).
import { writeFileSync, mkdirSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";

const env = process.env;
const ROSTER = ["RKLB","ASTS","GSAT","VSAT","PL","KRMN","MDA","FLY","LUNR","TSAT","RDW","BKSY","SATL","SPIR","SPCE","KULR","MNTS","SPCX","YSS","VOYG","HAWK","SIDU","ECHO"];
const HOURS = Number(env.HOURS || 8), MAX = Math.min(100, Math.max(10, Number(env.MAX || 20)));
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function oauthHeader(method, url, query) {
  const o = { oauth_consumer_key: env.X_API_KEY, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0" };
  const all = { ...query, ...o };
  const params = Object.keys(all).map((k) => [enc(k), enc(all[k])]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
  o.oauth_signature = createHmac("sha1", `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_SECRET)}`).update([method, enc(url), enc(params)].join("&")).digest("base64");
  return "OAuth " + Object.keys(o).sort().map((k) => `${enc(k)}="${enc(o[k])}"`).join(", ");
}
async function search(extra) {
  const url = "https://api.x.com/2/tweets/search/recent";
  const query = {
    query: `(${ROSTER.map((t) => "$" + t).join(" OR ")}) -is:retweet -is:reply lang:en${extra}`,
    max_results: String(MAX), sort_order: "relevancy",
    start_time: new Date(Date.now() - HOURS * 3600e3).toISOString().replace(/\.\d+Z$/, "Z"),
    "tweet.fields": "created_at,public_metrics,author_id", expansions: "author_id", "user.fields": "username,name,public_metrics,verified",
  };
  const qs = Object.entries(query).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  const res = await fetch(`${url}?${qs}`, { headers: { Authorization: oauthHeader("GET", url, query) } });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

let r = await search(" min_likes:10");
if (r.status === 400) { console.log("min_likes not accepted, retrying without it"); r = await search(""); }
if (r.status !== 200) { console.log(`::error::X search failed HTTP ${r.status}: ${JSON.stringify(r.json)}`); process.exit(1); }

const users = Object.fromEntries((r.json.includes?.users || []).map((u) => [u.id, u]));
const posts = (r.json.data || []).map((t) => {
  const u = users[t.author_id] || {}, m = t.public_metrics || {};
  return {
    id: t.id, url: `https://x.com/${u.username || "i"}/status/${t.id}`, created_at: t.created_at, text: t.text,
    tickers: ROSTER.filter((s) => new RegExp(`\\$${s}\\b`, "i").test(t.text)),
    likes: m.like_count, reposts: m.retweet_count, replies: m.reply_count, quotes: m.quote_count, impressions: m.impression_count,
    author: { username: u.username, name: u.name, followers: u.public_metrics?.followers_count, verified: u.verified },
    score: (m.like_count || 0) + 2 * (m.retweet_count || 0) + (m.reply_count || 0) + (u.public_metrics?.followers_count || 0) / 1000,
  };
}).filter((p) => p.author.username?.toLowerCase() !== "orbitalphaapp").sort((a, b) => b.score - a.score);

let quotes = null;
try { quotes = (await (await fetch("https://www.orbitalpha.cloud/api/quotes")).json()).quotes; } catch (e) { console.log("quotes fetch failed:", e.message); }

mkdirSync("out", { recursive: true });
writeFileSync("out/latest.json", JSON.stringify({ generated_at: new Date().toISOString(), window_hours: HOURS, posts, quotes }, null, 1));
console.log(`Found ${posts.length} posts; top: ${posts.slice(0, 5).map((p) => "@" + p.author.username + " " + p.likes + "♥").join(", ")}`);
console.log(`::notice::Found ${posts.length} posts. Top: ${posts.slice(0, 5).map((p) => `@${p.author.username} (${p.author.followers} followers, ${p.likes} likes) ${p.tickers.join(",")}`).join(" | ")}`);
