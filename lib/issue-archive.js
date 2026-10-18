// Turns the Beehiiv RSS feed into the on-site newsletter archive (/newsletter/issue-N).
// Each issue is published word for word; only Beehiiv's styling is removed and "(RKLB)"-style
// tickers are linked to their stock pages. Used by scripts/update-issue.mjs.
import { COVERED } from "./roster.js";

const ALLOWED = new Set(["p", "h2", "h3", "h4", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "b", "strong", "i", "em", "a", "br", "hr"]);
const RENAME = { h1: "h2", h5: "h4", h6: "h4" };

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const textOf = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  if (!m) return "";
  const v = m[1].trim();
  return (v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/) || [null, v])[1].trim();
}

// Link "(RKLB)" and "(MDA.TO)" to the stock page, outside existing links only.
function linkTickers(html, found) {
  return html.split(/(<a\b[\s\S]*?<\/a>)/i).map((part) => part.startsWith("<a") ? part : part.split(/(<[^>]+>)/).map((seg) => seg.startsWith("<") ? seg
    : seg.replace(/\(([A-Z]{2,5})(?:\.TO)?\)/g, (m, t) => {
      if (!COVERED[t]) return m;
      found.add(t);
      return `(<a href="/stocks/${t.toLowerCase()}">${m.slice(1, -1)}</a>)`;
    })).join("")).join("");
}

export function cleanIssueHtml(raw) {
  let html = raw
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div class=['"]beehiiv__footer['"][\s\S]*$/i, "") // "Powered by beehiiv" footer
    .replace(/<img[^>]*>/gi, "");
  // Beehiiv section titles are big styled paragraphs ("Market Overview", "Launch Watch"): make them headings.
  html = html.replace(/<p\b[^>]*>\s*<span[^>]*font-size:\s*1\.5rem[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/span>\s*<\/p>/gi, "<h2>$1</h2>");
  // Keep only simple tags, with no attributes except link targets.
  html = html.replace(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi, (m, close, name, attrs) => {
    name = RENAME[name.toLowerCase()] || name.toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (close) return `</${name}>`;
    if (name === "a") {
      const href = (attrs.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
      if (!href || !/^https?:\/\//.test(href)) return "<a>";
      // Links back to Orbit Alpha become plain site links (no Beehiiv tracking tags, same tab).
      const own = href.match(/^https?:\/\/(?:www\.)?orbitalpha\.cloud(\/[^?#]*)?/i);
      return own ? `<a href="${own[1] || "/"}">` : `<a href="${href}" target="_blank" rel="noopener">`;
    }
    return `<${name}>`;
  });
  html = html
    .replace(/<(td|th)>\s*<p>([\s\S]*?)<\/p>\s*<\/\1>/g, "<$1>$2</$1>") // table cells don't need paragraphs
    .replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g, "<li>$1</li>")
    .replace(/<p>\s*<b>\s*OrbitAlpha\s*<\/b>\s*<\/p>/g, "") // sign-off line above the disclaimer
    .replace(/<(p|b|i|h2|h3|h4)>\s*<\/\1>/g, "")
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  const tickers = new Set();
  html = linkTickers(html, tickers);
  return { html, tickers: [...tickers] };
}

// Every issue in the feed: { issue, date (YYYY-MM-DD), title, url, description, tickers, html }.
// titleFor(issueNumber) supplies the headline already shown on the site, when there is one.
export function parseFeed(xml, titleFor = () => null) {
  return [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const n = Number((decode(tag(item, "title")).match(/Issue\s*#?\s*(\d+)/i) || [])[1]);
    if (!n) return null;
    const { html, tickers } = cleanIssueHtml(tag(item, "content:encoded") || tag(item, "description"));
    const pub = new Date(tag(item, "pubDate"));
    const firstPara = (html.match(/<p>([\s\S]*?)<\/p>/g) || []).map(textOf).find((t) => t.length > 80) || "";
    const description = firstPara.length > 155 ? firstPara.slice(0, 155).replace(/\s+\S*$/, "") + "..." : firstPara;
    return {
      issue: n,
      date: isNaN(pub) ? null : pub.toISOString().slice(0, 10),
      title: titleFor(n) || `Orbit Alpha Issue ${n}`,
      url: tag(item, "link").trim(),
      description,
      tickers,
      html,
    };
  }).filter(Boolean).sort((a, b) => b.issue - a.issue);
}
