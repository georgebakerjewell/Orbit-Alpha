import { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, Fragment } from "react";
import issues from "./issues.json";
import issueArchive from "./issueArchive.json";
import stories from "./stories.json";
import articlesData from "./articles.json"; // question articles at /articles/<slug> (weekly scheduled task)
import eventsData from "./events.json"; // launch-event pages at /launches/<slug> (maintained by a scheduled task)
import resultsData from "./results.json"; // results-day pages at /results/<slug> (src/results.json, added by a scheduled task) // Orbit Alpha news briefs, newest first (added by the News Post scheduled task) // index of full issues at /newsletter/issue-N (text in public/issues/N.json, written by scripts/update-issue.mjs)
import { COVERED as PROFILES, ETFS, SECTOR_ORDER } from "../lib/roster.js"; // the single list of covered stocks
import { MARKET_PAGES, GUIDES, GUIDE_LIST, GUIDE_GROUPS, GUIDE_CTA, GUIDE_CTA_DEFAULT, guideCta, stockTitle } from "../lib/pagemeta.js";
import { brokersFor, TOOLS, toolHref, brokerHref, anyAffiliate, RISK, DISCLOSURE } from "../lib/affiliates.js"; // /markets titles and descriptions, shared with scripts/prerender.mjs

/* ════════════════════════════════════════════════════════════════════════════
   DATA  (stocks, ETFs and keywords all come from lib/roster.js)
   ════════════════════════════════════════════════════════════════════════════ */
const SUBSCRIBER_COUNT = 400; // shown as "400+" across the site
const SITE_URL = "https://www.orbitalpha.cloud";
const SUBSCRIBE_API = "https://www.orbitalpha.cloud/api/subscribe";

// Base list for the Markets table: covered stocks plus space ETFs. Prices fill in from /api/quotes.
const STOCKS = [
  ...Object.entries(PROFILES).map(([ticker, p]) => ({ ticker, name: p.name, sector: p.sector, type: "stock" })),
  ...Object.entries(ETFS).map(([ticker, e]) => ({ ticker, name: e.name, sector: "ETF", type: "etf", tag: e.tag })),
].map((x) => ({ ...x, price: null, changePct: null, marketCap: null, mktCap: null }));

const SECTORS = ["All", ...SECTOR_ORDER, "ETF"];

// Tags launches with the covered tickers involved (launch provider or payload owner).
const LAUNCH_TAGS = Object.entries(PROFILES).filter(([, p]) => p.launch).map(([t, p]) => [new RegExp(p.launch, "i"), t]);

// Words that tag a news story to a covered stock (matched as whole words).
const COMPANY_KEYWORDS = Object.fromEntries(Object.entries(PROFILES).map(([t, p]) => [t, p.keywords]));

/* ════════════════════════════════════════════════════════════════════════════
   HOOKS (data fetching, routing, storage)
   ════════════════════════════════════════════════════════════════════════════ */
/* ── Routing: real URLs ───────────────────────────────────────────────────────
   /                      home
   /markets[/launches|earnings|contracts|filings]
   /stocks/rklb           stock page (covered tickers in lib/roster.js)
   /news, /newsletter, /about    (/feed redirects to /news)
   Old #hash links (e.g. #feed/news/newsletter in Reddit posts) are redirected. */
const MARKET_TABS = ["stocks", "performance", "launches", "earnings", "contracts", "filings"];

function parsePath(pathname) {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (GUIDES[clean]) return { page: "guide", path: clean };
  const [first, second] = pathname.toLowerCase().split("/").filter(Boolean);
  if (!first) return { page: "home" };
  if (first === "markets") return { page: "markets", tab: MARKET_TABS.includes(second) ? second : "stocks" };
  if (first === "stocks" && second) return { page: "stock", ticker: second.toUpperCase() };
  if (first === "articles" && second) return articlesData.some((a) => a.slug === second) ? { page: "guide", path: `/articles/${second}` } : { page: "notfound" };
  if (first === "launches" && second) return eventsData.some((e) => e.slug === second) ? { page: "guide", path: `/launches/${second}` } : { page: "notfound" };
  if (first === "earnings-preview" && second) return PROFILES[second.toUpperCase()] ? { page: "guide", path: `/earnings-preview/${second}` } : { page: "notfound" };
  if (first === "results" && second) return resultsData.some((r) => r.slug === second) ? { page: "guide", path: `/results/${second}` } : { page: "notfound" };
  if (first === "feed") return { page: "news" };
  if (first === "newsletter" && second) {
    const n = Number((second.match(/^issue-(\d+)$/) || [])[1]);
    return issueArchive.some((x) => x.issue === n) ? { page: "issue", issue: n } : { page: "notfound" };
  }
  if (["news", "newsletter", "about"].includes(first)) return { page: first };
  if (first === "free-pdf") return { page: "freepdf" };
  return { page: "notfound" };
}

function legacyHashPath(hash) {
  const [page, tab, mode] = hash.replace("#", "").split("/");
  if (page === "feed") return mode === "newsletter" ? "/newsletter" : "/news";
  if (page === "markets") return tab && tab !== "stocks" ? `/markets/${tab}` : "/markets";
  if (page === "about") return "/about";
  return "/";
}

function useRouter() {
  const [path, setPath] = useState(() => {
    if (window.location.hash.length > 1) {
      const to = legacyHashPath(window.location.hash);
      window.history.replaceState(null, "", to);
      return to;
    }
    if (window.location.pathname.startsWith("/feed")) {
      window.history.replaceState(null, "", "/news");
      return "/news";
    }
    return window.location.pathname;
  });
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Every in-app click lands at the top of the new page. The jump happens after the new page has
  // rendered (and again on the next frame, once data-driven content settles) so it can't stop partway.
  // Back/forward keep the browser's own scroll restoration.
  const [navCount, setNavCount] = useState(0);
  useLayoutEffect(() => {
    if (!navCount) return;
    window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(id);
  }, [navCount]);
  const navigate = (to) => {
    if (to !== window.location.pathname) window.history.pushState(null, "", to);
    setPath(to);
    setNavCount((n) => n + 1);
  };
  return [parsePath(path), navigate];
}

const NavContext = createContext(() => {});

// Real <a href> links (crawlable, open-in-new-tab works) with in-app navigation on normal clicks.
function Link({ to, children, style, ...rest }) {
  const navigate = useContext(NavContext);
  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={onClick} style={{ color: "inherit", textDecoration: "none", ...style }} {...rest}>{children}</a>;
}

// Page titles and descriptions (scripts/prerender.mjs writes the same values into static HTML for search engines).
function routeMeta(route) {
  const p = PROFILES[route.ticker];
  if (route.page === "stock" && p) return {
    title: stockTitle(route.ticker, p),
    description: p.listing
      ? `${p.name} (${route.ticker}, ${p.listing}) live price, chart, news and launches. ${p.about}`
      : `${p.name} (${route.ticker}) live price, SEC filings, insider trades, government contracts, earnings date and launches. ${p.about}`,
  };
  if (route.page === "guide" && route.path.startsWith("/results/")) {
    const r = resultsData.find((x) => `/results/${x.slug}` === route.path);
    const pr = r && PROFILES[r.ticker];
    if (r && pr) return { title: `${pr.name} (${r.ticker}) ${r.quarter} Results: ${r.headline} | Orbit Alpha`.slice(0, 120), description: r.summary.slice(0, 158) };
  }
  if (route.page === "guide" && route.path.startsWith("/articles/")) {
    const ar = articlesData.find((x) => `/articles/${x.slug}` === route.path);
    if (ar) return { title: `${ar.title} | Orbit Alpha`, description: ar.summary };
  }
  if (route.page === "guide" && route.path.startsWith("/launches/")) {
    const ev = eventsData.find((x) => `/launches/${x.slug}` === route.path);
    if (ev) return { title: `${ev.title} | Orbit Alpha`, description: ev.summary };
  }
  if (route.page === "guide" && route.path.startsWith("/earnings-preview/")) {
    const t = route.path.split("/")[2].toUpperCase();
    return { title: `${PROFILES[t]?.name || t} (${t}) Earnings Preview: Date and What to Watch | Orbit Alpha`, description: `${PROFILES[t]?.name || t} results date, consensus estimate, last quarter's numbers and what to watch.` };
  }
  if (route.page === "guide") return GUIDES[route.path];
  const archived = route.page === "issue" && issueArchive.find((x) => x.issue === route.issue);
  if (archived) return { title: `${archived.title} | Orbit Alpha Issue ${archived.issue}`, description: archived.description };
  const tab = route.tab && route.tab !== "stocks" ? route.tab : null;
  return {
    home: { title: "Orbit Alpha: Space Stocks Newsletter and Live Dashboard", description: "Free weekly newsletter and live dashboard covering every space stock: prices, launches, earnings, SEC filings and government contracts." },
    markets: MARKET_PAGES[tab || ""] || MARKET_PAGES[""],
    news: { title: "Space Stock News, Filings and Contract Wins | Orbit Alpha", description: "Live space stock news, SEC filings, insider trades and government contract wins in one feed, filterable by company." },
    newsletter: { title: "The Orbit Alpha Newsletter | Free Weekly Space Stocks Briefing", description: "Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free." },
    about: { title: "About | Orbit Alpha", description: "What Orbit Alpha is, which space stocks it covers and where its data comes from." },
    freepdf: { title: "Free PDF: Space Stocks 2026, All 30 Listed Space Companies at a Glance | Orbit Alpha", description: "Download Space Stocks 2026 free: every listed space company on one PDF with market cap, revenue, cash runway and next results date. Updated weekly." },
  }[route.page] || { title: "Page not found | Orbit Alpha", description: "" };
}

function useDocumentMeta(route, path) {
  useEffect(() => {
    const { title, description } = routeMeta(route);
    document.title = title;
    const set = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement(selector.startsWith("link") ? "link" : "meta");
        if (selector.startsWith("link")) el.rel = "canonical"; else el.name = "description";
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    set('meta[name="description"]', "content", description);
    set('link[rel="canonical"]', "href", SITE_URL + (path === "/" ? "/" : path));
  }, [path]);
}

/* ── Small JSON fetch hook with an in-memory cache (shared across pages) ───── */
const apiCache = new Map();
function useApi(url) {
  const [state, setState] = useState(() => (apiCache.has(url) ? { data: apiCache.get(url), error: false } : { data: null, error: false }));
  useEffect(() => {
    if (!url) return;
    if (apiCache.has(url)) { setState({ data: apiCache.get(url), error: false }); return; }
    let alive = true;
    setState({ data: null, error: false });
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { apiCache.set(url, d); if (alive) setState({ data: d, error: false }); })
      .catch(() => alive && setState({ data: null, error: true }));
    return () => { alive = false; };
  }, [url]);
  return state;
}

/* ── Prices ─────────────────────────────────────────────────────────────────── */
// Prices show in the currency the stock trades in (European listings: EUR, SEK, pence). Market caps are always US dollars.
const CURRENCY = { USD: ["$", ""], EUR: ["€", ""], CAD: ["C$", ""], GBP: ["£", ""], GBp: ["", "p"], SEK: ["", " kr"] };
const money = (v, cur = "USD") => {
  if (v == null) return "-";
  const [pre, post] = CURRENCY[cur] || ["", ` ${cur}`];
  return `${pre}${v.toFixed(2)}${post}`;
};
const yahooUrl = (t) => `https://finance.yahoo.com/quote/${PROFILES[t]?.yahoo || ETFS[t]?.yahoo || t}`;
const formatMktCap = (v) =>
  !v ? "-"
  : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T`
  : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B`
  : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
  : `$${v}`;

// All live prices in one request (shared across visitors via Vercel's edge cache).
function useLivePrices() {
  const [stocks, setStocks] = useState(STOCKS);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { quotes } = await (await fetch("/api/quotes")).json();
        if (!quotes || !Object.keys(quotes).length) return;
        setStocks((prev) => prev.map((s) => {
          const q = quotes[s.ticker];
          return q ? { ...s, ...q, mktCap: q.marketCap ? formatMktCap(q.marketCap) : null } : s;
        }));
        setLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      } catch (e) {
        console.log("Price fetch error:", e);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return { stocks, lastUpdated, isLive: lastUpdated !== null };
}

// Returns { TICKER: "up" | "down" } for 600ms after a price changes.
function usePriceFlash(stocks) {
  const [flash, setFlash] = useState({});
  const prev = useRef({});
  useEffect(() => {
    const next = {};
    stocks.forEach((s) => {
      const p = prev.current[s.ticker];
      if (p !== undefined && p !== s.price) next[s.ticker] = s.price > p ? "up" : "down";
      prev.current[s.ticker] = s.price;
    });
    if (!Object.keys(next).length) return;
    setFlash(next);
    const t = setTimeout(() => setFlash({}), 600);
    return () => clearTimeout(t);
  }, [stocks]);
  return flash;
}

/* ── Launches: null = loading, [] = none/unavailable ───────────────────────── */
function toLaunch(l) {
  const mission = l.missions?.[0]?.name || l.name || "";
  const text = `${l.provider?.name || ""} ${l.vehicle?.name || ""} ${l.name || ""} ${mission}`;
  return {
    date: l.date_str || "TBD",
    sortDate: l.sort_date || null,
    mission: [l.provider?.name, l.vehicle?.name, mission].filter(Boolean).join(" · "),
    location: l.pad?.location?.name || "",
    status: l.result === 1 ? "SUCCESS" : l.win_open ? "GO" : "TBD",
    tickers: LAUNCH_TAGS.filter(([re]) => re.test(text)).map(([, t]) => t),
    details: l.details || null,
  };
}

function useLaunches() {
  const [launches, setLaunches] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const { result } = await (await fetch("/api/launches")).json();
        const now = Date.now() / 1000;
        setLaunches((result || []).filter((l) => !l.sort_date || l.sort_date > now).map(toLaunch));
      } catch (e) {
        console.log("Launch fetch error:", e);
        setLaunches((prev) => prev || []);
      }
    };
    load();
    const id = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return launches;
}

/* ── News ───────────────────────────────────────────────────────────────────── */
function useNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const [rss, yahoo] = await Promise.allSettled([
        fetch("/api/news?limit=150").then((r) => r.json()),
        fetch(`/api/yahoonews?t=${Date.now()}`).then((r) => r.json()),
      ]);
      const list = (r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []);
      const seen = new Set();
      setItems(
        [...list(yahoo), ...list(rss)]
          .filter((item) => {
            const key = item.title?.toLowerCase().slice(0, 40);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      );
      setLoading(false);
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return { items, loading };
}

/* ── Misc ───────────────────────────────────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  const set = (v) =>
    setValue((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  return [value, set];
}

function isMarketOpen() {
  const est = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const mins = est.getHours() * 60 + est.getMinutes();
  const day = est.getDay();
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

/* ════════════════════════════════════════════════════════════════════════════
   THEME + SHARED UI
   ════════════════════════════════════════════════════════════════════════════ */
/* ── Theme ──────────────────────────────────────────────────────────────────── */
const C = {
  green: "#00ff88", red: "#ff4466", muted: "#aab8c2", blue: "#7eb8ff",
  orange: "#ff9632", yellow: "#ffcc00", bg: "#04060e", text: "#dde1ec", light: "#ccd0d8",
};
// One clean, readable typeface everywhere (Inter). Numbers use tabular figures so prices line up.
const MONO = "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif";
const SYNE = MONO;

const pct = (v, d = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
const signColor = (v) => (v >= 0 ? C.green : C.red);

const sourceStyle = (src) => {
  const map = {
    SpaceNews: ["rgba(0,255,136,0.08)", C.green],
    NASA: ["rgba(126,184,255,0.08)", C.blue],
    "Space.com": ["rgba(255,255,255,0.04)", "#888"],
  };
  const [background, color] = map[src] || ["rgba(255,204,0,0.08)", C.yellow];
  return { fontSize: 9, padding: "2px 8px", borderRadius: 3, flexShrink: 0, background, color };
};

const fmtDate = (d, withTime) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withTime && { hour: "2-digit", minute: "2-digit" }) }) : "";

const inputStyle = {
  flex: 1, minWidth: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff", padding: "10px 14px", borderRadius: 4, fontSize: 12, fontFamily: MONO,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body{font-family:${MONO};font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
    @keyframes flashUp{0%{background:rgba(0,255,136,0.3)}100%{background:transparent}}
    @keyframes flashDown{0%{background:rgba(255,68,102,0.3)}100%{background:transparent}}
    @keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}
    @keyframes ts{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}
    @-webkit-keyframes ts{0%{-webkit-transform:translate3d(0,0,0)}100%{-webkit-transform:translate3d(-50%,0,0)}}
    @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes bk{0%,100%{opacity:1}50%{opacity:0.1}}
    @keyframes sc{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
    *{box-sizing:border-box;margin:0;padding:0}
    input,button,textarea{outline:none}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08)}
    .flash-up{animation:flashUp 0.6s ease}.flash-down{animation:flashDown 0.6s ease}
    .skeleton{background:rgba(255,255,255,0.06);border-radius:3px;animation:shimmer 1.5s infinite}
    .hov:hover{background:rgba(255,255,255,0.03)!important;cursor:pointer}
    .dt{background:none;border:none;cursor:pointer;padding:8px 12px;font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;white-space:nowrap}
    .stg{cursor:pointer;font-size:10px;padding:4px 10px;border-radius:3px;border:1px solid rgba(255,255,255,0.08);transition:all 0.15s;white-space:nowrap}
    .stg:hover{border-color:rgba(0,255,136,0.3);color:#00ff88}
    .mob-only{display:none}
    .oa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
    a.oa-link:hover{text-decoration:underline}
    :root{color-scheme:dark}
    select{background-color:#0d1220!important;color:#e8ecf4!important;border-color:rgba(255,255,255,0.18)!important}
    select option{background-color:#0d1220;color:#e8ecf4}
    .oa-price{text-align:right}
    .oa-issue{font-size:14px;color:${C.light};line-height:1.75}
    .oa-issue p{margin:0 0 14px}
    .oa-issue h2{font-family:${SYNE};font-size:20px;font-weight:700;color:#fff;margin:34px 0 12px;line-height:1.3}
    .oa-issue h3,.oa-issue h4{font-size:15px;font-weight:700;color:#fff;margin:22px 0 8px}
    .oa-issue b,.oa-issue strong{color:#fff}
    .oa-issue ul,.oa-issue ol{padding-left:20px;margin:0 0 14px}
    .oa-issue li{margin-bottom:6px}
    .oa-issue a{color:${C.green};text-decoration:none}
    .oa-issue a:hover{text-decoration:underline}
    .oa-issue hr{border:0;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0}
    .oa-issue table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:12.5px;display:block;overflow-x:auto}
    .oa-issue th,.oa-issue td{text-align:left;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap}
    .oa-issue th{color:${C.muted};font-weight:500}
    .oa-guide-page h1{font-family:${SYNE};font-size:clamp(26px,4.5vw,36px);font-weight:800;color:#fff;line-height:1.2;margin:0 0 18px}
    .oa-guide-page table{display:table;width:100%;white-space:normal}
    .oa-guide-page td,.oa-guide-page th{white-space:normal}
    @media(max-width:700px){.oa-guide-page table{display:block}.oa-guide-page td,.oa-guide-page th{white-space:nowrap}}
    .oa-issue .oa-callout{border:1px solid rgba(0,255,136,0.25);background:rgba(0,255,136,0.04);border-radius:10px;padding:14px 16px 2px;margin:0 0 20px}
    .oa-issue ol li b{color:#fff}
    .oa-issue .oa-updated{font-size:11px;color:${C.muted};margin:-8px 0 14px;letter-spacing:0.03em}
    .oa-issue .oa-answer{border-left:3px solid ${C.green};background:rgba(0,255,136,0.04);padding:12px 16px 1px;margin:0 0 22px;border-radius:0 8px 8px 0}
    .oa-issue .oa-answer p{color:#fff;font-size:14.5px}
    .oa-issue .oa-brokers{border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px 2px;margin:4px 0 22px;background:rgba(255,255,255,0.02)}
    .oa-issue .oa-brokers ul{margin-bottom:8px}
    .oa-next{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
    @media (max-width:640px){.oa-next{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.oa-next>a{flex:0 0 72%;scroll-snap-align:start}}
    .oa-hub-lead{font-size:14px!important;max-width:680px}
    .oa-hub-sub{color:${C.muted}!important;margin-top:-4px!important;font-size:12.5px!important}
    .oa-hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin:12px 0 30px}
    .oa-issue a.oa-card{display:block;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;background:rgba(255,255,255,0.02);text-decoration:none;color:${C.light};transition:border-color .15s,background .15s}
    .oa-issue a.oa-card:hover{border-color:rgba(0,255,136,0.4);background:rgba(0,255,136,0.04)}
    .oa-issue a.oa-card.feat{border-color:rgba(0,255,136,0.3);background:rgba(0,255,136,0.05)}
    .oa-card b{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#fff;font-size:14px;font-weight:600;margin-bottom:6px;line-height:1.35}
    .oa-card b i{font-style:normal;font-size:10px;font-weight:600;color:${C.green};border:1px solid rgba(0,255,136,0.35);border-radius:20px;padding:1px 8px;letter-spacing:.02em}
    .oa-card span{display:block;font-size:12.5px;line-height:1.5;color:${C.muted}}
    .oa-guide-list{list-style:none;padding-left:0!important}
    .oa-guide-list li{margin-bottom:14px!important;color:${C.muted}}
    .oa-guide-list li a{font-weight:600}
    .oa-issue .oa-note{font-size:11.5px;color:${C.muted}}
    .oa-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .oa-news-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:28px;align-items:start}
    @media(max-width:860px){.oa-news-grid{grid-template-columns:1fr}}
    .oa-tile{transition:filter 0.15s}.oa-tile:hover{filter:brightness(1.25);z-index:1}
    .oa-launch{transition:background 0.15s}.oa-launch:hover{background:rgba(255,255,255,0.03)!important}
    .oa-tab:hover{border-color:rgba(0,255,136,0.35)!important;background:rgba(0,255,136,0.05)!important}
    .oa-tabs::-webkit-scrollbar{height:0}
    @media(max-width:600px){.oa-tabs{flex-wrap:wrap;overflow-x:visible!important}.oa-tab{flex:1 1 calc(50% - 4px)!important;min-width:0!important;padding:8px 12px!important}.oa-price{text-align:left}.oa-peer-name,.oa-peer-hi{display:none}.desk-only{display:none!important}.mob-only{display:block!important}}
  `}</style>
);

/* ── Small components ───────────────────────────────────────────────────────── */
const Skeleton = ({ w, h, style }) => <div className="skeleton" style={{ width: w, height: h, ...style }} />;

function Sparkline({ data, positive, currency }) {
  const [hover, setHover] = useState(null);
  if (!data?.length) return <div style={{ width: 72, height: 28 }} />;
  const w = 72, h = 28;
  const min = Math.min(...data), range = Math.max(...data) - min || 1;
  const x = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - ((v - min) / range) * h;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const color = positive ? C.green : C.red;
  const gid = `g${positive ? 1 : 0}`;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width={w} height={h} style={{ overflow: "visible", cursor: "crosshair" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const i = Math.round(((e.clientX - e.currentTarget.getBoundingClientRect().left) / w) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} y1={0} x2={x(hover)} y2={h} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
            <circle cx={x(hover)} cy={y(data[hover])} r="2.5" fill={color} />
          </>
        )}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)", background: "#0a0f1e", border: `1px solid ${color}`, borderRadius: 4, padding: "3px 8px", fontSize: 10, color: "#fff", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 99 }}>
          {money(data[hover], currency)}<span style={{ color: C.muted, marginLeft: 4 }}>D{hover + 1}</span>
        </div>
      )}
    </div>
  );
}

const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 37 + 5) % 100, y: (i * 53 + 8) % 100, size: [1.8, 1.2, 1][i % 3], opacity: [0.18, 0.14, 0.1][i % 3],
}));

const Stars = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
    {STARS.map((st, i) => (
      <div key={i} style={{ position: "absolute", left: `${st.x}%`, top: `${st.y}%`, width: st.size, height: st.size, borderRadius: "50%", background: "#fff", opacity: st.opacity }} />
    ))}
  </div>
);

function TickerStrip({ stocks }) {
  const items = stocks.filter((s) => s.price != null);
  // Safari works out the scroll distance when the animation starts and never updates it. If it starts
  // before prices load (zero width) or after the tab was in the background, the strip sits still.
  // So the animation only starts once prices are in, and restarts when the page becomes visible again.
  const [run, setRun] = useState(0);
  useEffect(() => {
    const restart = () => document.visibilityState === "visible" && setRun((n) => n + 1);
    document.addEventListener("visibilitychange", restart);
    window.addEventListener("pageshow", restart);
    return () => { document.removeEventListener("visibilitychange", restart); window.removeEventListener("pageshow", restart); };
  }, []);
  return (
    <div style={{ overflow: "hidden", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 0", minHeight: 29 }}>
      {items.length > 0 && (
        <div key={`${run}-${items.length}`} style={{ display: "flex", animation: "ts 50s linear infinite", WebkitAnimation: "ts 50s linear infinite", width: "max-content", willChange: "transform" }}>
          {[...items, ...items].map((s, i) => (
            <span key={i} style={{ fontSize: 11, whiteSpace: "nowrap", color: signColor(s.changePct), paddingRight: 32 }}>
              <span style={{ color: C.muted, marginRight: 4 }}>{s.ticker}</span>{money(s.price, s.currency)}
              <span style={{ marginLeft: 3 }}>{s.changePct >= 0 ? "▲" : "▼"}{Math.abs(s.changePct).toFixed(1)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Where visitors came from ─────────────────────────────────────────────── */
// First visit only: remember the channel (from ?ref= / ?utm_source= on our own links, else the
// referring site) so a sign-up days later is still credited to X, Reddit, Google etc.
// First touch (source, medium, landing page) is worked out in index.html before analytics loads.
const firstTouch = () => { try { return JSON.parse(localStorage.getItem("oa_src")) || null; } catch { return null; } };

/* ── Subscribed state ──────────────────────────────────────────────────────── */
// Remembered in this browser once someone subscribes (or arrives from the newsletter),
// so sign-up boxes and the popup stop asking people who are already on the list.
const SUB_KEY = "oa_subscribed";
const isSubscribed = () => { try { return localStorage.getItem(SUB_KEY) === "1"; } catch { return false; } };
function markSubscribed(notify = true) {
  try { localStorage.setItem(SUB_KEY, "1"); } catch {}
  if (notify) window.dispatchEvent(new Event("oa-subscribed"));
}
// live=false: decide once when the component appears, so a form can still show its own "you're subscribed" message.
function useSubscribed(live = true) {
  const [subscribed, setSubscribed] = useState(isSubscribed);
  useEffect(() => {
    if (!live) return;
    const on = () => setSubscribed(true);
    window.addEventListener("oa-subscribed", on);
    return () => window.removeEventListener("oa-subscribed", on);
  }, [live]);
  return subscribed;
}
// Wraps promo boxes that only make sense for people who haven't subscribed yet.
function ForNonSubscribers({ children }) {
  return useSubscribed(false) ? null : children;
}
const LATEST_ISSUE = issues.find((i) => i.live) || null;

/* ── Subscribe ──────────────────────────────────────────────────────────────── */
// source: which signup box (e.g. "home-hero"); follow: ticker for "Follow RKLB" signups.
// Both are recorded in Beehiiv (UTM fields and tags) so you can see which pages convert.
async function subscribe(email, { source = "website", follow } = {}) {
  if (!email?.includes("@")) { alert("Please enter a valid email address."); return false; }
  try {
    const res = await fetch(SUBSCRIBE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source, follow, page: window.location.pathname, origin: firstTouch() }),
    });
    if ((await res.json()).success) {
      markSubscribed();
      window.rdt?.("track", "SignUp");
      window.gtag?.("event", "sign_up", { method: source, ticker: follow });
      window.posthog?.capture?.("sign_up", { signup_box: source, ticker: follow, page: window.location.pathname });
      return true;
    }
  } catch {}
  alert("Something went wrong. Please try again.");
  return false;
}

// Subscriber figure shown on the site (set by hand).
function useSubscriberLabel() {
  return `${SUBSCRIBER_COUNT}+`;
}

// The free sign-up download (printed weekly by .github/workflows/space-stocks-sheet.yml).
const SHEET = { href: "/downloads/space-stocks-2026.pdf", label: "Download Space Stocks 2026 (PDF)", preview: "/downloads/space-stocks-2026-preview.png" };

// The free PDF offer, as a card: preview, what's inside, email box. Used on /free-pdf and the home page.
function LeadMagnet({ source, heading = "Free PDF: Space Stocks 2026" }) {
  const subscribed = useSubscribed();
  return (
    <section style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.35)", background: "rgba(0,255,136,0.04)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24, alignItems: "center", padding: 24 }}>
      <a href={SHEET.preview} target="_blank" rel="noopener" style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", background: "#fff" }}>
        <img src={SHEET.preview} alt="A company page from the Space Stocks 2026 report" loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />
      </a>
      <div>
        <div style={{ fontSize: 11.5, color: C.green, marginBottom: 8 }}>Free with the Sunday newsletter</div>
        <div style={{ fontFamily: SYNE, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>{heading}</div>
        <p style={{ fontSize: 12.5, color: C.light, lineHeight: 1.7, marginBottom: 12 }}>A 34-page report with a full page on each of the {Object.keys(PROFILES).length} listed space companies: key numbers, this year's share price chart, financials, insider trades, government contracts, latest filings and peers, plus a sector overview and results calendar. Updated every week.</p>
        {subscribed
          ? <a href={SHEET.href} target="_blank" rel="noopener" className="oa-link" onClick={() => window.posthog?.capture?.("lead_magnet_download", { from: `${source}-subscriber` })} style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>{SHEET.label}</a>
          : <><SubscribeForm source={source} reward={SHEET} label="Get the PDF" sample={false} style={{ maxWidth: "none", marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: C.muted }}>Enter your email and the download link appears straight away. Unsubscribe in one click.</div></>}
      </div>
    </section>
  );
}

// Visitor's country for the broker list (one request per session; null until known or if blocked).
function useCountry() {
  const [country, setCountry] = useState(() => { try { return sessionStorage.getItem("oa_cc") || null; } catch { return null; } });
  useEffect(() => {
    if (country) return;
    fetch("/api/geo").then((r) => r.json()).then((d) => { if (d?.country) { setCountry(d.country); try { sessionStorage.setItem("oa_cc", d.country); } catch {} } }).catch(() => {});
  }, []);
  return country;
}

function SubscribeForm({ color = C.green, label = "Subscribe", onDone, style, source, follow, sample = true, reward }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const already = useSubscribed(false);
  const started = useRef(false);
  // Someone clicked into the email box: shows which forms people begin but don't finish.
  const onFocus = () => { if (!started.current) { started.current = true; window.posthog?.capture?.("signup_started", { signup_box: source, page: window.location.pathname }); } };
  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await subscribe(email, { source, follow });
    setBusy(false);
    if (ok) { setDone(true); onDone?.(); }
  };
  const sampleLink = sample && LATEST_ISSUE && (
    <a href={LATEST_ISSUE.url} target="_blank" rel="noopener" className="oa-link" onClick={() => window.posthog?.capture?.("sample_issue_click", { from: source })}
      style={{ display: "inline-block", marginTop: 8, fontSize: 10.5, color: C.light, textDecoration: "none", lineHeight: 1.5 }}>
      Read last Sunday's issue first: <span style={{ color: C.green }}>{LATEST_ISSUE.headline}</span>
    </a>
  );
  if (done) return (
    <div style={{ fontSize: 13, color: C.green, padding: "10px 0", lineHeight: 1.7 }}>
      You're subscribed. The next issue arrives on Sunday.
      {reward && <><br /><a href={reward.href} target="_blank" rel="noopener" className="oa-link" onClick={() => window.posthog?.capture?.("lead_magnet_download", { from: source })} style={{ color: "#fff", fontWeight: 700 }}>{reward.label}</a></>}
    </div>
  );
  if (already) return (
    <div style={{ fontSize: 12, color: C.green, padding: "8px 0", ...(style?.margin != null && { margin: style.margin }), ...(style?.marginTop != null && { marginTop: style.marginTop }) }}>
      You're subscribed.{LATEST_ISSUE && <> <a href={LATEST_ISSUE.url} target="_blank" rel="noopener" className="oa-link" style={{ color: C.light, textDecoration: "none" }}>Read the latest issue</a></>}
    </div>
  );
  return (
    <div style={{ maxWidth: 400, ...style }}>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: style?.flexWrap }}>
        <input type="email" inputMode="email" autoComplete="email" required aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={onFocus} placeholder="you@example.com" style={{ ...inputStyle, minWidth: 0, flex: "1 1 160px" }} />
        <button type="submit" disabled={busy} style={{ background: color, color: C.bg, border: "none", padding: "10px 20px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: MONO, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Subscribing…" : label}
        </button>
      </form>
      {sampleLink}
    </div>
  );
}

// A function whose identity never changes but always calls the latest version (for event listeners).
function useCallbackRef(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useRef((...a) => ref.current(...a)).current;
}

// Subscribe popup: shown ONCE per browser. Remembered in localStorage (works like a cookie).
const POPUP_KEY = "oa_popup_seen";

function popupSeen() {
  try { return !!localStorage.getItem(POPUP_KEY); } catch { return true; } // storage blocked: don't nag
}
function markPopupSeen(value) {
  try { localStorage.setItem(POPUP_KEY, value); } catch {}
}

// Shown at most once per browser, never to subscribers, and only once the visitor has shown interest:
// a second page view, reading half of a stock or news page, or moving to leave on desktop. Never in the first 10s.
const POPUP_MIN_MS = 10000;
// Visitors who arrived from an AI assistant this session (set in index.html from the referrer or utm_source).
const AI_NAMES = { chatgpt: "ChatGPT", perplexity: "Perplexity", gemini: "Gemini", claude: "Claude", copilot: "Copilot" };
const aiVisit = () => { const v = typeof window !== "undefined" ? window.__oaVisit : null; return v && v.medium === "ai" ? v : null; };

// The sign-up offer that fits a page: an unlock reminder, a company's results, or null for the PDF default.
function pageOffer(path) {
  const stockT = path.startsWith("/stocks/") ? path.split("/")[2]?.toUpperCase() : null;
  const pageCta = guideCta(path, resultsData.map((r) => ({ ...r, name: PROFILES[r.ticker]?.name })), PROFILES);
  return stockT && PROFILES[stockT]
    ? [`Follow ${PROFILES[stockT].name}`, `${PROFILES[stockT].name}'s results, contracts and big moves in the Sunday briefing, plus the free 34-page PDF on every listed space company.`, stockT, `Follow ${stockT}`]
    : pageCta[2] ? [pageCta[0], `${pageCta[1]} You also get the free 34-page PDF on every listed space company.`, pageCta[2], pageCta[3]] : null;
}

// A slim bar under the header for AI-assistant visitors, shown straight away: they read the answer
// they came to check and leave within about 20 seconds, so a timed pop-up reaches them too late.
function AiWelcomeBar({ path }) {
  const subscribed = useSubscribed();
  const v = aiVisit();
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem("oa_aibar") === "x"; } catch { return false; } });
  const [done, setDone] = useState(false);
  const offer = pageOffer(path);
  const logged = useRef("");
  // Event pages already put their sign-up box straight under the answer (and greet AI visitors there).
  const earlyBox = path === "/spacex-stock/lockup-calendar" || /^\/(results|earnings-preview|articles)\/./.test(path);
  const show = v && !closed && !(subscribed && !done) && path !== "/newsletter" && !earlyBox;
  useEffect(() => { if (show && logged.current !== path) { logged.current = path; window.posthog?.capture?.("ai_bar_shown", { page: path, assistant: v.source }); } }, [show, path]);
  if (!show) return null;
  const close = () => { setClosed(true); try { sessionStorage.setItem("oa_aibar", "x"); } catch {} };
  const who = AI_NAMES[v.source] || "your AI assistant";
  return (
    <div style={{ borderBottom: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.06)", padding: "10px 20px", position: "relative" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
        <div style={{ flex: "1 1 280px", fontSize: 12.5, color: C.light, lineHeight: 1.5, paddingRight: 20 }}>
          <span style={{ color: C.green, fontWeight: 700 }}>Welcome from {who}.</span>{" "}
          {offer ? `${offer[0]}: results and big moves, free by email.` : "This page updates every day. Get the week in space stocks free every Sunday, plus a 34-page PDF on every listed space company."}
        </div>
        <SubscribeForm source="ai-bar" follow={offer?.[2]} reward={SHEET} label={offer ? offer[3] : "Get the PDF"} sample={false} onDone={() => setDone(true)} style={{ flex: "1 1 300px", maxWidth: 420 }} />
      </div>
      <button onClick={close} aria-label="Close" style={{ position: "absolute", top: 6, right: 10, background: "none", border: "none", color: C.muted, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>
  );
}

function SubscribePopup({ path }) {
  const [show, setShow] = useState(false);
  const subscribed = useSubscribed();
  const subscribers = useSubscriberLabel();
  const startedAt = useRef(Date.now());
  const open = useCallbackRef((trigger) => {
    if (show || subscribed || popupSeen() || path === "/newsletter" || aiVisit()) return; // AI visitors get the welcome bar instead
    const wait = POPUP_MIN_MS - (Date.now() - startedAt.current);
    if (wait > 0) { setTimeout(() => open(trigger), wait); return; } // too early: try again once the 10s have passed
    markPopupSeen("shown"); // recorded the moment it appears, so it never shows again even if they just close the tab
    setShow(true);
    window.posthog?.capture?.("popup_shown", { trigger, page: path });
  });
  // Page views this session: the second one triggers it.
  useEffect(() => {
    let n = 1;
    try { n = Number(sessionStorage.getItem("oa_pv") || 0) + 1; sessionStorage.setItem("oa_pv", String(n)); } catch {}
    if (n >= 2) { const t = setTimeout(() => open("second_page"), 1500); return () => clearTimeout(t); }
  }, [path]);
  // Time on site: most visitors read one page for a while and never scroll far or move to leave.
  useEffect(() => { const t = setTimeout(() => { if (document.activeElement?.tagName !== "INPUT") open("time_15s"); }, 15000); return () => clearTimeout(t); }, []); // not while they are typing
  // Reading depth on stock and news pages, and exit intent on desktop.
  useEffect(() => {
    const deep = path.startsWith("/stocks/") || path === "/news";
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (deep && h > 0 && window.scrollY / h >= 0.5) open("scroll_50");
    };
    const onLeave = (e) => { if (!e.relatedTarget && e.clientY <= 0) open("exit_intent"); };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mouseout", onLeave); };
  }, [path]);
  const close = (value) => { setShow(false); markPopupSeen(value); };
  // On pages about one company or event, the pop-up leads with that (an unlock reminder, a company's
  // results) and keeps the PDF as the bonus; elsewhere it leads with the PDF.
  const special = pageOffer(path);
  useEffect(() => { if (show) window.posthog?.capture?.("popup_variant", { variant: special ? "contextual" : "pdf", page: path }); }, [show]);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#0d1220", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 12, padding: 32, maxWidth: 420, width: "100%", position: "relative", animation: "fu 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <button onClick={() => close(Date.now().toString())} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        {!special && <img src={SHEET.preview} alt="Space Stocks 2026 PDF preview" style={{ display: "block", width: "100%", borderRadius: 6, marginBottom: 16, border: "1px solid rgba(255,255,255,0.12)" }} />}
        <div style={{ fontFamily: SYNE, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10, paddingRight: 18 }}>{special ? special[0] : "Free 34-page report on every space stock"}</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>{special ? special[1] : "Get Space Stocks 2026 free when you join the Sunday newsletter: what moved across the stocks we track and why, analyst changes and one company in depth."}</div>
        <SubscribeForm source="popup" follow={special?.[2]} reward={SHEET} label={special ? special[3] : "Get the PDF"} sample={false} style={{ maxWidth: "none", marginBottom: 14 }} />
        <div style={{ fontSize: 11, color: C.muted }}>{subscribers} subscribers. Unsubscribe in one click.</div>
      </div>
    </div>
  );
}

// Mobile only: a slim email bar pinned to the bottom of the screen once the visitor scrolls.
// Hidden for subscribers, on the newsletter page, and for 7 days after it is closed.
const BAR_KEY = "oa_bar_closed";
function MobileSubscribeBar({ path }) {
  const subscribed = useSubscribed();
  const [closed, setClosed] = useState(() => { try { return Date.now() - Number(localStorage.getItem(BAR_KEY) || 0) < 7 * 864e5; } catch { return false; } });
  const [scrolled, setScrolled] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 500);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { if (done) { const t = setTimeout(() => setClosed(true), 20000); return () => clearTimeout(t); } }, [done]);
  const visible = !(closed || (subscribed && !done) || path === "/newsletter" || !scrolled || aiVisit());
  const logged = useRef(false);
  useEffect(() => { if (visible && !logged.current && window.matchMedia?.("(max-width: 600px)").matches) { logged.current = true; window.posthog?.capture?.("mobile_bar_shown", { page: path }); } }, [visible]);
  if (!visible) return null;
  const close = () => { setClosed(true); try { localStorage.setItem(BAR_KEY, String(Date.now())); } catch {} };
  return (
    <div className="mob-only" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9000, background: "rgba(8,12,22,0.97)", borderTop: "1px solid rgba(0,255,136,0.35)", padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -10px 30px rgba(0,0,0,0.5)", animation: "fu 0.25s ease" }}>
      <button onClick={close} aria-label="Close" style={{ position: "absolute", top: 4, right: 8, background: "none", border: "none", color: C.muted, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
      <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginBottom: 7, paddingRight: 24 }}>Free report: a page on every space stock, plus the Sunday newsletter</div>
      <SubscribeForm source="mobile-bar" sample={false} reward={SHEET} label="Get the PDF" onDone={() => setDone(true)} style={{ maxWidth: "none" }} />
    </div>
  );
}

/* ── Shared data display pieces (stock pages, Contracts and Filings tabs) ──── */
const fmtMoney = (v) =>
  !v ? "-" : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`;

// "2026-11-05" -> "Thu 5 Nov 2026" (dates are calendar dates, so format in UTC to avoid off-by-one)
const fmtDay = (iso, opts = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" }) : "";

const cardStyle = { border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px 20px", background: "rgba(255,255,255,0.015)" };

function Card({ title, note, children, style }) {
  return (
    <section style={{ ...cardStyle, ...style }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{title}</h2>
          {note && <span style={{ fontSize: 11, color: C.muted }}>{note}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

const Empty = ({ children }) => <div style={{ fontSize: 12, color: C.muted, padding: "8px 0", lineHeight: 1.6 }}>{children}</div>;

function ListSkeleton({ rows = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <Skeleton w="35%" h={10} style={{ marginBottom: 6 }} /><Skeleton w="80%" h={12} />
    </div>
  ));
}

function TickerChip({ ticker }) {
  const chip = <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: "rgba(0,255,136,0.07)", padding: "2px 7px", borderRadius: 3 }}>{ticker}</span>;
  return PROFILES[ticker] ? <Link to={`/stocks/${ticker.toLowerCase()}`}>{chip}</Link> : chip;
}

const KIND_COLOR = { earnings: C.blue, dilution: C.orange, holder: C.yellow, report: C.light, event: C.light };
function filingColor(f) {
  if (f.direction === "buy") return C.green;
  if (f.direction === "sale") return C.red;
  return KIND_COLOR[f.kind] || C.light;
}

function FilingRow({ f, showTicker }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 10, color: C.muted, width: 78, flexShrink: 0, paddingTop: 2 }}>{fmtDay(f.date, { day: "numeric", month: "short", year: "2-digit" })}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
          {showTicker && <TickerChip ticker={f.ticker} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: filingColor(f) }}>{f.label}</span>
          <span style={{ fontSize: 9, color: "#667" }}>Form {f.form}</span>
        </div>
        {f.owner && (
          <div style={{ fontSize: 11, color: C.muted }}>
            {f.owner}{f.role ? ` (${f.role})` : ""}{f.value ? ` · ${fmtMoney(f.value)}` : ""}
          </div>
        )}
      </div>
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: 10, color: C.blue, flexShrink: 0, textDecoration: "none", paddingTop: 2 }}>SEC filing</a>
    </div>
  );
}

function ContractRow({ a, showTicker }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 10, color: C.muted, width: 78, flexShrink: 0, paddingTop: 2 }}>{fmtDay(a.start, { day: "numeric", month: "short", year: "2-digit" })}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
          {showTicker && <TickerChip ticker={a.ticker} />}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{fmtMoney(a.amount)}</span>
          <span style={{ fontSize: 11, color: C.light }}>{a.subAgency || a.agency}</span>
        </div>
        {a.description && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{a.description}</div>}
      </div>
      {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: 10, color: C.blue, flexShrink: 0, textDecoration: "none", paddingTop: 2 }}>Details</a>}
    </div>
  );
}

function EarningsRow({ e, showTicker = true }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, width: 120 }}>{fmtDay(e.date)}</div>
      {showTicker && <TickerChip ticker={e.ticker} />}
      <span style={{ fontSize: 11, color: C.muted, flex: 1 }}>{PROFILES[e.ticker]?.name || e.name}</span>
      <span style={{ fontSize: 10, color: C.light }}>{e.time}</span>
      {e.epsEst && <span style={{ fontSize: 10, color: C.muted }}>EPS est. {e.epsEst}</span>}
    </div>
  );
}

const SourceNote = ({ children }) => <div style={{ fontSize: 9, color: "#667", marginTop: 10, lineHeight: 1.6 }}>{children}</div>;

/* ════════════════════════════════════════════════════════════════════════════
   HOME PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const MoreLink = ({ to, children }) => (
  <Link to={to} className="oa-link" style={{ fontSize: 11, color: C.green, display: "inline-block", marginTop: 12 }}>{children}</Link>
);

function WhatsNext() {
  const [items, setItems] = useState([]);
  useEffect(() => { fetch("/data/whats-next.json").then((r) => (r.ok ? r.json() : null)).then((d) => setItems(d?.items || [])).catch(() => {}); }, []);
  if (!items.length) return null;
  const when = (x) => x.date ? new Date(x.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : x.when;
  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>What's next</div>
      <div className="oa-next">
        {items.map((x) => (
          <Link key={x.href} to={x.href} className="hov" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, border: "1px solid rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.03)", borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ fontSize: 10.5, color: C.green, fontWeight: 600 }}>{when(x)}</span>
            <span style={{ fontSize: 12.5, color: "#fff", lineHeight: 1.35 }}>{x.label} <span style={{ color: C.muted }}>›</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Home({ news, prices, launches }) {
  const latest = issues[0];
  const subscribers = useSubscriberLabel();
  const filings = useApi("/api/filings");
  const contracts = useApi("/api/contracts");
  const earnings = useApi("/api/earnings");

  const covered = prices.stocks.filter((s) => PROFILES[s.ticker]);
  const signals = buildFeed([], filings.data?.filings || [], contracts.data?.awards || []).filter((i) => i.key_story).slice(0, 6);
  const signalsLoading = !filings.data && !filings.error && !contracts.data && !contracts.error;
  const moveOf = (t) => prices.stocks.find((s) => s.ticker === t)?.changePct;
  const headlines = newsClusters(news.items, Date.now() - 3 * 86_400_000)
    .map((c) => ({ ...c, score: storyScore(c, moveOf) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const nextLaunches = (launches || []).filter((l) => l.tickers.length).slice(0, 3);
  const nextEarnings = Array.isArray(earnings.data) ? earnings.data.slice(0, 4) : [];

  return (
    <div style={{ animation: "fu 0.5s ease", maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
      {/* Hero: newsletter signup first */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 28, alignItems: "center", padding: "44px 0 32px" }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.green, marginBottom: 12 }}>A free newsletter, every Sunday</div>
          <h1 style={{ fontFamily: SYNE, fontSize: "clamp(30px,5.5vw,50px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.02em", color: "#fff", marginBottom: 14 }}>
            Every space stock.<br />One email.
          </h1>
          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.7, marginBottom: 20, maxWidth: 460 }}>
            What moved, why it moved and what's coming next across {Object.keys(PROFILES).length} space stocks, from SpaceX and Rocket Lab to the small caps. Five minutes every Sunday morning.
          </p>
          <SubscribeForm source="home-hero" sample={false} label="Subscribe + get the PDF" style={{ marginBottom: 12 }} reward={SHEET} />
          <Link to="/free-pdf" className="hov" style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", marginBottom: 8, maxWidth: 460 }}>
            <img src={SHEET.preview} alt="A page from the Space Stocks 2026 report" width="54" height="76" loading="lazy" style={{ width: 54, height: 76, objectFit: "cover", objectPosition: "top", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: "#fff", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.light, lineHeight: 1.6 }}><span style={{ color: C.green, fontWeight: 700 }}>Free when you sign up:</span> Space Stocks 2026, a 34-page PDF with a page on each of the {Object.keys(PROFILES).length} listed space companies. <span style={{ color: C.green }}>See what's inside</span></span>
          </Link>
          <div style={{ fontSize: 11, color: C.muted }}>Read by {subscribers} investors. Unsubscribe in one click.</div>
        </div>
        {latest && (
          <a href={latest.live ? latest.url : undefined} target="_blank" rel="noopener noreferrer" className="hov" style={{ ...cardStyle, display: "block", textDecoration: "none", border: "1px solid rgba(126,184,255,0.25)", background: "rgba(126,184,255,0.04)", padding: 24 }}>
            <div style={{ fontSize: 11.5, color: C.blue, marginBottom: 10 }}>Latest issue, #{latest.issue}, {latest.date}</div>
            <div style={{ fontFamily: SYNE, fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 14 }}>{latest.headline}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Market overview, analyst changes, launch watch and one deep dive.</div>
            <span style={{ fontSize: 11, color: C.blue }}>{latest.live ? "Read the issue" : "Out this Sunday"}</span>
          </a>
        )}
      </section>

      {/* What's next: the dated events with their own pages and sign-up offers (dist/data/whats-next.json, written by the prerender) */}
      <WhatsNext />

      {/* Live market data first; cards with nothing to show are hidden */}
      <div className="oa-grid" style={{ marginBottom: 14 }}>
        <Card title="Today's moves" note={prices.isLive ? `Live · ${prices.lastUpdated}` : "Loading prices"}>
          <Heatmap stocks={prices.stocks} isLive={prices.isLive} compact />
          <MoreLink to="/markets">All {covered.length} stocks</MoreLink>
        </Card>

        {(signalsLoading || signals.length > 0) && (
        <Card title="Latest signals" note="Insider trades, offerings, contract wins">
          {signalsLoading && <ListSkeleton rows={4} />}
          {signals.map((i) => (
            <a key={i.type + i.key} href={i.link || undefined} target="_blank" rel="noopener noreferrer" className="hov" style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: "#667", width: 44, flexShrink: 0, paddingTop: 2 }}>{fmtDay(i.day, { day: "numeric", month: "short" })}</span>
              <span style={{ flexShrink: 0 }}><TickerChip ticker={i.tickers[0]} /></span>
              <span style={{ fontSize: 11, color: i.color || "#fff", lineHeight: 1.5 }}>{i.title}</span>
            </a>
          ))}
          <MoreLink to="/news">All news, filings and contracts</MoreLink>
        </Card>
        )}
      </div>

      {/* Space vs S&P 500 */}
      <Card title="Space stocks vs the S&P 500" style={{ marginBottom: 14 }}>
        <PerformanceChart />
        <MoreLink to="/markets/performance">Compare space ETFs and individual stocks</MoreLink>
      </Card>

      <div className="oa-grid" style={{ marginBottom: 14 }}>
        {!(earnings.data && launches && !nextEarnings.length && !nextLaunches.length) && !(earnings.error && launches && !nextLaunches.length) && (
        <Card title="Coming up">
          {!earnings.data && !earnings.error && launches === null && <ListSkeleton rows={4} />}
          {nextEarnings.map((e) => (
            <div key={e.ticker + e.date} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 10, color: C.blue, width: 64 }}>Earnings</span>
              <TickerChip ticker={e.ticker} />
              <span style={{ fontSize: 11, color: C.light, marginLeft: "auto" }}>{fmtDay(e.date, { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
          ))}
          {nextLaunches.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 10, color: C.orange, width: 64 }}>Launch</span>
              {l.tickers.slice(0, 2).map((t) => <TickerChip key={t} ticker={t} />)}
              <span style={{ fontSize: 11, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.mission.split(" · ").pop()}</span>
              <span style={{ fontSize: 11, color: C.light }}>{l.date}</span>
            </div>
          ))}
          <MoreLink to="/markets/earnings">Earnings and launch calendars</MoreLink>
        </Card>

        )}
        {(news.loading || headlines.length > 0) && (
        <Card title="Top stories" note="Last 3 days">
          {news.loading && <ListSkeleton rows={4} />}
          {headlines.map((c) => <StoryCard key={c.lead.link} c={c} moveOf={moveOf} compact />)}
          <MoreLink to="/news">All news</MoreLink>
        </Card>
        )}
      </div>

      {/* Coverage */}
      <Card title="Stocks we cover" note="Each has its own page" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(PROFILES).map(([t, p]) => (
            <Link key={t} to={`/stocks/${t.toLowerCase()}`} className="hov" title={p.name} style={{ border: "1px solid rgba(0,255,136,0.18)", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: C.green, fontWeight: 700 }}>
              {t} <span style={{ color: C.muted, fontWeight: 400 }}>{p.name}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Guides, grouped (lib/pagemeta.js GUIDE_GROUPS); the full list is at /guides */}
      <Card title="Space stock guides" note={<Link to="/guides" className="oa-link" style={{ color: C.green }}>All {GUIDE_LIST.length} guides</Link>} style={{ marginBottom: 14 }}>
        {GUIDE_GROUPS.map(([id, name]) => (
          <div key={id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{name}</div>
            <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", fontSize: 12 }}>
              {GUIDE_LIST.filter(([, g]) => g.group === id && !g.hubHide).map(([p, g]) => <Link key={p} to={p} className="oa-link" style={{ color: id === "spacex" ? C.green : C.blue }}>{g.label}</Link>)}
            </div>
          </div>
        ))}
      </Card>

      {/* Closing CTA */}
      <ForNonSubscribers>
      <section style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", textAlign: "center", padding: "32px 20px", marginBottom: 24 }}>
        <div style={{ fontFamily: SYNE, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Get the Sunday briefing</div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>The week in space stocks, in five minutes. Subscribe free and get Space Stocks 2026, a 34-page PDF on all {Object.keys(PROFILES).length} listed space companies.</p>
        <SubscribeForm source="home-bottom" style={{ margin: "0 auto" }} reward={SHEET} />
      </section>
      </ForNonSubscribers>

      <footer style={{ padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: SYNE, fontSize: 13, fontWeight: 800, color: "#556" }}>ORBIT<span style={{ color: C.green }}>ALPHA</span>.</span>
        <span style={{ fontSize: 10, color: C.muted }}>Not financial advice. Data from Yahoo Finance, SEC EDGAR, USAspending.gov, Nasdaq and The Space Devs.</span>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: C.muted }}>
          <Link to="/news" className="oa-link">News</Link>
          <Link to="/newsletter" className="oa-link">Newsletter</Link>
          <Link to="/about" className="oa-link">About</Link>
          <Link to="/advertise" className="oa-link">Advertise</Link>
          <Link to="/space-stocks-widget" className="oa-link">Free widget</Link>
          <a href="https://x.com/OrbitAlphaApp" target="_blank" rel="noopener me" style={{ color: C.muted, textDecoration: "none" }} className="oa-link">X @OrbitAlphaApp</a>
          <a href="https://www.reddit.com/r/SpaceCapital/" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: "none" }} className="oa-link">r/SpaceCapital</a>
          <a href="mailto:OrbitAlphaApp@proton.me" style={{ color: C.muted, textDecoration: "none" }} className="oa-link">Contact</a>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MARKETS PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const TABS = [
  ["stocks", "Stocks", "", "Live prices"],
  ["performance", "Performance", "", "vs the S&P 500"],
  ["launches", "Launches", "", "What's flying next"],
  ["earnings", "Earnings", "", "Upcoming dates"],
  ["contracts", "Contracts", "", "Government wins"],
  ["filings", "Filings", "", "Insider buys and sells"],
];
const ROW_GRID = "68px 1fr 82px 72px 72px 80px";
const sectionLabel = { fontSize: 11, color: C.muted, marginBottom: 8 };
const border = "1px solid rgba(255,255,255,0.06)";

function Markets({ prices, launches, tab, setTab, goSubscribe }) {
  const clock = useClock();
  const open = isMarketOpen();
  const oc = open ? C.green : C.red;
  const active = TABS.some(([id]) => id === tab) ? tab : "stocks";

  return (
    <div style={{ animation: "fu 0.3s ease" }}>
      <div style={{ padding: "12px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${oc}14`, border: `1px solid ${oc}33`, borderRadius: 4, padding: "3px 10px" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: oc, animation: "bk 1.5s infinite" }} />
          <span style={{ fontSize: 10, color: oc, letterSpacing: "0.08em" }}>{open ? "US market open" : "US market closed"}</span>
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>
          {clock.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })},{" "}
          {clock.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })} New York
        </span>
      </div>

      <nav aria-label="Markets sections" className="oa-tabs" style={{ display: "flex", gap: 8, padding: "14px 20px", borderBottom: border, overflowX: "auto" }}>
        {TABS.map(([id, label, icon, hint]) => {
          const on = active === id;
          return (
            <button key={id} onClick={() => setTab(id)} aria-current={on ? "page" : undefined} className="oa-tab"
              style={{ flex: "1 0 auto", minWidth: 130, textAlign: "left", cursor: "pointer", fontFamily: MONO, borderRadius: 8, padding: "10px 14px",
                background: on ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "rgba(0,255,136,0.55)" : "rgba(255,255,255,0.1)"}`,
                transition: "all 0.15s" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: on ? C.green : "#fff", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: on ? C.light : C.muted, marginTop: 3, whiteSpace: "nowrap" }}>{hint}</div>
            </button>
          );
        })}
      </nav>

      {/* Newsletter bar on every Markets tab */}
      <ForNonSubscribers>
        <div style={{ margin: "12px 20px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 18px", border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.04)", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Get the Sunday briefing</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>What moved across the space stocks we track this week, why, and what is coming next. Free, every Sunday.</div>
          </div>
          <SubscribeForm source={`markets-${active}`} style={{ flex: "1 1 340px" }} />
        </div>
      </ForNonSubscribers>

      <div style={{ padding: "16px 20px 40px" }}>
        {active === "stocks" && <StocksTab prices={prices} goSubscribe={goSubscribe} />}
        {active === "performance" && <PerformanceChart full prices={prices} />}
        {active === "launches" && <LaunchesTab launches={launches} />}
        {active === "earnings" && <EarningsTab />}
        {active === "contracts" && <ContractsTab />}
        {active === "filings" && <FilingsTab />}
      </div>
    </div>
  );
}

/* ── Stocks ─────────────────────────────────────────────────────────────────── */
const Star = ({ on, onClick, size = 12 }) => (
  <span onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ fontSize: size, color: on ? C.yellow : "#556", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>
    {on ? "★" : "☆"}
  </span>
);

const ChangeBadge = ({ v }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: v >= 0 ? "rgba(0,255,136,0.12)" : "rgba(255,68,102,0.12)", color: signColor(v), display: "inline-block", textAlign: "center" }}>
    {pct(v)}
  </span>
);

const EtfTag = ({ label = "ETF" }) => <span style={{ fontSize: 8, color: C.blue, background: "rgba(126,184,255,0.1)", padding: "1px 4px", borderRadius: 2 }}>{label}</span>;

function StocksTab({ prices: { stocks, isLive }, goSubscribe }) {
  const [sector, setSector] = useState("All");
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useLocalStorage("oa_watchlist", []);
  const [watchOnly, setWatchOnly] = useState(false);
  const [sort, setSort] = useState({ col: null, dir: "desc" });
  const [expanded, setExpanded] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const flash = usePriceFlash(stocks);

  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 3000); return () => clearTimeout(t); }, []);
  const loading = !isLive && !timedOut;

  const toggleWatch = (t) => setWatchlist((w) => (w.includes(t) ? w.filter((x) => x !== t) : [...w, t]));
  const navigate = useContext(NavContext);
  const toggleExpand = (t) => setExpanded((e) => (e === t ? null : t));
  // Covered stocks open their full page; others (ETFs, non-roster names) expand inline.
  const open = (t) => (PROFILES[t] ? navigate(`/stocks/${t.toLowerCase()}`) : toggleExpand(t));
  const handleSort = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  const flashClass = (t) => (flash[t] ? `flash-${flash[t]}` : "");

  const q = search.toLowerCase();
  const sortVal = (s) => (sort.col === "mktCap" ? s.marketCap || 0 : s[sort.col] ?? -Infinity);
  const priced = stocks.filter((s) => s.price != null);
  const filtered = priced
    .filter((s) => (sector === "All" || s.sector === sector) && (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) && (!watchOnly || watchlist.includes(s.ticker)))
    .sort((a, b) => {
      if (sort.col) return (sort.dir === "desc" ? 1 : -1) * (sortVal(b) - sortVal(a));
      // Default order: ETFs first, then stocks, each by size (market cap / fund assets), largest first.
      const etf = (x) => (x.type === "etf" ? 0 : 1);
      return etf(a) - etf(b) || (b.marketCap || 0) - (a.marketCap || 0);
    });

  return (
    <div>
      <Heatmap stocks={stocks} isLive={isLive} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticker or name..." style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#ddd", padding: "8px 12px", borderRadius: 4, fontSize: 12, fontFamily: MONO, width: 200 }} />
        <button onClick={() => setWatchOnly((w) => !w)} style={{ background: watchOnly ? "rgba(255,204,0,0.1)" : "transparent", border: `1px solid ${watchOnly ? "rgba(255,204,0,0.4)" : "rgba(255,255,255,0.08)"}`, color: watchOnly ? C.yellow : C.muted, padding: "7px 12px", borderRadius: 4, fontSize: 10, fontFamily: MONO, cursor: "pointer", letterSpacing: "0.08em" }}>
          ★ Watchlist
        </button>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {SECTORS.map((s) => (
            <span key={s} className="stg" onClick={() => setSector(s)} style={{ color: sector === s ? C.green : C.muted, borderColor: sector === s ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.2)", background: sector === s ? "rgba(0,255,136,0.05)" : "transparent" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="desk-only" style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 6, padding: "7px 8px", fontSize: 11, color: C.text, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>Ticker</span><span>Name</span>
          {[["price", "Price"], ["changePct", "1D Chg%"], ["mktCap", "Mkt Cap"]].map(([col, label]) => (
            <span key={col} onClick={() => handleSort(col)} style={{ cursor: "pointer", color: sort.col === col ? C.green : "#fff", userSelect: "none" }}>
              {label}{sort.col === col ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
            </span>
          ))}
          <span style={{ textAlign: "center", color: C.muted }}>7D</span>
        </div>

        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 6, padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {[40, 120, 60, 50, 55].map((w, j) => <Skeleton key={j} w={w} h={12} />)}
            <Skeleton w={72} h={24} />
          </div>
        ))}

        {!loading && filtered.map((s) => (
          <div key={s.ticker}>
            <div className={`hov ${flashClass(s.ticker)}`} onClick={() => open(s.ticker)} style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 6, padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Star on={watchlist.includes(s.ticker)} onClick={() => toggleWatch(s.ticker)} />
                <span style={{ fontWeight: 700, color: C.green, fontSize: 12 }}>{s.ticker}</span>
                {s.type === "etf" && <EtfTag label={s.tag} />}
              </div>
              <div><div style={{ fontSize: 12, color: "#fff" }}>{s.name}</div><div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{s.sector}</div></div>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{money(s.price, s.currency)}</span>
              <ChangeBadge v={s.changePct} />
              <span style={{ color: C.text, fontSize: 10 }}>{s.mktCap}</span>
              <Sparkline data={s.spark} positive={s.changePct >= 0} currency={s.currency} />
            </div>
            {expanded === s.ticker && <StockDetail s={s} goSubscribe={goSubscribe} />}
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="mob-only">
        {filtered.map((s) => (
          <div key={s.ticker} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, marginBottom: 8, background: "rgba(255,255,255,0.01)", overflow: "hidden" }}>
            <div className={flashClass(s.ticker)} onClick={() => open(s.ticker)} style={{ padding: "12px 14px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={16} on={watchlist.includes(s.ticker)} onClick={() => toggleWatch(s.ticker)} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{s.ticker}</span>
                  {s.type === "etf" && <EtfTag label={s.tag} />}
                  <span style={{ fontSize: 11, color: C.muted }}>{s.name}</span>
                </div>
                <ChangeBadge v={s.changePct} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: "#fff", fontWeight: 500 }}>{money(s.price, s.currency)}</span>
                <span style={{ fontSize: 10, color: C.muted }}>{s.mktCap}</span>
              </div>
              <div style={{ fontSize: 8, color: C.muted, marginBottom: 3, letterSpacing: "0.08em" }}>7D</div>
              <Sparkline data={s.spark} positive={s.changePct >= 0} currency={s.currency} />
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 9, color: C.light }}>{PROFILES[s.ticker] ? "Open full page" : expanded === s.ticker ? "▲ tap to close" : "▼ tap for more"}</div>
            </div>
            {expanded === s.ticker && <StockDetail s={s} goSubscribe={goSubscribe} />}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 12 }}>
          {priced.length ? "No results." : "Live prices are unavailable right now. Please refresh in a minute."}
        </div>
      )}
    </div>
  );
}

/* ── Heatmap: tile size = size of the move, green up, red down ───────────────── */
// Squarified treemap layout: returns rectangles {x, y, w, h} for items sorted by value (desc).
function treemap(items, W, H) {
  const total = items.reduce((a, d) => a + d.value, 0) || 1;
  const nodes = items.map((d) => ({ ...d, area: (d.value / total) * W * H }));
  const out = [];
  let rect = { x: 0, y: 0, w: W, h: H };
  let row = [];
  const worst = (r, side) => {
    const sum = r.reduce((a, n) => a + n.area, 0);
    const max = Math.max(...r.map((n) => n.area)), min = Math.min(...r.map((n) => n.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };
  const place = (r) => {
    const sum = r.reduce((a, n) => a + n.area, 0);
    if (rect.w >= rect.h) {
      const cw = sum / rect.h; let cy = rect.y;
      r.forEach((n) => { const nh = n.area / cw; out.push({ ...n, x: rect.x, y: cy, w: cw, h: nh }); cy += nh; });
      rect = { x: rect.x + cw, y: rect.y, w: rect.w - cw, h: rect.h };
    } else {
      const rh = sum / rect.w; let cx = rect.x;
      r.forEach((n) => { const nw = n.area / rh; out.push({ ...n, x: cx, y: rect.y, w: nw, h: rh }); cx += nw; });
      rect = { x: rect.x, y: rect.y + rh, w: rect.w, h: rect.h - rh };
    }
  };
  nodes.forEach((n) => {
    const side = Math.min(rect.w, rect.h);
    if (!row.length || worst([...row, n], side) <= worst(row, side)) row.push(n);
    else { place(row); row = [n]; }
  });
  if (row.length) place(row);
  return out;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const weekChange = (s) => (s.spark?.length > 1 ? (s.spark[s.spark.length - 1] / s.spark[0] - 1) * 100 : null);

function Heatmap({ stocks, isLive, compact = false }) {
  const [period, setPeriod] = useState("day");
  const [ref, width] = useWidth();
  // Kept deliberately short so it summarises the day without dominating the page.
  const height = compact ? (width < 600 ? 240 : 210) : width < 600 ? 300 : 260;
  const items = stocks
    .filter((s) => PROFILES[s.ticker] && s.price != null)
    .map((s) => ({ s, chg: period === "day" ? s.changePct : weekChange(s) }))
    .filter((d) => typeof d.chg === "number" && isFinite(d.chg))
    .map((d) => ({ ...d, value: Math.abs(d.chg) + 0.35 })) // small floor so flat stocks still get a tile
    .sort((a, b) => b.value - a.value);
  const tiles = width ? treemap(items, width, height) : [];
  const ups = items.filter((d) => d.chg > 0).length;

  return (
    <div style={{ marginBottom: compact ? 0 : 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div>
          {!compact && <div style={{ ...sectionLabel, marginBottom: 2 }}>Space stocks heatmap {isLive ? "· Live" : ""}</div>}
          {isLive && <div style={{ fontSize: 11, color: C.muted }}>{ups} up, {items.length - ups} down. Bigger tile, bigger move.</div>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["day", "Today"], ["week", "5 days"]].map(([id, l]) => (
            <button key={id} onClick={() => setPeriod(id)} className="stg" style={{ fontFamily: MONO, background: period === id ? "rgba(0,255,136,0.08)" : "transparent", color: period === id ? C.green : C.muted, borderColor: period === id ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.12)" }}>{l}</button>
          ))}
        </div>
      </div>
      <div ref={ref} style={{ position: "relative", width: "100%", height, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
        {!isLive && <Skeleton w="100%" h={height} />}
        {isLive && tiles.map(({ s, chg, x, y, w, h }) => {
          const t = Math.min(1, Math.abs(chg) / 8); // colour intensity peaks at an 8% move
          const bg = chg >= 0 ? `rgba(0,${150 + Math.round(t * 70)},${90 + Math.round(t * 20)},${0.28 + t * 0.62})` : `rgba(${200 + Math.round(t * 40)},50,70,${0.28 + t * 0.62})`;
          const big = Math.min(w, h);
          const fs = Math.max(9, Math.min(compact ? 15 : 18, big / 3.6));
          return (
            <Link key={s.ticker} to={`/stocks/${s.ticker.toLowerCase()}`} title={`${PROFILES[s.ticker].name}: ${pct(chg, 2)}`} className="oa-tile"
              style={{ position: "absolute", left: x, top: y, width: w, height: h, background: bg, border: `1px solid ${C.bg}`, borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", textAlign: "center", padding: 2 }}>
              {big > 22 && <span style={{ fontSize: fs, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>{s.ticker}</span>}
              {big > 34 && <span style={{ fontSize: Math.max(9, fs * 0.72), fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{pct(chg)}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StockDetail({ s, goSubscribe }) {
  const stat = (label, value, color = "#fff") => (
    <div>
      <div style={{ ...sectionLabel, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color, fontWeight: 500 }}>{value}</div>
    </div>
  );
  const link = (text, color, onClick) => (
    <button onClick={onClick} style={{ background: "none", border: `1px solid ${color}33`, color, fontSize: 10, padding: "5px 10px", borderRadius: 3, fontFamily: MONO, cursor: "pointer" }}>{text}</button>
  );
  return (
    <div style={{ background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 6, margin: "0 0 4px", padding: "14px 16px", animation: "fu 0.2s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 12, marginBottom: 12 }}>
        {stat("Current Price", money(s.price, s.currency))}
        {stat("1D Change", pct(s.changePct, 2), signColor(s.changePct))}
        {stat("Mkt Cap", s.mktCap || "-")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.light, background: "rgba(255,255,255,0.04)", padding: "5px 10px", borderRadius: 3 }}>{s.sector}</span>
        <a href={yahooUrl(s.ticker)} target="_blank" rel="noopener" style={{ color: C.blue, border: `1px solid ${C.blue}33`, fontSize: 10, padding: "5px 10px", borderRadius: 3, fontFamily: MONO, textDecoration: "none" }}>View on Yahoo Finance</a>
        {link(`${s.ticker} in this week's issue`, C.green, goSubscribe)}
      </div>
    </div>
  );
}

/* ── Launches ───────────────────────────────────────────────────────────────── */
const STATUS_STYLE = {
  GO: ["rgba(0,255,136,0.08)", C.green],
  HOLD: ["rgba(255,100,0,0.08)", "#ff8844"],
};

const fmtLaunchTime = (iso) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

function countdown(iso) {
  const ms = new Date(iso) - Date.now();
  if (!(ms > 0)) return "";
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return d ? `T-${d}d ${h}h` : `T-${h}h ${m}m`;
}

function DetailRow({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11 }}>
      <span style={{ color: C.muted, width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.light }}>{children}</span>
    </div>
  );
}

function LaunchDetails({ d }) {
  const windowText = d.windowStart && d.windowEnd && d.windowStart !== d.windowEnd
    ? `${fmtLaunchTime(d.windowStart)} to ${new Date(d.windowEnd).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : d.windowStart && d.exactTime ? "Instantaneous" : "";
  const link = { color: C.green, textDecoration: "none" };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 14, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
      {d.image && <img src={d.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 240 }}>
        {d.description && <p style={{ fontSize: 12, color: "#bbb", lineHeight: 1.6, margin: "0 0 10px" }}>{d.description}</p>}
        <DetailRow label="Launch time">{d.net && (d.exactTime ? `${fmtLaunchTime(d.net)}  ·  ${countdown(d.net)}` : "Exact time not yet set")}</DetailRow>
        <DetailRow label="Window">{windowText}</DetailRow>
        <DetailRow label="Status">{d.status && `${d.status}${d.statusNote ? `. ${d.statusNote}` : ""}`}</DetailRow>
        <DetailRow label="Rocket">{d.rocket}</DetailRow>
        <DetailRow label="Mission type">{d.missionType}</DetailRow>
        <DetailRow label="Orbit">{d.orbit}</DetailRow>
        <DetailRow label="Customer">{d.customers.join(", ")}</DetailRow>
        <DetailRow label="Programme">{d.programs.join(", ")}</DetailRow>
        <DetailRow label="Launch pad">{d.pad}</DetailRow>
        <DetailRow label="Weather">{d.probability != null ? `${d.probability}% chance of favourable weather${d.weather ? `. ${d.weather}` : ""}` : d.weather}</DetailRow>
        <DetailRow label="Hold reason">{d.holdReason}</DetailRow>
        <DetailRow label="Provider">{d.providerLaunchesThisYear != null && `${d.providerLaunchesThisYear} launch attempt${d.providerLaunchesThisYear === 1 ? "" : "s"} this year${d.providerType ? ` · ${d.providerType}` : ""}`}</DetailRow>
        {(d.webcast || d.info) && (
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11 }}>
            {d.webcast && <a href={d.webcast} target="_blank" rel="noopener noreferrer" style={link}>Watch the webcast ↗</a>}
            {d.info && <a href={d.info} target="_blank" rel="noopener noreferrer" style={link}>Mission page ↗</a>}
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchCard({ l }) {
  const [open, setOpen] = useState(false);
  const [bg, color] = STATUS_STYLE[l.status] || ["rgba(255,255,255,0.04)", "#888"];
  const expandable = !!l.details;
  return (
    <div
      onClick={expandable ? () => setOpen((v) => !v) : undefined}
      role={expandable ? "button" : undefined}
      aria-expanded={expandable ? open : undefined}
      tabIndex={expandable ? 0 : undefined}
      onKeyDown={expandable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } } : undefined}
      className={expandable ? "oa-launch" : undefined}
      style={{ border, borderRadius: 8, padding: 14, marginBottom: 8, background: open ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)", cursor: expandable ? "pointer" : "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>{l.date}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {l.tickers.map((t) => <TickerChip key={t} ticker={t} />)}
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: bg, color }}>{l.status}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, color: "#bbb" }}>{l.mission}</div>
          {l.location && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{l.location}</div>}
        </div>
        {expandable && <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{open ? "Less ▴" : "Details ▾"}</span>}
      </div>
      {open && <LaunchDetails d={l.details} />}
    </div>
  );
}

function LaunchesTab({ launches }) {
  const [rosterOnly, setRosterOnly] = useState(false);
  const shown = launches?.filter((l) => !rosterOnly || l.tickers.length);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ ...sectionLabel, marginBottom: 0 }}>Upcoming Launches</div>
        <button onClick={() => setRosterOnly((v) => !v)} className="stg" style={{ background: rosterOnly ? "rgba(0,255,136,0.05)" : "transparent", color: rosterOnly ? C.green : C.muted, borderColor: rosterOnly ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.2)", fontFamily: MONO }}>
          {rosterOnly ? "✓ " : ""}Only launches involving stocks we cover
        </button>
      </div>
      {launches === null && <ListSkeleton />}
      {shown?.length === 0 && <Empty>No launch data available right now.</Empty>}
      {shown?.map((l, i) => <LaunchCard key={i} l={l} />)}
      <SourceNote>Source: Launch Library 2 (The Space Devs). Tickers show the launch provider or payload owner where we can identify them. Dates marked NET are "no earlier than". Click a launch for full details; times are shown in your time zone.</SourceNote>
    </div>
  );
}

/* ── Earnings (live, from /api/earnings) ──────────────────────────────────── */
function EarningsTab() {
  const { data, error } = useApi("/api/earnings");
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 14 }}>Upcoming earnings for the stocks we cover</div>
      {!data && !error && <ListSkeleton />}
      {error && <Empty>Earnings calendar is unavailable right now. Please try again later.</Empty>}
      {data?.length === 0 && <Empty>No covered companies have confirmed earnings dates in the next 10 weeks yet. Dates usually appear 2 to 4 weeks ahead.</Empty>}
      {data?.map((e) => <EarningsRow key={e.ticker + e.date} e={e} />)}
      <SourceNote>Source: Nasdaq earnings calendar. Dates are set by the companies and can change. Not financial advice.</SourceNote>
    </div>
  );
}

/* ── Government contracts (from /api/contracts) ─────────────────────────────── */
function ContractsTab() {
  const { data, error } = useApi("/api/contracts");
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 4 }}>US government contract awards in the last 12 months</div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>New federal contracts (NASA, Space Force, DoD and others) awarded to the companies we cover, newest first.</p>
      {!data && !error && <ListSkeleton rows={6} />}
      {(error || data?.awards?.length === 0) && <Empty>No contract data available right now.</Empty>}
      {data?.awards?.map((a) => <ContractRow key={a.awardId + a.start} a={a} showTicker />)}
      <SourceNote>Source: USAspending.gov (official US federal spending data). Amounts are obligated values to date, not total contract ceilings. Subcontracts and non-US awards are not included.</SourceNote>
    </div>
  );
}

/* ── SEC filings (from /api/filings) ───────────────────────────────────────── */
const FILING_FILTERS = [["all", "All"], ["insider", "Insider trades"], ["dilution", "Offerings"], ["earnings", "Earnings"], ["event", "Company news"]];

function FilingsTab() {
  const { data, error } = useApi("/api/filings");
  const [filter, setFilter] = useState("all");
  const shown = data?.filings?.filter((f) => filter === "all" || f.kind === filter);
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 4 }}>Notable SEC filings in the last 3 weeks</div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Insider buying and selling, share offerings, earnings releases and material company events, straight from SEC EDGAR.</p>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {FILING_FILTERS.map(([id, label]) => (
          <span key={id} className="stg" onClick={() => setFilter(id)} style={{ color: filter === id ? C.green : C.muted, borderColor: filter === id ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.2)", background: filter === id ? "rgba(0,255,136,0.05)" : "transparent" }}>{label}</span>
        ))}
      </div>
      {!data && !error && <ListSkeleton rows={6} />}
      {error && <Empty>SEC filings are unavailable right now.</Empty>}
      {shown?.length === 0 && <Empty>No filings of this type in the last 3 weeks.</Empty>}
      {shown?.map((f) => <FilingRow key={f.url} f={f} showTicker />)}
      <SourceNote>Source: SEC EDGAR. Insider buys and sales are open-market trades reported on Form 4; grants and option exercises are labelled separately. Companies not registered with the SEC (e.g. MDA Space) are not included.</SourceNote>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PERFORMANCE CHART  (space ETFs and covered stocks vs the S&P 500)
   ════════════════════════════════════════════════════════════════════════════ */
const PERF_RANGES = [["1mo", "1M"], ["3mo", "3M"], ["6mo", "6M"], ["ytd", "YTD"], ["1y", "1Y"]];
const PERF_COLORS = { SPY: "#e8ecf4", QQQ: "#8fa3c0", UFO: C.orange, ARKX: "#b18cff", ROKT: C.yellow, MARS: C.blue, NASA: "#ff7eb6", SSIT: "#38d9a9" };
const STOCK_COLORS = ["#4de1ff", "#ff6b6b", "#c3f73a", "#ffa94d", "#f783ff", "#38d9a9", "#ffe066", "#a5b4fc"];
const PERF_GROUPS = [["benchmark", "Benchmarks"], ["etf", "Space ETFs"]];

function niceStep(span) {
  const raw = span / 4, mag = 10 ** Math.floor(Math.log10(raw || 1)), n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
}

// Equal-weighted average move per sector over the chart's period, plus today and the best/worst stock.
function SectorSummary({ byId, stocks, rangeLabel, onPick }) {
  const last = (id) => { const s = byId[id]; return s ? [...s.values].reverse().find((v) => v != null) : null; };
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const cards = SECTOR_ORDER.map((sector) => {
    const members = Object.keys(PROFILES).filter((t) => PROFILES[t].sector === sector);
    const moves = members.map((t) => ({ t, v: last(t) })).filter((m) => m.v != null).sort((a, b) => b.v - a.v);
    const today = avg(members.map((t) => stocks.find((s) => s.ticker === t)?.changePct).filter((v) => typeof v === "number"));
    return { sector, members, period: avg(moves.map((m) => m.v)), today, best: moves[0], worst: moves[moves.length - 1] };
  }).sort((a, b) => (b.period ?? -1e9) - (a.period ?? -1e9));

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
        Sector averages over {rangeLabel} (equal-weighted). Tap a sector to chart it.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        {cards.map(({ sector, members, period, today, best, worst }) => (
          <button key={sector} onClick={() => onPick(members)} className="oa-tab"
            style={{ textAlign: "left", cursor: "pointer", fontFamily: MONO, background: "rgba(255,255,255,0.02)", border: `1px solid ${period == null ? "rgba(255,255,255,0.1)" : period >= 0 ? "rgba(0,255,136,0.25)" : "rgba(255,68,102,0.3)"}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: C.light, fontWeight: 600 }}>{sector}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: period == null ? C.muted : signColor(period), margin: "4px 0 2px" }}>{period == null ? "-" : pct(period)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
              {rangeLabel}{today != null && <> · Today <span style={{ color: signColor(today) }}>{pct(today)}</span></>}
            </div>
            {best && (
              <div style={{ fontSize: 10, color: C.muted, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>Best <b style={{ color: "#fff" }}>{best.t}</b> <span style={{ color: signColor(best.v) }}>{pct(best.v)}</span></span>
                {worst && worst.t !== best.t && <span>Worst <b style={{ color: "#fff" }}>{worst.t}</b> <span style={{ color: signColor(worst.v) }}>{pct(worst.v)}</span></span>}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerformanceChart({ full = false, prices }) {
  const [range, setRange] = useState("ytd");
  const [selected, setSelected] = useState(full ? ["SPY", "UFO", "ARKX", "MARS"] : ["SPY", "UFO", "ARKX"]);
  const [hover, setHover] = useState(null);
  const chartRef = useRef(null);
  const { data, error } = useApi(`/api/performance?range=${range}`);

  const series = data?.series || [];
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  const stockIds = selected.filter((id) => byId[id]?.kind === "stock");
  const colorOf = (id) => PERF_COLORS[id] || STOCK_COLORS[stockIds.indexOf(id) % STOCK_COLORS.length];
  const active = selected.map((id) => byId[id]).filter(Boolean);
  const toggle = (id) => setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  const lastValue = (s) => [...s.values].reverse().find((v) => v != null);

  const W = 800, H = full ? 300 : 200;
  const all = active.flatMap((s) => s.values.filter((v) => v != null)).concat(0);
  const lo = Math.min(...all), hi = Math.max(...all);
  const step = niceStep(hi - lo || 10);
  const yMin = Math.floor(lo / step) * step, yMax = Math.ceil(hi / step) * step;
  const n = data?.dates?.length || 0;
  const x = (i) => (n > 1 ? (i / (n - 1)) * W : 0);
  const y = (v) => H - ((v - yMin) / (yMax - yMin || 1)) * H;
  const path = (values) => values.reduce((d, v, i) => (v == null ? d : d + `${d && values[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`), "");
  const ticks = []; for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  const label = (s) => (s.kind === "stock" ? `${s.id} · ${PROFILES[s.id]?.name || ""}` : s.label);

  // Headline: the oldest space ETF (UFO) against the S&P 500.
  const ufo = byId.UFO, spy = byId.SPY;
  const headline = ufo && spy && (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
      {[[ufo, "Space stocks (UFO ETF)"], [spy, "S&P 500"]].map(([s, name]) => (
        <div key={s.id}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{name}</div>
          <div style={{ fontFamily: SYNE, fontSize: full ? 26 : 30, fontWeight: 800, color: signColor(lastValue(s)) }}>{pct(lastValue(s))}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {full && (
        <>
          <div style={{ ...sectionLabel, marginBottom: 4 }}>Space Stocks vs the Market</div>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>Percentage change over the period. Tick to compare space ETFs, the S&P 500 and any stock we cover.</p>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        {headline || <div />}
        <div style={{ display: "flex", gap: 4 }}>
          {PERF_RANGES.map(([id, l]) => (
            <button key={id} onClick={() => setRange(id)} className="stg" style={{ fontFamily: MONO, background: range === id ? "rgba(0,255,136,0.08)" : "transparent", color: range === id ? C.green : C.muted, borderColor: range === id ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.12)" }}>{l}</button>
          ))}
        </div>
      </div>

      {!data && !error && <Skeleton w="100%" h={H} />}
      {error && <Empty>Performance data is unavailable right now.</Empty>}
      {data && (
        <div ref={chartRef} style={{ position: "relative", paddingLeft: 44, marginTop: 14 }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: "absolute", left: 0, top: y(t) - 6, fontSize: 9, color: t === 0 ? C.light : "#667", width: 40, textAlign: "right" }}>{t > 0 ? "+" : ""}{t}%</div>
          ))}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
            }}>
            {ticks.map((t) => <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            {active.map((s) => (
              <path key={s.id} d={path(s.values)} fill="none" stroke={colorOf(s.id)} strokeWidth={s.kind === "benchmark" ? 2.2 : 1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="rgba(255,255,255,0.35)" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" />}
          </svg>
          {hover !== null && (
            <div style={{ position: "absolute", top: 0, left: `calc(44px + (100% - 44px) * ${hover / Math.max(1, n - 1)})`, transform: hover > n / 2 ? "translateX(-105%)" : "translateX(8px)", background: "#0a0f1e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "8px 10px", fontSize: 11, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2 }}>
              <div style={{ color: C.muted, marginBottom: 4 }}>{fmtDay(data.dates[hover])}</div>
              {active.map((s) => ({ s, v: s.values[hover] })).filter((r) => r.v != null).sort((a, b) => b.v - a.v).map(({ s, v }) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                  <span style={{ color: colorOf(s.id) }}>{s.kind === "stock" ? s.id : s.label}</span>
                  <span style={{ color: signColor(v), fontWeight: 600 }}>{pct(v)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#667", marginTop: 6 }}>
            <span>{fmtDay(data.dates[0], { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>{fmtDay(data.dates[n - 1], { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      )}

      {/* Legend / tick boxes */}
      {data && (
        <div style={{ marginTop: 14 }}>
          {(full ? PERF_GROUPS : [["benchmark"], ["etf"]]).map(([kind, title]) => {
            const items = series.filter((s) => s.kind === kind);
            if (!items.length) return null;
            return (
              <div key={kind} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                {full && <span style={{ fontSize: 11, color: "#667", width: 90 }}>{title}</span>}
                {items.map((s) => {
                  const on = selected.includes(s.id);
                  // Series with no prices in this range (e.g. a London listing on a data gap) can't be drawn.
                  const empty = lastValue(s) == null;
                  return (
                    <label key={s.id} title={empty ? `${s.label}: no data for this period` : s.label} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 34, fontSize: 12, cursor: empty ? "default" : "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent", border: `1px solid ${on && !empty ? colorOf(s.id) + "88" : "rgba(255,255,255,0.1)"}`, background: on && !empty ? colorOf(s.id) + "14" : "transparent", borderRadius: 6, padding: "6px 11px", color: on && !empty ? "#fff" : C.muted, opacity: empty ? 0.45 : 1 }}>
                      <input type="checkbox" checked={on && !empty} disabled={empty} onChange={() => toggle(s.id)} style={{ accentColor: colorOf(s.id), margin: 0, width: 15, height: 15 }} />
                      <span style={{ width: 10, height: 2, background: colorOf(s.id), display: "inline-block" }} />
                      {full ? (s.kind === "etf" ? s.id : s.label) : s.kind === "etf" ? s.id : s.label}
                      {on && !empty && <span style={{ color: signColor(lastValue(s)), fontWeight: 600 }}>{pct(lastValue(s))}</span>}
                      {empty && <span style={{ fontSize: 10 }}>no data</span>}
                    </label>
                  );
                })}
              </div>
            );
          })}
          {full && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "#667", width: 90 }}>Stocks</span>
              {stockIds.map((id) => (
                <span key={id} onClick={() => toggle(id)} title="Remove" style={{ fontSize: 11, border: `1px solid ${colorOf(id)}66`, borderRadius: 4, padding: "4px 8px", color: "#fff", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ width: 10, height: 2, background: colorOf(id), display: "inline-block" }} />{id}
                  <span style={{ color: signColor(lastValue(byId[id])), fontWeight: 600 }}>{pct(lastValue(byId[id]))}</span> ✕
                </span>
              ))}
              <select value="" onChange={(e) => e.target.value && toggle(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: C.light, padding: "4px 8px", borderRadius: 4, fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>
                <option value="">+ Add a stock</option>
                {series.filter((s) => s.kind === "stock" && !selected.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      {full && data && (
        <SectorSummary
          byId={byId}
          stocks={prices?.stocks || []}
          rangeLabel={PERF_RANGES.find(([id]) => id === range)[1]}
          onPick={(tickers) => { setSelected(["SPY", ...tickers]); chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
        />
      )}
      {full && data && (
        <SourceNote>
          Percentage change in price from the first trading day of the period. Stocks listed during the period start from their first trading day. Prices via Yahoo Finance, as of {fmtDay(data.asOf, { day: "numeric", month: "short", year: "numeric" })}. Past performance is not a guide to future returns.
        </SourceNote>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   STOCK PAGE  (/stocks/rklb)
   ════════════════════════════════════════════════════════════════════════════ */
const CHART_RANGES = [["1d", "1D"], ["5d", "5D"], ["1mo", "1M"], ["3mo", "3M"], ["6mo", "6M"], ["1y", "1Y"]];

function PriceChart({ points, intraday = false, currency = "USD" }) {
  const [hover, setHover] = useState(null);
  const W = 600, H = 190;
  if (points.length < 2) return <Empty>Chart unavailable right now.</Empty>;
  const closes = points.map((p) => p.c);
  const min = Math.min(...closes), max = Math.max(...closes), span = max - min || 1;
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => H - 6 - ((v - min) / span) * (H - 12);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ");
  const color = closes[closes.length - 1] >= closes[0] ? C.green : C.red;
  const hp = hover !== null ? points[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: "block", cursor: "crosshair" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)))));
        }}>
        <defs>
          <linearGradient id="pcfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#pcfill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hp && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke={color} strokeWidth="1" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" opacity="0.6" />}
      </svg>
      {hp && (
        <div style={{ position: "absolute", top: 4, left: `${(hover / (points.length - 1)) * 100}%`, transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})`, background: "#0a0f1e", border: `1px solid ${color}`, borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#fff", whiteSpace: "nowrap", pointerEvents: "none" }}>
          {money(hp.c, currency)} <span style={{ color: C.muted, marginLeft: 4 }}>{intraday
            ? new Date(hp.t * 1000).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
            : new Date(hp.t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#667", marginTop: 4 }}>
        <span>Low {money(min, currency)}</span><span>High {money(max, currency)}</span>
      </div>
    </div>
  );
}

/* ── Stock page: key stats, insider activity, peers ────────────────────────── */
// Canadian filers report insider trades on SEDI, not SEC Form 4.
const hasSec = (t) => !PROFILES[t]?.listing && t !== "MDA";
const hasForm4 = (t) => !PROFILES[t]?.listing && t !== "MDA" && t !== "TSAT";
const fmtVol = (v) => (v == null ? "-" : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v}`);
const pctOrDash = (v) => (v == null ? "-" : pct(v));

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: color || "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function KeyStats({ ticker, data, error, live }) {
  const s = data?.stats;
  const cur = s?.currency || live?.currency;
  const vs = (v, ref, name) => (v == null || ref == null ? null : `${name} ${pct(ref)}`);
  return (
    <Card title="Key stats" note="Last 12 months" style={{ marginBottom: 14 }}>
      {!data && !error && <Skeleton w="100%" h={60} />}
      {error && !data && <Empty>Unavailable right now.</Empty>}
      {s && (
        <div className="oa-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px 20px" }}>
          <Stat label="Market cap" value={live?.marketCap ? formatMktCap(live.marketCap) : "-"} sub={PROFILES[ticker]?.listing ? "In US dollars" : null} />
          <Stat label="52-week range" value={`${money(s.low52, cur)} to ${money(s.high52, cur)}`} sub={s.fromHigh != null ? `${pct(s.fromHigh)} from 52-week high` : null} />
          <Stat label="YTD return" value={pctOrDash(s.ytd)} color={s.ytd == null ? null : signColor(s.ytd)} sub={[vs(s.ytd, data.sectorMedian?.ytd, "Sector median"), vs(s.ytd, data.ufo?.ytd, "UFO ETF")].filter(Boolean).join(" · ")} />
          <Stat label={s.partial ? "Since listing" : "1-year return"} value={pctOrDash(s.y1)} color={s.y1 == null ? null : signColor(s.y1)} sub={s.partial ? `Listed ${s.days} trading days ago` : [vs(s.y1, data.sectorMedian?.y1, "Sector median"), vs(s.y1, data.ufo?.y1, "UFO ETF")].filter(Boolean).join(" · ")} />
          <Stat label="Volume" value={fmtVol(s.vol)} sub={s.avgVol ? `3-month average ${fmtVol(s.avgVol)}${s.vol != null ? ` (${(s.vol / s.avgVol).toFixed(1)}x)` : ""}` : null} />
        </div>
      )}
      <SourceNote>Prices: Yahoo Finance daily closes. Sector median covers the {data?.sectorMedian?.count || ""} {PROFILES[ticker]?.sector} stocks we track.</SourceNote>
    </Card>
  );
}

function InsiderSummary({ ticker, data, error }) {
  const windowRow = (label, w) => (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12, alignItems: "baseline" }}>
      <span style={{ color: C.light }}>{label}</span>
      <span style={{ color: w.bought ? C.green : C.muted }}>{w.bought ? fmtMoney(w.bought) : "$0"}<span style={{ color: C.muted, fontSize: 10 }}> · {w.buyers} {w.buyers === 1 ? "buyer" : "buyers"}</span></span>
      <span style={{ color: w.sold ? C.red : C.muted }}>{w.sold ? fmtMoney(w.sold) : "$0"}<span style={{ color: C.muted, fontSize: 10 }}> · {w.sellers} {w.sellers === 1 ? "seller" : "sellers"}</span></span>
      <span style={{ color: w.net ? signColor(w.net) : C.muted, fontWeight: 600 }}>{w.net ? `${w.net > 0 ? "+" : "-"}${fmtMoney(Math.abs(w.net))}` : "$0"}</span>
    </div>
  );
  return (
    <Card title="Insider activity" note="Open-market trades, Form 4" style={{ marginBottom: 14 }}>
      {!data && !error && <ListSkeleton rows={2} />}
      {error && !data && <Empty>Unavailable right now.</Empty>}
      {data?.m12 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr", gap: 8, fontSize: 11, color: C.muted, paddingBottom: 4 }}>
            <span>Period</span><span>Bought</span><span>Sold</span><span>Net</span>
          </div>
          {windowRow("Last 3 months", data.m3)}
          {windowRow(data.complete ? "Last 12 months" : `Since ${new Date(data.coveredFrom + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`, data.m12)}
          {data.largest?.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Largest trades</div>
              {data.largest.map((t) => (
                <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer" className="hov" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", fontSize: 11 }}>
                  <span style={{ color: C.light, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.owner}<span style={{ color: C.muted }}> · {t.role}</span></span>
                  <span style={{ whiteSpace: "nowrap" }}><span style={{ color: t.direction === "buy" ? C.green : C.red }}>{t.direction === "buy" ? "Bought" : "Sold"} {fmtMoney(t.value)}</span><span style={{ color: C.muted }}> · {fmtDay(t.date)}</span></span>
                </a>
              ))}
            </div>
          ) : <Empty>No open-market insider buys or sales in the last 12 months.</Empty>}
        </>
      )}
      <SourceNote>Source: SEC EDGAR Form 4 filings. Excludes grants, option exercises and shares withheld for tax.{data?.m12 && !data.complete ? ` Based on the latest ${data.form4s > 100 ? 100 : data.form4s} Form 4s.` : ""} Sales are often pre-planned (Rule 10b5-1).</SourceNote>
    </Card>
  );
}

function PeerTable({ ticker, data, prices }) {
  const sector = PROFILES[ticker]?.sector;
  const rows = (data?.peers || Object.keys(PROFILES).filter((t) => PROFILES[t].sector === sector).map((t) => ({ ticker: t, name: PROFILES[t].name })))
    .map((p) => ({ ...p, live: prices.stocks.find((x) => x.ticker === p.ticker) }))
    .sort((a, b) => (b.live?.marketCap || 0) - (a.live?.marketCap || 0));
  const th = { fontSize: 11, color: C.muted, fontWeight: 400, textAlign: "right", padding: "0 0 6px 10px", whiteSpace: "nowrap" };
  const td = { fontSize: 12, textAlign: "right", padding: "8px 0 8px 10px", borderTop: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" };
  return (
    <Card title={`${sector} peers`} note="Sorted by market cap" style={{ marginBottom: 14 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left", padding: "0 0 6px" }}>Company</th>
            <th style={th}>Mkt cap</th><th style={th}>Today</th><th style={th}>YTD</th><th style={th}>1 year</th><th className="oa-peer-hi" style={th}>From high</th>
          </tr></thead>
          <tbody>
            {rows.map((p) => {
              const me = p.ticker === ticker;
              const cell = (v) => <td style={{ ...td, color: v == null ? C.muted : signColor(v) }}>{data ? pctOrDash(v) : "…"}</td>;
              return (
                <tr key={p.ticker} style={{ background: me ? "rgba(0,255,136,0.05)" : "transparent" }}>
                  <td style={{ ...td, textAlign: "left", padding: "8px 0" }}>
                    {me ? <span style={{ color: C.green, fontWeight: 700 }}>{p.ticker}</span> : <Link to={`/stocks/${p.ticker.toLowerCase()}`} className="oa-link" style={{ color: C.blue, fontWeight: 700 }}>{p.ticker}</Link>}
                    <span className="oa-peer-name" style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{p.name}</span>
                  </td>
                  <td style={{ ...td, color: C.light }}>{p.live?.marketCap ? formatMktCap(p.live.marketCap) : "-"}</td>
                  <td style={{ ...td, color: p.live?.changePct == null ? C.muted : signColor(p.live.changePct) }}>{p.live?.changePct == null ? "-" : pct(p.live.changePct)}</td>
                  {cell(p.ytd)}{cell(p.y1)}
                  <td className="oa-peer-hi" style={{ ...td, color: C.muted }}>{data ? pctOrDash(p.fromHigh) : "…"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SourceNote>Market caps in US dollars. From high is the distance from each stock's 52-week high.</SourceNote>
    </Card>
  );
}

const SHORT_DATE = { day: "numeric", month: "short", year: "numeric" };
const CUR_SYM = { USD: "$", CAD: "C$", EUR: "€", GBP: "£" };
// Signed amount, e.g. -$41.2M
const fmtAmt = (v, cur = "USD") => {
  if (v == null) return "-";
  const sym = CUR_SYM[cur] ?? `${cur} `;
  const a = Math.abs(v);
  const body = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : `${Math.round(a)}`;
  return `${v < 0 ? "-" : ""}${sym}${body}`;
};
const fmtShares = (v) => (v == null ? "-" : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`);

function FinRow({ label, value, sub, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 12, color: C.light }}>{label}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, color: color || "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{value}</span>
        {sub && <span style={{ fontSize: 10, color: C.muted, marginLeft: 6, whiteSpace: "nowrap" }}>{sub}</span>}
      </span>
    </div>
  );
}

function FinancialSnapshot({ data, error, live }) {
  const f = data?.snapshot;
  const cur = f?.currency || "USD";
  const yoy = (g) => (g == null ? null : `${pct(g)} YoY`);
  const runway = !f ? null
    : f.cashGenerative ? { value: "Cash generative", sub: "positive free cash flow", color: C.green }
    : f.runwayMonths == null ? null
    : { value: f.runwayMonths >= 120 ? "10+ years" : f.runwayMonths >= 36 ? `${(f.runwayMonths / 12).toFixed(1)} years` : `${Math.round(f.runwayMonths)} months`, sub: "at current burn", color: f.runwayMonths < 12 ? C.red : f.runwayMonths < 24 ? C.orange : "#fff" };
  const ps = f?.revenue?.ttm >= 5e6 && cur === "USD" && live?.marketCap ? live.marketCap / f.revenue.ttm : null;
  return (
    <Card title="Financials" note={f ? `Last 12 months to ${fmtDay(f.periodEnd, SHORT_DATE)}` : "Last 12 months"}>
      {!data && !error && <ListSkeleton rows={6} />}
      {(error || data?.none || (data && !f)) && <Empty>Financial data unavailable for this company.</Empty>}
      {f && (
        <>
          <FinRow label="Revenue" value={f.revenue.ttm == null ? "Not yet available" : fmtAmt(f.revenue.ttm, cur)} sub={yoy(f.revenue.ttmGrowth)} color={f.revenue.ttm == null ? C.muted : null} />
          <FinRow label="Latest quarter revenue" value={fmtAmt(f.revenue.quarter, cur)} sub={yoy(f.revenue.quarterGrowth)} />
          {f.grossMargin != null && <FinRow label="Gross margin" value={`${f.grossMargin.toFixed(1)}%`} color={f.grossMargin < 0 ? C.red : null} />}
          <FinRow label="Net income" value={fmtAmt(f.netIncome.ttm, cur)} color={f.netIncome.ttm < 0 ? C.red : null} />
          <FinRow label="Free cash flow" value={fmtAmt(f.freeCashFlow, cur)} sub={f.operatingCashFlow != null ? `operating ${fmtAmt(f.operatingCashFlow, cur)}, capex ${fmtAmt(f.capex || 0, cur)}` : null} color={f.freeCashFlow < 0 ? C.red : null} />
          <FinRow label={f.shortTermInvestments ? "Cash and investments" : "Cash"} value={fmtAmt(f.liquidity, cur)} />
          <FinRow label="Debt" value={f.debt == null ? "Not reported" : fmtAmt(f.debt, cur)} color={f.debt == null ? C.muted : null} />
          {runway && <FinRow label="Cash runway" value={runway.value} sub={runway.sub} color={runway.color} />}
          {ps != null && <FinRow label="Price to sales" value={`${ps.toFixed(1)}x`} sub="market cap / revenue" />}
        </>
      )}
      <SourceNote>Source: SEC XBRL filings{f && cur !== "USD" ? ` (${cur})` : ""}. Free cash flow is operating cash flow minus capital spending. Runway is cash and short-term investments divided by the last 12 months' free cash outflow, before any new funding. Debt as tagged in filings, excluding leases.</SourceNote>
    </Card>
  );
}

function DilutionTracker({ data, error }) {
  const sh = data?.snapshot?.shares;
  const hist = sh?.history || [];
  const max = Math.max(...hist.map((p) => p.shares), 1);
  const chg = (c, label) => c && <FinRow label={label} value={pct(c.pct)} sub={`from ${fmtShares(c.shares)}`} color={c.pct > 10 ? C.red : c.pct > 3 ? C.orange : c.pct < 0 ? C.green : null} />;
  return (
    <Card title="Dilution" note="Shares outstanding">
      {!data && !error && <ListSkeleton rows={4} />}
      {(error || data?.none || (data && !sh && !data.offerings?.length)) && <Empty>Share count data unavailable for this company.</Empty>}
      {sh && (
        <>
          <FinRow label={sh.kind === "weighted" ? "Shares (quarterly average)" : "Shares outstanding"} value={fmtShares(sh.latest.shares)} sub={fmtDay(sh.latest.date, SHORT_DATE)} />
          {chg(sh.y1, "1-year change")}
          {chg(sh.y3, "3-year change")}
          {hist.length > 2 && (
            <div aria-label="Share count history" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 54, marginTop: 12 }}>
              {hist.map((p) => <div key={p.date} title={`${fmtDay(p.date, SHORT_DATE)}: ${fmtShares(p.shares)}`} style={{ flex: 1, height: `${Math.max(6, (p.shares / max) * 100)}%`, background: "rgba(126,184,255,0.45)", borderRadius: "2px 2px 0 0" }} />)}
            </div>
          )}
          {hist.length > 2 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted, marginTop: 4 }}><span>{fmtDay(hist[0].date, { month: "short", year: "numeric" })}</span><span>{fmtDay(hist[hist.length - 1].date, { month: "short", year: "numeric" })}</span></div>}
        </>
      )}
      {data?.offerings?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Offering filings, last 2 years</div>
          {data.offerings.slice(0, 6).map((o) => (
            <a key={o.url} href={o.url} target="_blank" rel="noopener noreferrer" className="hov" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", fontSize: 11 }}>
              <span style={{ color: C.light }}>{o.label} <span style={{ color: C.muted }}>({o.form})</span></span>
              <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtDay(o.date, SHORT_DATE)}</span>
            </a>
          ))}
        </div>
      )}
      <SourceNote>Source: SEC filings ({sh?.kind === "weighted" ? "weighted average basic shares, which can exclude some share classes" : "share count on each 10-Q and 10-K cover"}).{sh?.splitAdjusted ? " Earlier counts adjusted for reverse splits." : ""} A registration or prospectus allows a sale; it does not mean shares were sold.</SourceNote>
    </Card>
  );
}

function StockPage({ ticker, prices, launches, news, goSubscribe }) {
  const profile = PROFILES[ticker];
  const country = useCountry();
  const [range, setRange] = useState("6mo");
  const chart = useApi(profile ? `/api/quote?ticker=${ticker}&range=${range}` : null);
  const filings = useApi(profile ? `/api/filings?ticker=${ticker}` : null);
  const contracts = useApi(profile ? `/api/contracts?ticker=${ticker}` : null);
  const earnings = useApi(profile ? "/api/earnings" : null);
  const keyStats = useApi(profile ? `/api/quote?ticker=${ticker}&stats=1` : null);
  const fin = useApi(profile && hasSec(ticker) ? `/api/filings?ticker=${ticker}&financials=1` : null);
  const insiders = useApi(profile && hasForm4(ticker) ? `/api/filings?ticker=${ticker}&insiders=1` : null);
  if (!profile) return <NotFound />;

  const live = prices.stocks.find((x) => x.ticker === ticker && x.price != null);
  const result = chart.data?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const points = (result?.timestamp || []).map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c != null);
  // 1D change is measured from the previous close; longer ranges from the first point.
  const base = range === "1d" ? result?.meta?.chartPreviousClose || points[0]?.c : points[0]?.c;
  const rangeChange = points.length > 1 && base ? (points[points.length - 1].c / base - 1) * 100 : null;
  const nextEarnings = earnings.data?.find?.((e) => e.ticker === ticker);
  const upcoming = launches?.filter((l) => l.tickers.includes(ticker)).slice(0, 4);
  const stories = news.items.filter((item) => matches(item, ticker)).slice(0, 6);
  const others = Object.keys(PROFILES).filter((t) => t !== ticker);

  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 1000, margin: "0 auto", padding: "24px 20px 60px" }}>
      <nav style={{ fontSize: 10, color: C.muted, marginBottom: 16, letterSpacing: "0.06em" }}>
        <Link to="/markets" className="oa-link">Markets</Link> <span style={{ color: "#445" }}>/</span> <span style={{ color: C.light }}>{ticker}</span>
      </nav>

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            {/* The heading carries both ticker and company name ("RKLB Rocket Lab stock"), which is what people search for. Looks the same as before. */}
            <h1 style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: 0, fontSize: "inherit", fontWeight: "inherit" }}>
              <span style={{ fontFamily: SYNE, fontSize: 34, fontWeight: 800, color: C.green, letterSpacing: "-0.01em" }}>{ticker}</span>
              <span style={{ fontSize: 16, fontWeight: 400, color: "#fff" }}>{profile.name}<span className="oa-sr"> stock</span></span>
            </h1>
            <span style={{ fontSize: 11, color: C.light, border: "1px solid rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 3 }}>{profile.sector}</span>
            {profile.listing && <span style={{ fontSize: 11, color: C.blue, border: "1px solid rgba(126,184,255,0.25)", padding: "2px 8px", borderRadius: 3 }}>{profile.listing}</span>}
          </div>
        </div>
        {live && (
          <div className="oa-price">
            <div style={{ fontSize: 28, color: "#fff", fontWeight: 500 }}>{money(live.price, live.currency)}</div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: signColor(live.changePct), fontWeight: 600 }}>{pct(live.changePct, 2)} today</span>
              {live.mktCap && live.mktCap !== "ETF" && <span style={{ color: C.muted }}> · Mkt cap {live.mktCap}</span>}
            </div>
          </div>
        )}
      </header>
      <p style={{ fontSize: 13, color: C.light, lineHeight: 1.7, maxWidth: 720, marginBottom: 16 }}>{profile.about}</p>

      {/* Where to buy (lib/affiliates.js); clicks are logged as affiliate_click by the listener in index.html */}
      <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Where to buy {ticker}</span>
        {brokersFor(country).map((b) => (
          <a key={b.id} href={brokerHref(b)} target="_blank" rel={b.affiliate ? "sponsored noopener" : "noopener"} data-broker={b.id} data-placement="stock-page-app" data-ticker={ticker} className="oa-link" style={{ color: C.green, fontSize: 13 }} title={b.note}>{b.name}</a>
        ))}
        {!profile.listing && ticker !== "MDA" && (
          <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px" }}>
            <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Research {ticker}</span>
            {TOOLS.map((x) => (
              <a key={x.id} href={toolHref(x, ticker)} target="_blank" rel={x.affiliate ? "sponsored noopener" : "noopener"} data-broker={x.id} data-placement="stock-page-app" data-ticker={ticker} className="oa-link" style={{ color: C.blue, fontSize: 12 }}>{x.name}{x.affiliate && x.note ? <span style={{ color: C.muted }}> ({x.note})</span> : null}</a>
            ))}
          </div>
        )}
        <span style={{ fontSize: 10, color: C.muted, flexBasis: "100%" }}>{RISK}{anyAffiliate() ? ` ${DISCLOSURE}` : ""}</span>
      </div>

      {/* Chart */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {CHART_RANGES.map(([id, label]) => (
              <button key={id} onClick={() => setRange(id)} className="stg" style={{ fontFamily: MONO, background: range === id ? "rgba(0,255,136,0.08)" : "transparent", color: range === id ? C.green : C.muted, borderColor: range === id ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.12)" }}>{label}</button>
            ))}
          </div>
          {rangeChange !== null && <span style={{ fontSize: 12, color: signColor(rangeChange), fontWeight: 600 }}>{pct(rangeChange)} over {CHART_RANGES.find(([id]) => id === range)[1]}</span>}
        </div>
        {!chart.data && !chart.error ? <Skeleton w="100%" h={190} /> : <PriceChart points={points} intraday={range === "1d" || range === "5d"} currency={result?.meta?.currency || live?.currency} />}
      </Card>

      <KeyStats ticker={ticker} data={keyStats.data} error={keyStats.error} live={live} />

      {hasSec(ticker) && (
        <div className="oa-grid" style={{ marginBottom: 14 }}>
          <FinancialSnapshot data={fin.data} error={fin.error} live={live} />
          <DilutionTracker data={fin.data} error={fin.error} />
        </div>
      )}

      {/* Key dates */}
      <div className="oa-grid" style={{ marginBottom: 14 }}>
        <Card title="Next earnings">
          {!earnings.data && !earnings.error && <Skeleton w="60%" h={14} />}
          {earnings.data && (nextEarnings
            ? <div><div style={{ fontSize: 18, color: "#fff", fontWeight: 600 }}>{fmtDay(nextEarnings.date)}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{nextEarnings.time}{nextEarnings.epsEst ? ` · EPS est. ${nextEarnings.epsEst}` : ""}</div></div>
            : <Empty>Not yet confirmed. Companies usually announce 2 to 4 weeks ahead.</Empty>)}
          {earnings.error && <Empty>Unavailable right now.</Empty>}
        </Card>
        <Card title="Upcoming launches">
          {launches === null && <Skeleton w="70%" h={14} />}
          {upcoming?.length === 0 && <Empty>No scheduled launches involving {ticker} in the current manifest.</Empty>}
          {upcoming?.map((l, i) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: C.green }}>{l.date} <span style={{ color: C.muted }}>· {l.status}</span></div>
              <div style={{ fontSize: 12, color: C.light }}>{l.mission}</div>
            </div>
          ))}
        </Card>
      </div>

      {hasForm4(ticker) && <InsiderSummary ticker={ticker} data={insiders.data} error={insiders.error} />}

      {/* Filings and contracts */}
      <div className="oa-grid" style={{ marginBottom: 14 }}>
        <Card title="SEC filings" note="Last 4 months">
          {!filings.data && !filings.error && <ListSkeleton />}
          {(filings.error || filings.data?.filings?.length === 0) && <Empty>{ticker === "MDA" ? "MDA Space files in Canada (SEDAR+), not with the SEC." : profile.listing ? `${profile.name} is listed on ${profile.listing} and does not file with the SEC.` : "No notable SEC filings in the last 4 months."}</Empty>}
          {filings.data?.filings?.map((f) => <FilingRow key={f.url} f={f} />)}
          <SourceNote>Source: SEC EDGAR.</SourceNote>
        </Card>
        <Card title="Government contracts" note={contracts.data?.total ? `${fmtMoney(contracts.data.total)} in the last 12 months` : "Last 12 months"}>
          {!contracts.data && !contracts.error && <ListSkeleton />}
          {(contracts.error || contracts.data?.awards?.length === 0) && <Empty>No new US federal contracts found in the last 12 months.</Empty>}
          {contracts.data?.awards?.map((a) => <ContractRow key={a.awardId + a.start} a={a} />)}
          <SourceNote>Source: USAspending.gov. Prime contracts only.</SourceNote>
        </Card>
      </div>

      <PeerTable ticker={ticker} data={keyStats.data} prices={prices} />

      {/* News */}
      <Card title={`${ticker} news`} style={{ marginBottom: 14 }}>
        {news.loading && <ListSkeleton rows={3} />}
        {!news.loading && stories.length === 0 && <Empty>No recent stories in our feed.</Empty>}
        {stories.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="hov" style={{ display: "block", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none" }}>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>{item.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={sourceStyle(item.source)}>{item.source}</span><span style={{ fontSize: 9, color: C.muted }}>{fmtDate(item.pubDate)}</span></div>
          </a>
        ))}
      </Card>

      {/* Guides written about this stock (lib/pagemeta.js GUIDES with tickers) */}
      {resultsData.some((r) => r.ticker === ticker) && (
        <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
          <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Latest results</span>
          {resultsData.filter((r) => r.ticker === ticker).sort((a, b) => b.reported.localeCompare(a.reported)).slice(0, 3).map((r) => (
            <Link key={r.slug} to={`/results/${r.slug}`} className="oa-link" style={{ color: C.green, fontSize: 13 }}>{r.quarter}: {r.headline}</Link>
          ))}
        </div>
      )}
      {GUIDE_LIST.some(([, g]) => g.tickers?.includes(ticker)) && (
        <div style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{profile.name} guides</span>
          {GUIDE_LIST.filter(([, g]) => g.tickers?.includes(ticker)).map(([p, g]) => (
            <Link key={p} to={p} className="oa-link" style={{ color: C.green, fontSize: 13 }}>{g.label}</Link>
          ))}
        </div>
      )}

      <OrbitBriefs ticker={ticker} limit={5} title={`${profile.name} news from Orbit Alpha`} />

      {/* Newsletter issues that covered this stock (internal links help search engines connect the pages) */}
      {issueArchive.some((x) => x.tickers.includes(ticker)) && (
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.8 }}>
          <span>{ticker} in the newsletter: </span>
          {issueArchive.filter((x) => x.tickers.includes(ticker)).slice(0, 3).map((x, i) => (
            <span key={x.issue}>{i ? " · " : ""}<Link to={`/newsletter/issue-${x.issue}`} className="oa-link" style={{ color: C.blue }}>Issue {x.issue}: {x.title}</Link></span>
          ))}
        </div>
      )}

      {/* Research and share links (real <a> links: useful to readers and to search engines) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center", fontSize: 11, color: C.muted, marginBottom: 14 }}>
        <span>Research {ticker}:</span>
        <a className="oa-link" style={{ color: C.blue, textDecoration: "none" }} href={yahooUrl(ticker)} target="_blank" rel="noopener">Yahoo Finance</a>
        {!profile.listing && <a className="oa-link" style={{ color: C.blue, textDecoration: "none" }} href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&owner=include&count=40`} target="_blank" rel="noopener">SEC EDGAR</a>}
        {!profile.listing && <a className="oa-link" style={{ color: C.blue, textDecoration: "none" }} href={`https://www.usaspending.gov/search/?hash=&keyword=${encodeURIComponent(profile.name)}`} target="_blank" rel="noopener">USAspending</a>}
        <span style={{ marginLeft: "auto" }}>Share:</span>
        {[["X", `https://x.com/intent/tweet?url=${encodeURIComponent(`https://www.orbitalpha.cloud/stocks/${ticker.toLowerCase()}`)}&text=${encodeURIComponent(`${profile.name} ($${ticker}): live price, filings and contracts`)}`],
          ["Reddit", `https://www.reddit.com/submit?url=${encodeURIComponent(`https://www.orbitalpha.cloud/stocks/${ticker.toLowerCase()}`)}&title=${encodeURIComponent(`${profile.name} ($${ticker}): live price, filings and contracts`)}`],
          ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://www.orbitalpha.cloud/stocks/${ticker.toLowerCase()}`)}`]].map(([n, href]) => (
          <a key={n} className="oa-link" style={{ color: C.blue, textDecoration: "none" }} href={href} target="_blank" rel="noopener">{n}</a>
        ))}
      </div>

      {/* Newsletter */}
      <ForNonSubscribers>
      <section style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", marginBottom: 24 }}>
        <div style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Follow {profile.name}</div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>A free email every Sunday covering {profile.name} and the other space stocks we track, plus Space Stocks 2026, a free report with a page on every listed space company.</p>
        <SubscribeForm source="stock-page-bottom" follow={ticker} label={`Follow ${ticker}`} reward={SHEET} />
      </section>
      </ForNonSubscribers>

      {/* Internal links: other stocks */}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Other stocks we cover</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {others.map((t) => <TickerChip key={t} ticker={t} />)}
      </div>
      <div style={{ fontSize: 10, color: "#667", lineHeight: 1.6 }}>Prices may be delayed. Information only, not financial advice.</div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: SYNE, fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Page not found</div>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>That page doesn't exist. Try the markets dashboard or one of the stocks we cover.</p>
      <Link to="/markets" style={{ color: C.green, fontSize: 12 }}>Go to Markets</Link>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
        {Object.keys(PROFILES).map((t) => <TickerChip key={t} ticker={t} />)}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NEWS PAGE  (headlines + SEC filings + contract wins in one feed)
   ════════════════════════════════════════════════════════════════════════════ */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEYWORD_RE = Object.fromEntries(
  Object.entries(COMPANY_KEYWORDS).map(([co, kws]) => [co, new RegExp(`\\b(${kws.map(escape).join("|")})\\b`, "i")])
);
// Yahoo returns news per ticker search; for short or common-word tickers that search is unreliable,
// so those stories are only tagged when the text actually names the company.
const AMBIGUOUS_TICKERS = new Set(["PL", "FLY", "MDA", "ECHO", "YSS"]);
const matches = (item, co) =>
  (item.ticker === co && !AMBIGUOUS_TICKERS.has(co)) || !!KEYWORD_RE[co]?.test(`${item.title} ${item.description || ""}`);

// Covered tickers mentioned in a news item (shown as tags linking to stock pages).
const tagTickers = (item) => Object.keys(PROFILES).filter((t) => matches(item, t));

const isoDay = (d) => (isNaN(d) ? "" : d.toISOString().slice(0, 10));
function dayLabel(iso) {
  const today = isoDay(new Date());
  const yesterday = isoDay(new Date(Date.now() - 86_400_000));
  return iso === today ? "Today" : iso === yesterday ? "Yesterday" : fmtDay(iso, { weekday: "long", day: "numeric", month: "long" });
}

// Normalise headlines, filings and contracts into one shape.
function buildFeed(newsItems, filings, awards) {
  const out = [];
  newsItems.forEach((n) => {
    const time = new Date(n.pubDate);
    out.push({ type: "news", key: n.link, day: isoDay(time), time: +time || 0, title: n.title, source: n.source, link: n.link, tickers: tagTickers(n), key_story: !!n.highlight });
  });
  filings.forEach((f) => {
    const who = f.owner ? ` · ${f.owner}${f.role ? ` (${f.role})` : ""}${f.value ? `, ${fmtMoney(f.value)}` : ""}` : "";
    out.push({ type: "filing", key: f.url, day: f.date, time: 0, title: `${f.label}${who}`, sub: `Form ${f.form}`, source: "SEC EDGAR", link: f.url, tickers: [f.ticker], color: filingColor(f), key_story: f.direction === "buy" || f.direction === "sale" || f.kind === "dilution" || f.kind === "earnings" });
  });
  awards.forEach((a) => {
    out.push({ type: "contract", key: a.awardId + a.start, day: a.start, time: 0, title: `${fmtMoney(a.amount)} contract from ${a.subAgency || a.agency}`, sub: a.description, source: "USAspending.gov", link: a.url, tickers: [a.ticker], color: C.green, key_story: true });
  });
  return out.sort((a, b) => b.day.localeCompare(a.day) || b.time - a.time);
}

/* ── News quality, de-duplication and ranking ──────────────────────────────── */
// Sources and headline patterns that are almost always promotional or low-information.
const LOW_QUALITY_SOURCES = /motley fool|fool\.com|investorplace|marketbeat|simply wall st|insider monkey|24\/7 wall st|ainvest|zacks|gurufocus|seeking alpha|stocktwits|the street pro/i;
const CLICKBAIT = /(stocks? to (buy|watch|own|hold)|should you buy|better (space )?stock|buy (now|right now|and hold)|is it (too late|time) to|millionaire|prediction:|could (soar|skyrocket|double|triple|make you)|no-brainer|forever|warren buffett|moonshot|\b\d+ (space )?stocks? (to|that|for)\b|top \d+ |which is the better)/i;
// Headlines describing a concrete event (as opposed to commentary).
const EVENT_WORDS = /contract|award|earnings|revenue|guidance|results|quarter|launch|acquir|merger|offering|raises|priced|price target|upgrade|downgrade|initiat|FCC|approv|partnership|agreement|deal|order|backlog|IPO|lawsuit|investigation|delay|scrub|anomaly|failure|selects|wins|signs|files/i;
const TOP_SOURCES = /reuters|bloomberg|wall street journal|wsj|financial times|cnbc|barron|spacenews|payload|via satellite|breaking defense|defense news|space\.com|ars technica|techcrunch|associated press|marketwatch|investing\.com|yahoo finance|fierce|the information|axios/i;
const STOP_WORDS = new Set("the a an and or of to in on for with at by from as is are was were be its it this that after over into amid new says said stock stocks shares space company inc corp ltd co nasdaq nyse why how what will could may up down today week".split(" "));

const isQuality = (i) => !LOW_QUALITY_SOURCES.test(i.source || "") && !CLICKBAIT.test(i.title || "");
const titleWords = (t) => new Set((t || "").toLowerCase().replace(/[^a-z0-9$%. ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)));
const overlap = (a, b) => { let n = 0; a.forEach((w) => b.has(w) && n++); return n / Math.max(1, Math.min(a.size, b.size)); };

// Groups different outlets' coverage of the same story into one cluster.
function clusterNews(items) {
  const clusters = [];
  [...items].sort((a, b) => b.time - a.time).forEach((it) => {
    const w = titleWords(it.title);
    const c = clusters.find((c) =>
      Math.abs(c.time - it.time) < 48 * 3600e3 &&
      (c.tickers.some((t) => it.tickers.includes(t)) || (!c.tickers.length && !it.tickers.length)) &&
      overlap(w, c.words) >= 0.5 && Math.min(w.size, c.words.size) >= 3);
    if (c) { c.items.push(it); it.tickers.forEach((t) => !c.tickers.includes(t) && c.tickers.push(t)); }
    else clusters.push({ items: [it], words: w, tickers: [...it.tickers], time: it.time });
  });
  return clusters.map((c) => {
    const lead = [...c.items].sort((a, b) => (TOP_SOURCES.test(b.source) ? 1 : 0) - (TOP_SOURCES.test(a.source) ? 1 : 0) || b.time - a.time)[0];
    const sources = [...new Map(c.items.map((i) => [i.source, i])).values()];
    return { ...c, lead, sources, event: c.items.some((i) => EVENT_WORDS.test(i.title)), latest: Math.max(...c.items.map((i) => i.time)) };
  });
}

// Higher = more worth reading: wider coverage, a concrete event, a bigger stock move, more recent.
function storyScore(c, moveOf) {
  const move = Math.max(0, ...c.tickers.map((t) => Math.abs(moveOf(t) || 0)));
  const hours = (Date.now() - c.latest) / 3600e3;
  return c.sources.length * 2 + (c.event ? 3 : 0) + (TOP_SOURCES.test(c.lead.source) ? 1.5 : 0) + Math.min(move, 12) * 0.35 - hours / 18;
}

function newsClusters(newsItems, sinceMs, company) {
  const items = newsItems
    .map((n) => ({ title: n.title, link: n.link, source: n.source || "", time: +new Date(n.pubDate) || 0, tickers: tagTickers(n) }))
    // Yahoo results come from per-ticker searches, so ones not naming a covered company are noise.
    .filter((i, k) => !(newsItems[k].ticker && !i.tickers.length))
    .filter((i) => i.time >= sinceMs && isQuality(i) && (!company || i.tickers.includes(company)));
  return clusterNews(items);
}

function timeAgo(ms) {
  const h = (Date.now() - ms) / 3600e3;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

const Move = ({ v }) => (typeof v === "number" ? <span style={{ fontSize: 11, fontWeight: 700, color: signColor(v) }}>{pct(v)}</span> : null);

function StoryCard({ c, moveOf, compact }) {
  return (
    <div style={{ padding: compact ? "10px 0" : "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
        {c.tickers.slice(0, 3).map((t) => (
          <span key={t} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><TickerChip ticker={t} /><Move v={moveOf(t)} /></span>
        ))}
        {c.event && <span style={{ fontSize: 9, color: C.yellow, letterSpacing: "0.06em" }}>● EVENT</span>}
      </div>
      <a href={c.lead.link} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: compact ? 13 : 15, color: "#fff", lineHeight: 1.45, textDecoration: "none", fontWeight: 600 }}>{c.lead.title}</a>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
        {c.lead.source} · {timeAgo(c.latest)}
        {c.sources.length > 1 && (
          <details style={{ display: "inline" }}>
            <summary style={{ display: "inline", cursor: "pointer", color: C.blue, marginLeft: 6 }}>+{c.sources.length - 1} more {c.sources.length - 1 === 1 ? "source" : "sources"}</summary>
            <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
              {c.sources.filter((i) => i !== c.lead).map((i) => (
                <a key={i.link} href={i.link} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ color: C.light, textDecoration: "none" }}>{i.source}: {i.title}</a>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

const PERIODS = [[1, "24 hours"], [3, "3 days"], [7, "7 days"]];

/* ── Orbit Alpha news briefs (src/stories.json) ──────────────────────────── */
function OrbitBriefs({ ticker, limit = 6, title = "From Orbit Alpha" }) {
  const items = stories.filter((s) => !ticker || s.tickers?.includes(ticker)).slice(0, limit);
  if (!items.length) return null;
  return (
    <Card title={title} note="Space news, checked and summarised" style={{ marginBottom: 18 }}>
      {items.map((s) => (
        <article key={s.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>
            {new Date(s.published).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {s.tickers?.length > 0 && <> · {s.tickers.map((t, i) => <span key={t}>{i ? ", " : ""}{PROFILES[t] ? <Link to={`/stocks/${t.toLowerCase()}`} className="oa-link" style={{ color: C.green }}>{t}</Link> : t}</span>)}</>}
          </div>
          <h3 style={{ fontSize: 14, color: "#fff", fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{s.title}</h3>
          {String(s.body || "").split(/\n\n+/).map((para, i) => <p key={i} style={{ fontSize: 12.5, color: C.light, lineHeight: 1.65, marginBottom: 6 }}>{para}</p>)}
          {s.source?.url && <div style={{ fontSize: 10.5, color: C.muted }}>Source: <a href={s.source.url} target="_blank" rel="noopener" className="oa-link" style={{ color: C.blue }}>{s.source.name || "original report"}</a></div>}
        </article>
      ))}
    </Card>
  );
}

function News({ news, prices }) {
  const filings = useApi("/api/filings");
  const contracts = useApi("/api/contracts");
  const [days, setDays] = useState(3);
  const [company, setCompany] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("ticker")?.toUpperCase();
    return PROFILES[t] ? t : "";
  });

  const since = Date.now() - days * 86_400_000;
  const sinceDay = isoDay(new Date(since));
  const moveOf = (t) => prices?.stocks.find((s) => s.ticker === t)?.changePct;
  const clusters = newsClusters(news.items, since, company)
    .map((c) => ({ ...c, score: storyScore(c, moveOf) }))
    .sort((a, b) => b.score - a.score);
  const companyStories = clusters.filter((c) => c.tickers.length);
  const top = companyStories.slice(0, 6);
  const industry = clusters.filter((c) => !c.tickers.length).slice(0, 5);
  const byCompany = Object.keys(PROFILES)
    .map((t) => ({ t, move: moveOf(t), stories: companyStories.filter((c) => c.tickers.includes(t)) }))
    .filter((r) => r.stories.length)
    .sort((a, b) => Math.abs(b.move || 0) - Math.abs(a.move || 0));
  const signals = buildFeed([], filings.data?.filings || [], contracts.data?.awards || [])
    .filter((i) => i.key_story && i.day >= sinceDay && (!company || i.tickers.includes(company)));
  const signalsLoading = !filings.data && !filings.error && !contracts.data && !contracts.error;
  const control = { background: "#0d1220", border: "1px solid rgba(255,255,255,0.18)", color: "#e8ecf4", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontFamily: MONO, cursor: "pointer" };
  const h2 = { fontSize: 11.5, color: C.orange, fontWeight: 600, marginBottom: 4 };

  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: SYNE, fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 6 }}>SPACE STOCK <span style={{ color: C.orange }}>NEWS</span></h1>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, maxWidth: 560 }}>What actually happened to the stocks we cover. Duplicate coverage is merged into one story and clickbait is filtered out.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={control}>
            <option value="">All companies</option>
            {Object.entries(PROFILES).map(([t, p]) => <option key={t} value={t}>{t} · {p.name}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(+e.target.value)} style={control}>
            {PERIODS.map(([d, l]) => <option key={d} value={d}>Last {l}</option>)}
          </select>
        </div>
      </div>

      <OrbitBriefs ticker={company} limit={company ? 10 : 6} />

      <div className="oa-news-grid">
        <main>
          {news.loading && <ListSkeleton rows={6} />}

          {!news.loading && !company && (
            <>
              <h2 style={h2}>Top stories</h2>
              <div style={{ fontSize: 10, color: "#667", marginBottom: 6 }}>Ranked by how widely each story was covered, whether it's a concrete event, and how much the stock moved.</div>
              {top.length === 0 && <Empty>No company news in this period.</Empty>}
              {top.map((c) => <StoryCard key={c.lead.link} c={c} moveOf={moveOf} />)}

              <h2 style={{ ...h2, marginTop: 30 }}>By company</h2>
              <div style={{ fontSize: 10, color: "#667", marginBottom: 6 }}>Biggest movers first. Tap a company for all its stories.</div>
              {byCompany.map(({ t, move, stories }) => (
                <div key={t} style={{ display: "grid", gridTemplateColumns: "64px 64px 1fr", gap: 10, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span onClick={() => setCompany(t)} style={{ cursor: "pointer" }}><TickerChip ticker={t} /></span>
                  <Move v={move} />
                  <div style={{ minWidth: 0 }}>
                    <a href={stories[0].lead.link} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: 13, color: C.text, textDecoration: "none", lineHeight: 1.45 }}>{stories[0].lead.title}</a>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {stories[0].lead.source} · {timeAgo(stories[0].latest)}
                      {stories.length > 1 && <span onClick={() => setCompany(t)} style={{ color: C.blue, cursor: "pointer", marginLeft: 6 }}>+{stories.length - 1} more {stories.length - 1 === 1 ? "story" : "stories"}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {!news.loading && company && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h2 style={{ ...h2, marginBottom: 0 }}>{PROFILES[company].name}</h2>
                <Move v={moveOf(company)} />
                <Link to={`/stocks/${company.toLowerCase()}`} className="oa-link" style={{ fontSize: 10, color: C.green, marginLeft: "auto" }}>Full {company} page</Link>
                <span onClick={() => setCompany("")} style={{ fontSize: 10, color: C.muted, cursor: "pointer" }}>✕ All companies</span>
              </div>
              {companyStories.length === 0 && <Empty>No {company} stories in this period. Try a longer period.</Empty>}
              {companyStories.map((c) => <StoryCard key={c.lead.link} c={c} moveOf={moveOf} />)}
            </>
          )}
        </main>

        <aside>
          <Card title="Filings and contracts" note={`Last ${PERIODS.find(([d]) => d === days)[1]}`} style={{ marginBottom: 14 }}>
            {signalsLoading && <ListSkeleton rows={4} />}
            {!signalsLoading && signals.length === 0 && <Empty>No insider trades, offerings or contract wins in this period.</Empty>}
            {signals.slice(0, 12).map((i) => (
              <a key={i.type + i.key} href={i.link || undefined} target="_blank" rel="noopener noreferrer" className="hov" style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}><TickerChip ticker={i.tickers[0]} /></span>
                <span style={{ fontSize: 11, color: i.color || "#fff", lineHeight: 1.45, flex: 1 }}>{i.title}</span>
                <span style={{ fontSize: 9, color: "#667", flexShrink: 0 }}>{fmtDay(i.day, { day: "numeric", month: "short" })}</span>
              </a>
            ))}
            <MoreLink to="/markets/filings">All filings</MoreLink>
          </Card>

          {!company && (
            <Card title="Industry" note="NASA, Space Force and private space">
              {news.loading && <ListSkeleton rows={3} />}
              {!news.loading && industry.length === 0 && <Empty>No industry stories in this period.</Empty>}
              {industry.map((c) => <StoryCard key={c.lead.link} c={c} moveOf={moveOf} compact />)}
            </Card>
          )}

          <ForNonSubscribers>
          <section style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", marginTop: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>The week's news, summarised</div>
            <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>The stories that mattered, in one free email every Sunday. No paywall.</p>
            <SubscribeForm source="news-page" style={{ flexWrap: "wrap" }} />
          </section>
          </ForNonSubscribers>
        </aside>
      </div>
      <SourceNote>Sources: Google News, Yahoo Finance, SEC EDGAR, USAspending.gov. Headlines link to the original publisher. Not financial advice.</SourceNote>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NEWSLETTER PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const NEWSLETTER_SECTIONS = [
  ["Market Overview", "How space stocks moved this week, and why."],
  ["Broker Pulse", "Every analyst rating and price target change on the stocks we cover."],
  ["Launch Watch", "The launches and milestones coming up that could move the stocks."],
  ["Deep Dive", "One company in detail: the bull case, the bear case and the catalysts."],
];
const badge = (color, rgb) => ({ position: "absolute", top: 12, right: 12, fontSize: 9, color, background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.1em" });

function Newsletter() {
  const subscribers = useSubscriberLabel();
  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 800, margin: "0 auto", padding: "40px 20px 60px" }}>
      <div style={{ fontSize: 11.5, color: C.green, marginBottom: 10 }}>Free, every Sunday, about a five-minute read</div>
      <h1 style={{ fontFamily: SYNE, fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 12 }}>The week in space stocks, <span style={{ color: C.green }}>in one email.</span></h1>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, maxWidth: 600, marginBottom: 22 }}>Join {subscribers} investors who get Orbit Alpha every Sunday morning: what moved, why it moved, and what to watch next across every space stock we cover.</p>
      <SubscribeForm source="newsletter-page" style={{ marginBottom: 32 }} />

      <div className="oa-grid" style={{ marginBottom: 36 }}>
        {NEWSLETTER_SECTIONS.map(([t, d]) => (
          <div key={t} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{d}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, fontWeight: 500 }}>Read past issues</h2>
      {issues.map((issue, i) => {
        const onSite = issueArchive.some((x) => x.issue === issue.issue);
        const Wrap = onSite ? Link : "a";
        const linkProps = onSite ? { to: `/newsletter/issue-${issue.issue}` } : { href: issue.live ? issue.url : undefined, target: "_blank", rel: "noopener noreferrer" };
        return (
        <Wrap key={issue.issue} {...linkProps} className="hov"
          style={{ display: "block", textDecoration: "none", border: `1px solid ${i === 0 ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: 20, marginBottom: 10, background: "rgba(255,255,255,0.01)", cursor: issue.live ? "pointer" : "default", opacity: issue.live ? 1 : 0.5, position: "relative" }}>
          {!issue.live && <span style={badge(C.yellow, "255,204,0")}>COMING SUNDAY</span>}
          {i === 0 && issue.live && <span style={badge(C.green, "0,255,136")}>LATEST</span>}
          <div style={{ fontSize: 11.5, color: C.orange, marginBottom: 6 }}>Issue #{issue.issue} · {issue.date}</div>
          <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.4, paddingRight: 90 }}>{issue.headline}</div>
          {issue.summary && issue.summary !== issue.headline && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{issue.summary}</div>}
        </Wrap>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NEWSLETTER ISSUE PAGE: the full issue, word for word (public/issues/N.json)
   ════════════════════════════════════════════════════════════════════════════ */
function IssuePage({ n }) {
  const navigate = useContext(NavContext);
  const entry = issueArchive.find((x) => x.issue === n);
  const { data, error } = useApi(`/issues/${n}.json`);
  const idx = issueArchive.indexOf(entry);
  const [newer, older] = [issueArchive[idx - 1], issueArchive[idx + 1]];
  // Links inside the issue to Orbit Alpha pages open in the app, like every other internal link.
  const onClick = (e) => {
    const a = e.target.closest("a");
    const href = a?.getAttribute("href");
    if (!href || !href.startsWith("/") || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  const dateLabel = entry.date ? new Date(entry.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  return (
    <article style={{ animation: "fu 0.3s ease", maxWidth: 720, margin: "0 auto", padding: "32px 20px 60px" }}>
      <nav style={{ fontSize: 10, color: C.muted, marginBottom: 16, letterSpacing: "0.06em" }}>
        <Link to="/newsletter" className="oa-link">Newsletter</Link> <span style={{ color: "#445" }}>/</span> <span style={{ color: C.light }}>Issue {n}</span>
      </nav>
      <div style={{ fontSize: 11.5, color: C.orange, marginBottom: 8 }}>Issue #{n} · {dateLabel}</div>
      <h1 style={{ fontFamily: SYNE, fontSize: "clamp(24px,4.5vw,34px)", fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 24 }}>{entry.title}</h1>
      {data?.html
        ? <div className="oa-issue" onClick={onClick} dangerouslySetInnerHTML={{ __html: data.html }} />
        : <P>{error ? <>This issue could not be loaded. <a href={entry.url} target="_blank" rel="noopener" className="oa-link" style={{ color: C.green }}>Read it on Beehiiv</a>.</> : "Loading the issue..."}</P>}
      <div style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", margin: "32px 0 28px" }}>
        <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Get the next issue on Sunday</div>
        <SubscribeForm source="issue-page" sample={false} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
        {older ? <Link to={`/newsletter/issue-${older.issue}`} className="oa-link" style={{ color: C.blue }}>← Issue {older.issue}</Link> : <span />}
        {newer ? <Link to={`/newsletter/issue-${newer.issue}`} className="oa-link" style={{ color: C.blue }}>Issue {newer.issue} →</Link> : <span />}
      </div>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   GUIDE PAGES (/space-stocks, /space-etfs ...): finished HTML built by scripts/guides.mjs
   ════════════════════════════════════════════════════════════════════════════ */
function GuidePage({ path }) {
  const navigate = useContext(NavContext);
  const first = window.__oaGuide?.path === path ? window.__oaGuide.html : null;
  const [html, setHtml] = useState(first);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (html) return;
    let alive = true;
    fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then((text) => {
      const el = new DOMParser().parseFromString(text, "text/html").querySelector(".oa-guide");
      if (!alive) return;
      if (el) setHtml(el.innerHTML); else setFailed(true);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [path]);
  const cta = guideCta(path, resultsData.map((r) => ({ ...r, name: PROFILES[r.ticker]?.name })), PROFILES);
  const onClick = (e) => {
    const href = e.target.closest("a")?.getAttribute("href");
    if (!href || !href.startsWith("/") || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <article style={{ animation: "fu 0.3s ease", maxWidth: 860, margin: "0 auto", padding: "32px 20px 60px" }}>
      {html ? html.split("<!--oa-cta-->").map((part, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ForNonSubscribers>
              <div style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.04)", margin: "8px 0 26px" }}>
                {aiVisit() && <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>Welcome from {AI_NAMES[aiVisit().source] || "your AI assistant"}</div>}
                <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{cta[0]}</div>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{cta[1]}</p>
                <SubscribeForm source={`guide-inline:${path}`} follow={cta[2]} label={cta[3] || "Subscribe"} />
              </div>
            </ForNonSubscribers>
          )}
          <div className="oa-issue oa-guide-page" onClick={onClick} dangerouslySetInnerHTML={{ __html: part }} />
        </Fragment>
      ))
        : failed ? <P>This page could not be loaded. <a href={path} className="oa-link" style={{ color: C.green }}>Try again</a>.</P>
        : <ListSkeleton rows={8} />}
      <ForNonSubscribers>
        <div style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", margin: "32px 0 0" }}>
          <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Free report: a page on every space stock</div>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Subscribe to the free Sunday newsletter and get Space Stocks 2026, a printable PDF of every listed space company with market cap, revenue, cash runway and next results date.</p>
          <SubscribeForm source="guide-page" reward={SHEET} label="Get the PDF" />
        </div>
      </ForNonSubscribers>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const P = ({ children, mb = 16 }) => <p style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: mb }}>{children}</p>;
const Rule = ({ mb = 24 }) => <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: `20px 0 ${mb}px` }} />;

const ABOUT_SOURCES = [
  ["Share prices and charts", "Yahoo Finance", "About every minute during market hours. Prices may be delayed."],
  ["Market caps", "Nasdaq share counts multiplied by the live price; European listings use the latest reported share count, converted to US dollars", "Share counts every 12 hours"],
  ["SEC filings, insider trades, financials and share counts", "SEC EDGAR", "Filings hourly, insider summaries every 6 hours, financials every 12 hours"],
  ["US government contracts", "USAspending.gov (prime awards only)", "Every 6 hours"],
  ["Earnings dates", "Nasdaq earnings calendar", "Every 6 hours"],
  ["Launches", "Launch Library 2 (The Space Devs)", "Hourly"],
  ["News", "Google News and Yahoo Finance headlines", "Every 10 minutes"],
];

function About() {
  const h2 = { fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: "#fff", margin: "32px 0 10px" };
  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 680, margin: "0 auto", padding: "32px 20px 60px" }}>
      <h1 style={{ fontFamily: SYNE, fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 16 }}>About Orbit Alpha</h1>
      <P>Orbit Alpha is a free dashboard and weekly newsletter for investors who follow listed space companies. It tracks {Object.keys(PROFILES).length} stocks, from SpaceX and Rocket Lab to small caps in the US and Europe, plus the main space ETFs.</P>
      <P>It does not cover Lockheed Martin, Boeing or Northrop Grumman, where space is a small part of a much larger business. The focus is on companies where space is the main story.</P>

      <h2 style={h2}>Where the data comes from</h2>
      <P mb={12}>All market and company data comes from public sources, pulled automatically.</P>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
          <thead>
            <tr style={{ color: C.muted, textAlign: "left" }}>
              <th style={{ fontWeight: 500, padding: "6px 10px 6px 0" }}>What</th>
              <th style={{ fontWeight: 500, padding: "6px 10px" }}>Source</th>
              <th style={{ fontWeight: 500, padding: "6px 0 6px 10px" }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {ABOUT_SOURCES.map(([what, src, when]) => (
              <tr key={what} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", verticalAlign: "top" }}>
                <td style={{ padding: "9px 10px 9px 0", color: "#fff" }}>{what}</td>
                <td style={{ padding: "9px 10px", color: C.light, lineHeight: 1.5 }}>{src}</td>
                <td style={{ padding: "9px 0 9px 10px", color: C.muted, lineHeight: 1.5 }}>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>How the figures are worked out</h2>
      <P mb={10}><strong style={{ color: "#fff" }}>Returns.</strong> Year-to-date returns run from the last close of the previous year. Sector figures are the median of the stocks we track in that sector.</P>
      <P mb={10}><strong style={{ color: "#fff" }}>Financials.</strong> Taken from the figures companies tag in their 10-Q and 10-K filings. The last 12 months are the latest full year plus this year to date, minus the same period last year.</P>
      <P mb={10}><strong style={{ color: "#fff" }}>Cash runway.</strong> Cash and short-term investments divided by the last 12 months of free cash outflow (operating cash flow minus capital spending). It assumes no new funding.</P>
      <P mb={10}><strong style={{ color: "#fff" }}>Insider trades.</strong> Open-market buys and sales from Form 4 filings. Share grants, option exercises and shares withheld for tax are left out.</P>
      <P><strong style={{ color: "#fff" }}>Share counts.</strong> From the cover of each 10-Q and 10-K, adjusted for reverse splits so the history can be compared.</P>

      <h2 style={h2}>Not investment advice</h2>
      <P>Orbit Alpha is information only. It is not a recommendation to buy or sell anything. Data can be late or wrong, so check the original filing before acting on it. Every filing on the site links to its source.</P>

      <h2 style={h2}>Contact</h2>
      <P mb={8}>Spotted a wrong number or a company we should cover? Email <a href="mailto:OrbitAlphaApp@proton.me" style={{ color: C.green }}>OrbitAlphaApp@proton.me</a>.</P>
      <ForNonSubscribers>
        <h2 style={h2}>The newsletter</h2>
        <P mb={12}>A free email every Sunday with the week's moves, filings, contracts and one company in depth.</P>
        <SubscribeForm source="about-page" />
      </ForNonSubscribers>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   APP SHELL
   ════════════════════════════════════════════════════════════════════════════ */
const NAV = [["/", "home", "Home"], ["/markets", "markets", "Markets"], ["/news", "news", "News"], ["/guides", "guide", "Guides"], ["/newsletter", "newsletter", "Newsletter"]];

export default function App() {
  const [route, navigate] = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const prices = useLivePrices();
  const launches = useLaunches();
  const news = useNews();

  const { page } = route;
  const path = page === "stock" ? `/stocks/${route.ticker.toLowerCase()}` : window.location.pathname;
  useDocumentMeta(route, path);
  const go = (to) => { setMenuOpen(false); navigate(to); };
  const goSubscribe = () => go("/newsletter");
  const share = () =>
    navigator.share
      ? navigator.share({ title: document.title, url: window.location.href })
      : navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"));

  const marketChrome = page === "markets";
  const showTicker = page === "home" || page === "markets" || page === "stock";
  const navBtn = { background: "none", border: "1px solid rgba(255,255,255,0.1)", color: C.light, padding: "7px 12px", borderRadius: 4, fontSize: 12, fontFamily: MONO, cursor: "pointer" };

  return (
    <NavContext.Provider value={go}>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: MONO, fontSize: 13, position: "relative", overflowX: "hidden" }}>
      <GlobalStyles />
      <SubscribePopup path={path} />
      <MobileSubscribeBar path={path} />
      <Stars />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
          <Link to="/" style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>ORBIT</span><span style={{ color: C.green }}>ALPHA.</span>
          </Link>
          <div className="desk-only" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 28 }}>
            {NAV.map(([to, p, l]) => (
              <Link key={p} to={to} style={{ fontSize: 11, color: page === p ? C.green : C.muted, borderBottom: `1px solid ${page === p ? C.green : "transparent"}`, paddingBottom: 2 }}>{l}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to="/free-pdf" className="desk-only oa-link" style={{ fontSize: 11.5, color: C.green, marginRight: 4 }}>Free PDF</Link>
            <button className="desk-only" onClick={goSubscribe} style={{ ...navBtn, background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", color: C.green }}>Subscribe</button>
            <button className="desk-only" onClick={share} style={navBtn}>Share</button>
            <button className="mob-only" onClick={() => setMenuOpen(!menuOpen)} style={{ ...navBtn, padding: "6px 10px", fontSize: 16 }}>{menuOpen ? "✕" : "☰"}</button>
          </div>
        </nav>
        <AiWelcomeBar path={path} />

        {menuOpen && (
          <div style={{ background: "#070a14", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map(([to, p, l]) => (
              <Link key={p} to={to} style={{ color: page === p ? C.green : C.light, padding: "10px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{l}</Link>
            ))}
            <Link to="/free-pdf" style={{ color: C.green, padding: "10px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>Free report: every space stock</Link>
            <button onClick={goSubscribe} style={{ background: C.green, color: C.bg, border: "none", padding: 11, borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: MONO, cursor: "pointer", marginTop: 8 }}>Subscribe</button>
          </div>
        )}

        {showTicker && <TickerStrip stocks={prices.stocks} />}


        {marketChrome && (
          <div style={{ background: prices.isLive ? "rgba(0,255,136,0.05)" : "rgba(255,204,0,0.07)", borderBottom: `1px solid ${prices.isLive ? "rgba(0,255,136,0.15)" : "rgba(255,204,0,0.15)"}`, padding: "8px 16px", textAlign: "center", fontSize: 11, letterSpacing: "0.04em", color: prices.isLive ? C.green : C.yellow }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "bk 1.5s infinite", marginRight: 8 }} />
            {prices.isLive ? `Prices updated ${prices.lastUpdated}` : "Loading live prices..."}
          </div>
        )}

        {page === "home" && <Home news={news} prices={prices} launches={launches} />}
        {page === "markets" && <Markets prices={prices} launches={launches} tab={route.tab} setTab={(t) => go(t === "stocks" ? "/markets" : `/markets/${t}`)} goSubscribe={goSubscribe} />}
        {page === "stock" && <StockPage key={route.ticker} ticker={route.ticker} prices={prices} launches={launches} news={news} goSubscribe={goSubscribe} />}
        {page === "news" && <News news={news} prices={prices} />}
        {page === "newsletter" && <Newsletter />}
        {page === "issue" && <IssuePage n={route.issue} />}
        {page === "guide" && <GuidePage key={route.path} path={route.path} />}
        {page === "about" && <About />}
        {page === "freepdf" && (
          <div style={{ animation: "fu 0.3s ease", maxWidth: 960, margin: "0 auto", padding: "36px 20px 60px" }}>
            <h1 style={{ fontFamily: SYNE, fontSize: "clamp(26px,4.5vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 10 }}>Space Stocks 2026: every listed space company in one PDF</h1>
            <p style={{ fontSize: 13.5, color: C.light, lineHeight: 1.7, maxWidth: 680, marginBottom: 24 }}>A printable guide to all {Object.keys(PROFILES).length} space stocks Orbit Alpha covers, from SpaceX and Rocket Lab to the European satellite operators. Free with the Sunday newsletter.</p>
            <LeadMagnet source="free-pdf-page" heading="Get the free PDF" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 24 }}>
              {[["A page on every company", "What it does, key numbers, this year's share price chart, financials, insider trades, contracts, filings and peers."],
                ["The sector at a glance", "Combined market value by sector, the best and worst performers this year, and every company in one table."],
                ["What is coming next", "Each company's next results date, so you know when the big moves are likely."],
                ["Updated every week", "Rebuilt from live prices and filings every Monday. Subscribers get the newest version from the same link."]].map(([h, t]) => (
                <div key={h} style={cardStyle}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{h}</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{t}</div></div>
              ))}
            </div>
          </div>
        )}
        {page === "notfound" && <NotFound />}
      </div>
    </div>
    </NavContext.Provider>
  );
}
