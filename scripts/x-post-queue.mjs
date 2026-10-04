// Posts every tweet waiting in x-queue/pending/*.txt to X, then moves it to x-queue/posted/.
// File format: the tweet text. Each line "--- reply ---" starts another tweet, posted as a
// threaded reply to the previous one (so a file can hold a short thread). DRY_RUN=1 prints without posting.
import { readdirSync, readFileSync, renameSync, appendFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";

const env = process.env;
const DRY = env.DRY_RUN === "1";
const DIR = "x-queue/pending";
const files = readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort();
if (!files.length) { console.log("Queue empty."); process.exit(0); }
if (!DRY && !(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_SECRET)) {
  console.error("Missing X API secrets."); process.exit(1);
}

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
function oauthHeader(method, url) {
  const o = {
    oauth_consumer_key: env.X_API_KEY, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0",
  };
  const params = Object.keys(o).sort().map((k) => `${enc(k)}=${enc(o[k])}`).join("&");
  const base = [method, enc(url), enc(params)].join("&");
  o.oauth_signature = createHmac("sha1", `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_SECRET)}`).update(base).digest("base64");
  return "OAuth " + Object.keys(o).sort().map((k) => `${enc(k)}="${enc(o[k])}"`).join(", ");
}
async function tweet(body) {
  const url = "https://api.x.com/2/tweets";
  const res = await fetch(url, { method: "POST", headers: { Authorization: oauthHeader("POST", url), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json.data.id;
}

let failed = false;
for (const f of files) {
  const parts = readFileSync(`${DIR}/${f}`, "utf8").split(/^--- reply ---$/m).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) { console.log(`${f}: empty, skipped`); continue; }
  const bad = parts.find((p) => p.includes("\u2014") || p.length > 280);
  if (bad) { console.error(`${f}: a tweet has an em dash or is over 280 characters, not posted`); failed = true; continue; }
  console.log(`--- ${f} ---\n${parts.join("\n[reply]\n")}`);
  if (DRY) continue;
  try {
    let log = `\n\n# posted ${new Date().toISOString()}`, prev;
    for (const text of parts) {
      prev = await tweet(prev ? { text, reply: { in_reply_to_tweet_id: prev } } : { text });
      log += `\n# https://x.com/i/status/${prev}`;
      console.log(`Posted: https://x.com/i/status/${prev}`);
    }
    appendFileSync(`${DIR}/${f}`, log);
    renameSync(`${DIR}/${f}`, `x-queue/posted/${f}`);
  } catch (e) { console.error(`${f}: ${e.message}`); failed = true; }
}
if (failed) process.exit(1);
