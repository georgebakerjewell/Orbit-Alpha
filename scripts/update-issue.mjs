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

// Beehiiv puts the hook line as plain text right after "MARKET OVERVIEW</span><br>",
// inside the same <h3> tag, up to the closing </h3>.
function extractHeadline(html) {
  if (!html) return null;
  const match = html.match(/MARKET\s+OVERVIEW<\/span><br\s*\/?>([\s\S]*?)<\/h3>/i);
  if (!match) return null;
  let text = decodeEntities(match[1].replace(/<[^>]+>/g, ""));
  // Strip a leading emoji (e.g. 🌎) and the space after it, if present.
  text = text.replace(/^[\p{Extended_Pictographic}\u200d\uFE0F\s]+/u, "").trim();
  if (!text || text.length < 8 || text.length > 400) return null;
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
  const fallback = `Issue #${issueNum} is live — read the full breakdown.`;
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
    console.log("Note: fell back to generic headline — the MARKET OVERVIEW pattern wasn't found as expected.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
