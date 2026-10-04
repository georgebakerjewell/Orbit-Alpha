import { readFileSync, writeFileSync } from "node:fs";

const RSS_URL = "https://rss.beehiiv.com/feeds/cthncj24W4.xml";
const ISSUES_PATH = new URL("../src/issues.json", import.meta.url);

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(re);
  if (!match) return "";
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();
  return value;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Headline = the hook line under the MARKET OVERVIEW heading (e.g. "A Sector Rally Meets a Wall
// of Unlocking Shares"). Beehiiv's markup around it has changed over time, so rather than match
// one exact pattern, take the first block of text after the heading. If that block is a long
// paragraph (no separate hook line), use its first sentence instead.
function extractHeadline(html) {
  if (!html) return null;
  const at = html.search(/MARKET\s+OVERVIEW/i);
  if (at === -1) return null;
  const after = html.slice(at).replace(/^MARKET\s+OVERVIEW/i, "").slice(0, 4000);
  const blocks = after
    .split(/<\/(?:h[1-6]|p|div|li)>|<br\s*\/?>/i)
    .map((b) => decodeEntities(b.replace(/<[^>]+>/g, " ")))
    .map((b) => b.replace(/^[\p{Extended_Pictographic}\u200d\uFE0F\s]+/u, "").trim())
    .filter((b) => b.length >= 8);
  if (!blocks.length) return null;
  let text = blocks[0];
  if (text.length > 160) text = (text.match(/^.{20,200}?[.!?](?=\s|$)/) || [text.slice(0, 157) + "..."])[0];
  return text;
}

async function main() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  const firstItemMatch = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
  if (!firstItemMatch) throw new Error("No <item> found in RSS feed");
  const item = firstItemMatch[1];

  const title = decodeEntities(extractTag(item, "title"));
  const link = extractTag(item, "link").trim();
  const pubDate = extractTag(item, "pubDate");
  const rawContent = extractTag(item, "content:encoded");
  const rawDescription = extractTag(item, "description");
  const bodyHtml = rawContent || rawDescription;

  const issueMatch = title.match(/Issue\s*#?\s*(\d+)/i);
  if (!issueMatch) {
    console.log("Could not find an issue number in the RSS title:", title);
    return;
  }
  const issueNum = parseInt(issueMatch[1], 10);

  const issues = JSON.parse(readFileSync(ISSUES_PATH, "utf8"));
  const currentTop = issues[0]?.issue ?? 0;

  if (issueNum <= currentTop) {
    console.log(`No new issue (RSS has #${issueNum}, repo already has #${currentTop}).`);
    return;
  }

  const dateFormatted = pubDate
    ? new Date(pubDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  const extractedHeadline = extractHeadline(bodyHtml);
  const fallback = `Issue #${issueNum}: the week in space stocks`;
  const headline = extractedHeadline || fallback;

  const newEntry = {
    issue: issueNum,
    date: dateFormatted,
    headline,
    summary: headline,
    url: link,
    live: true,
  };

  issues.unshift(newEntry);
  writeFileSync(ISSUES_PATH, JSON.stringify(issues, null, 2) + "\n");
  console.log(`Added Issue #${issueNum}: "${headline}"`);
  if (!extractedHeadline) {
    console.log("Note: fell back to a generic headline because no MARKET OVERVIEW text was found.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
