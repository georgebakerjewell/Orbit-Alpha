import { useState, useEffect, useRef, createContext, useContext } from "react";
import issues from "./issues.json";
import PROFILES from "./stocks.json"; // roster company profiles (also used by scripts/prerender.mjs)

/* ════════════════════════════════════════════════════════════════════════════
   DATA (edit tickers, earnings, news keywords here)
   ════════════════════════════════════════════════════════════════════════════ */
// Static config and fallback data. Live quotes from /api/quote replace STOCKS values once loaded.

const SUBSCRIBER_COUNT = 400;
const SITE_URL = "https://www.orbitalpha.cloud";
const SUBSCRIBE_API = "https://www.orbitalpha.cloud/api/subscribe";

const s = (ticker, name, price, changePct, mktCap, sector, type = "stock") =>
  ({ ticker, name, price, changePct, mktCap, sector, type });

const STOCKS = [
  s("SPCX", "SpaceX", 153.23, -1.5, "272B", "Launch", "large"),
  s("RKLB", "Rocket Lab", 24.82, 15.9, "11.2B", "Launch"),
  s("ASTS", "AST SpaceMobile", 31.17, 4.1, "6.8B", "Comms"),
  s("LUNR", "Intuitive Machines", 8.44, -6.8, "0.9B", "Lunar"),
  s("PL", "Planet Labs", 3.91, 2.1, "0.7B", "Earth Obs"),
  s("BKSY", "BlackSky Technology", 6.14, 3.2, "0.4B", "Earth Obs"),
  s("RDW", "Redwire", 11.23, 4.1, "0.8B", "Hardware"),
  s("MNTS", "Momentus", 1.82, -5.7, "0.1B", "Transport"),
  s("SPCE", "Virgin Galactic", 2.14, -3.2, "0.5B", "Tourism"),
  s("KRMN", "Karman Space", 18.4, 1.8, "1.2B", "Hardware"),
  s("SATL", "Satellogic", 1.23, -2.4, "0.2B", "Earth Obs"),
  s("KULR", "KULR Technology", 1.94, 3.3, "0.3B", "Hardware"),
  s("TSAT", "Telesat", 9.81, -0.8, "0.5B", "Comms"),
  s("GSAT", "Globalstar", 1.67, 1.4, "3.1B", "Comms"),
  s("VSAT", "Viasat", 14.32, -1.1, "1.8B", "Comms"),
  s("MDA", "MDA Space", 19.44, 0.6, "2.1B", "Hardware"),
  s("SPIR", "Spire Global", 4.22, 2.9, "0.4B", "Earth Obs"),
  s("GILT", "Gilat Satellite", 7.88, 0.3, "0.3B", "Comms"),
  s("DXYZ", "Destiny Tech100", 38.44, 4.2, "1.1B", "Private Access"),
  s("LMT", "Lockheed Martin", 441.2, 0.4, "105B", "Defence", "large"),
  s("FLY", "Firefly Aerospace", 14.82, 2.1, "1.8B", "Launch"),
  s("OKLO", "Oklo", 22.14, 1.8, "2.4B", "Energy"),
  s("BA", "Boeing", 172.4, -0.6, "120B", "Defence", "large"),
  s("NOC", "Northrop Grumman", 489.2, 0.3, "72B", "Defence", "large"),
  s("RTX", "RTX Corp", 138.6, 0.8, "181B", "Defence", "large"),
  s("UFO", "Procure Space ETF", 18.92, 1.8, "ETF", "ETF", "etf"),
  s("ARKX", "ARK Space ETF", 22.14, 2.3, "ETF", "ETF", "etf"),
  s("NASA", "Tema Space Innovators ETF", 24.18, 3.1, "ETF", "ETF", "etf"),
  s("MARS", "Roundhill Space & Tech ETF", 30.52, 0, "ETF", "ETF", "etf"),
  s("ROKT", "SPDR Kensho Final Frontiers ETF", 42.18, 0, "ETF", "ETF", "etf"),
  s("ECHO", "EchoStar Corporation", 94.25, 6.8, "27.4B", "Comms"),
  s("VOYG", "Voyager Technologies", 31.49, 0, "1.9B", "Defence"),
  s("YSS", "York Space Systems", 33.61, 0, "4.3B", "Defence"),
  s("HAWK", "HawkEye 360", 34.0, 30.0, "3.1B", "Earth Obs"),
  s("SIDU", "Sidus Space", 1.81, 1.7, "183M", "Hardware"),
];

// Fetched first so the page goes live quickly.
const PRIORITY_TICKERS = ["SPCX", "RKLB", "ASTS", "LUNR", "PL", "HAWK", "BKSY", "RDW", "SPCE", "OKLO", "LMT"];

const SECTORS = ["All", "Launch", "Comms", "Earth Obs", "Hardware", "Lunar", "Tourism", "Transport", "Defence", "Energy", "ETF", "Private Access"];

// Tags launches with the roster tickers involved (launch provider or payload owner).
const LAUNCH_TAGS = [
  [/rocket lab|electron|neutron/i, "RKLB"],
  [/firefly|\balpha\b|blue ghost/i, "FLY"],
  [/spacex|falcon|starship|starlink|dragon/i, "SPCX"],
  [/intuitive machines|\bIM-\d/i, "LUNR"],
  [/bluebird|ast spacemobile/i, "ASTS"],
  [/blacksky|gen-3/i, "BKSY"],
  [/planet labs|pelican|superdove|\bflock\b/i, "PL"],
  [/spire|lemur/i, "SPIR"],
  [/hawkeye/i, "HAWK"],
  [/satellogic|newsat/i, "SATL"],
  [/telesat|lightspeed/i, "TSAT"],
  [/globalstar/i, "GSAT"],
  [/viasat|inmarsat/i, "VSAT"],
  [/sidus|lizziesat/i, "SIDU"],
  [/momentus|vigoride/i, "MNTS"],
  [/starlab/i, "VOYG"],
];

// News filter chips (in display order). Matched as whole words against title + description.
const COMPANY_KEYWORDS = {
  SPCX: ["SPCX", "SpaceX", "Starship", "Falcon", "Starlink"],
  RKLB: ["Rocket Lab", "RKLB", "Electron", "Neutron", "Peter Beck"],
  ASTS: ["AST SpaceMobile", "ASTS", "BlueBird", "Abel Avellan"],
  LUNR: ["Intuitive Machines", "LUNR", "IM-3", "IM-4", "lunar lander"],
  PL: ["Planet Labs", "Pelican"],
  BKSY: ["BlackSky", "BKSY"],
  RDW: ["Redwire", "RDW"],
  MNTS: ["Momentus", "MNTS"],
  SPCE: ["Virgin Galactic", "SPCE", "VSS"],
  KRMN: ["Karman", "KRMN"],
  SATL: ["Satellogic", "SATL"],
  KULR: ["KULR Technology", "KULR"],
  TSAT: ["Telesat", "TSAT", "Lightspeed"],
  GSAT: ["Globalstar", "GSAT"],
  VSAT: ["Viasat", "VSAT"],
  MDA: ["MDA Space", "MDA Ltd"],
  SPIR: ["Spire Global", "SPIR"],
  DXYZ: ["Destiny Tech", "DXYZ"],
  LMT: ["Lockheed Martin", "LMT"],
  FLY: ["Firefly Aerospace", "Alpha rocket"],
  OKLO: ["Oklo", "nuclear microreactor"],
  BA: ["Boeing"],
  NOC: ["Northrop Grumman", "NOC"],
  RTX: ["RTX", "Raytheon"],
  HAWK: ["HawkEye 360", "SIGINT", "RF intelligence"],
  VOYG: ["Voyager Technologies", "VOYG", "Starlab"],
  YSS: ["York Space", "YSS"],
  SIDU: ["Sidus Space", "SIDU", "LizzieSat"],
  ECHO: ["EchoStar", "Hughes"],
  "Blue Origin": ["Blue Origin", "New Glenn", "BE-4"],
  Relativity: ["Relativity Space", "Terran"],
  Vast: ["Vast Space", "Haven-1"],
  ispace: ["ispace", "HAKUTO"],
  NASA: ["NASA", "Artemis", "ISS"],
  ESA: ["ESA", "European Space Agency", "Ariane"],
  ISRO: ["ISRO", "Gaganyaan", "Chandrayaan"],
  "Space Force": ["Space Force", "USSF", "NSSL", "Golden Dome"],
};

/* ════════════════════════════════════════════════════════════════════════════
   HOOKS (data fetching, routing, storage)
   ════════════════════════════════════════════════════════════════════════════ */
/* ── Routing: real URLs ───────────────────────────────────────────────────────
   /                      home
   /markets[/launches|earnings|contracts|filings]
   /stocks/rklb           stock page (roster tickers in stocks.json)
   /feed, /newsletter, /about
   Old #hash links (e.g. #feed/news/newsletter in Reddit posts) are redirected. */
const MARKET_TABS = ["stocks", "launches", "earnings", "contracts", "filings"];

function parsePath(pathname) {
  const [first, second] = pathname.toLowerCase().split("/").filter(Boolean);
  if (!first) return { page: "home" };
  if (first === "markets") return { page: "markets", tab: MARKET_TABS.includes(second) ? second : "stocks" };
  if (first === "stocks" && second) return { page: "stock", ticker: second.toUpperCase() };
  if (["feed", "newsletter", "about"].includes(first)) return { page: first };
  return { page: "notfound" };
}

function legacyHashPath(hash) {
  const [page, tab, mode] = hash.replace("#", "").split("/");
  if (page === "feed") return mode === "newsletter" ? "/newsletter" : "/feed";
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
    return window.location.pathname;
  });
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to) => {
    if (to !== window.location.pathname) window.history.pushState(null, "", to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    title: `${route.ticker} Stock: ${p.name} News, Filings and Contracts | Orbit Alpha`,
    description: `${p.name} (${route.ticker}) live price, SEC filings, insider trades, government contracts, earnings date and launches. ${p.about}`,
  };
  const tab = route.tab && route.tab !== "stocks" ? route.tab : null;
  return {
    home: { title: "Orbit Alpha: Space Stocks Newsletter and Live Dashboard", description: "Free weekly newsletter and live dashboard covering every space stock: prices, launches, earnings, SEC filings and government contracts." },
    markets: { title: `Space Stocks ${tab ? tab[0].toUpperCase() + tab.slice(1) : "Dashboard"} | Orbit Alpha`, description: "Live prices, launches, earnings dates, SEC filings and government contract awards for publicly traded space companies." },
    feed: { title: "Space Stock News | Orbit Alpha", description: "Live news for space stocks from 30+ sources, filterable by company." },
    newsletter: { title: "The Orbit Alpha Newsletter | Free Weekly Space Stocks Briefing", description: "Every Sunday: the week in space stocks, analyst target changes and one stock deep dive. Free." },
    about: { title: "About | Orbit Alpha", description: "What Orbit Alpha is and how it is made." },
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
const formatMktCap = (v) =>
  !v ? "-"
  : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T`
  : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B`
  : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
  : `$${v}`;

// "11.2B", "$2.00T", "450M" -> number (for sorting)
function capValue(str) {
  const m = String(str || "").match(/([\d.]+)\s*([TBM])?/i);
  if (!m) return 0;
  return parseFloat(m[1]) * ({ T: 1e12, B: 1e9, M: 1e6 }[(m[2] || "").toUpperCase()] || 1);
}

async function fetchQuote(ticker, range) {
  try {
    const json = await (await fetch(`/api/quote?ticker=${ticker}&range=${range}`)).json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;
    const closes = result.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose || meta.previousClose;
    const changePct = meta.regularMarketChangePercent ?? (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);
    const cap = meta.marketCap || meta.netAssets;
    return { ticker, price, changePct, volume: meta.regularMarketVolume || 0, spark: closes, ...(cap && { mktCap: formatMktCap(cap) }) };
  } catch {
    return null;
  }
}

const fetchTicker = async (t) => (await fetchQuote(t, "7d")) || (await fetchQuote(t, "1d"));

function useLivePrices() {
  const [stocks, setStocks] = useState(STOCKS);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const apply = (results) => {
      const updates = Object.fromEntries(results.filter(Boolean).map((r) => [r.ticker, r]));
      if (!Object.keys(updates).length) return;
      setStocks((prev) => prev.map((s) => (updates[s.ticker] ? { ...s, ...updates[s.ticker] } : s)));
      setLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    };
    const rest = STOCKS.map((s) => s.ticker).filter((t) => !PRIORITY_TICKERS.includes(t));
    const load = async () => {
      apply(await Promise.all(PRIORITY_TICKERS.map(fetchTicker)));
      apply(await Promise.all(rest.map(fetchTicker)));
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
        fetch("/api/news?limit=50").then((r) => r.json()),
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
const MONO = "'DM Mono',monospace";
const SYNE = "'Syne',sans-serif";

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
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@600;700;800&display=swap');
    @keyframes flashUp{0%{background:rgba(0,255,136,0.3)}100%{background:transparent}}
    @keyframes flashDown{0%{background:rgba(255,68,102,0.3)}100%{background:transparent}}
    @keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}
    @keyframes ts{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
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
    .oa-price{text-align:right}
    @media(max-width:600px){.oa-price{text-align:left}.desk-only{display:none!important}.mob-only{display:block!important}}
  `}</style>
);

/* ── Small components ───────────────────────────────────────────────────────── */
const Skeleton = ({ w, h, style }) => <div className="skeleton" style={{ width: w, height: h, ...style }} />;

function Sparkline({ data, positive }) {
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
          ${data[hover].toFixed(2)}<span style={{ color: C.muted, marginLeft: 4 }}>D{hover + 1}</span>
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
  const items = stocks.filter((s) => s.type === "stock" || s.type === "etf");
  return (
    <div style={{ overflow: "hidden", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 0" }}>
      <div style={{ display: "flex", gap: 32, animation: "ts 50s linear infinite", width: "max-content" }}>
        {[...items, ...items].map((s, i) => (
          <span key={i} style={{ fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap", color: signColor(s.changePct) }}>
            <span style={{ color: C.muted, marginRight: 4 }}>{s.ticker}</span>${s.price.toFixed(2)}
            <span style={{ marginLeft: 3 }}>{s.changePct >= 0 ? "▲" : "▼"}{Math.abs(s.changePct).toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Subscribe ──────────────────────────────────────────────────────────────── */
async function subscribe(email) {
  if (!email?.includes("@")) { alert("Please enter a valid email address."); return false; }
  try {
    const res = await fetch(SUBSCRIBE_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    if ((await res.json()).success) { window.rdt?.("track", "SignUp"); return true; }
  } catch {}
  alert("Something went wrong. Please try again.");
  return false;
}

function SubscribeForm({ color = C.green, label = "Join Free →", onDone, style }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => { if (await subscribe(email)) { setDone(true); onDone?.(); } };
  if (done) return <div style={{ fontSize: 13, color: C.green, padding: "10px 0" }}>✓ You're subscribed. Welcome to Orbit Alpha.</div>;
  return (
    <div style={{ display: "flex", gap: 8, maxWidth: 400, ...style }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="your@email.com" style={inputStyle} />
      <button onClick={submit} style={{ background: color, color: C.bg, border: "none", padding: "10px 20px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
        {label}
      </button>
    </div>
  );
}

// Subscribe popup: shown ONCE per browser. Remembered in localStorage (works like a cookie).
const POPUP_KEY = "oa_popup_seen";
const POPUP_DELAY_MS = 5000; // time on site before it appears

function popupSeen() {
  try { return !!localStorage.getItem(POPUP_KEY); } catch { return true; } // storage blocked: don't nag
}
function markPopupSeen(value) {
  try { localStorage.setItem(POPUP_KEY, value); } catch {}
}

function SubscribePopup() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (popupSeen()) return;
    const t = setTimeout(() => {
      markPopupSeen("shown"); // recorded the moment it appears, so it never shows again even if they just close the tab
      setShow(true);
    }, POPUP_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  const close = (value) => { setShow(false); markPopupSeen(value); };
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#0d1220", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 12, padding: 32, maxWidth: 420, width: "100%", position: "relative", animation: "fu 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <button onClick={() => close(Date.now().toString())} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        <div style={{ fontSize: 9, color: C.green, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Free Weekly Newsletter</div>
        <div style={{ fontFamily: SYNE, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>The only weekly covering every space stock.</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Macro overview · Broker target changes · One stock deep dive. Every Sunday morning. Free.</div>
        <SubscribeForm onDone={() => close("subscribed")} style={{ maxWidth: "none", marginBottom: 14 }} />
        <div style={{ fontSize: 10, color: C.muted }}><span style={{ color: C.green }}>✓</span> {SUBSCRIBER_COUNT}+ subscribers · Unsubscribe anytime</div>
      </div>
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
          <h2 style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}>{title}</h2>
          {note && <span style={{ fontSize: 9, color: "#667" }}>{note}</span>}
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
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: 10, color: C.blue, flexShrink: 0, textDecoration: "none", paddingTop: 2 }}>SEC →</a>
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
      {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="oa-link" style={{ fontSize: 10, color: C.blue, flexShrink: 0, textDecoration: "none", paddingTop: 2 }}>Details →</a>}
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
const FEATURES = [
  { e: "📈", t: "Live Prices", d: "Real-time quotes, 7D charts and market cap. Updated every 5 minutes." },
  { e: "🚀", t: "Launches and Earnings", d: "Upcoming launches tagged by the stocks involved, plus confirmed earnings dates." },
  { e: "🧾", t: "Filings and Contracts", d: "Insider trades, share offerings and government contract wins, from official sources." },
];

const btn = (primary) => ({
  background: primary ? C.green : "none", color: primary ? C.bg : C.muted,
  border: primary ? "none" : "1px solid rgba(255,255,255,0.15)", padding: "11px 24px", borderRadius: 4,
  fontSize: 11, fontWeight: primary ? 700 : 400, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO, cursor: "pointer",
});

function Panel({ color, rgb, title, accent, blurb, cta, onCta, children }) {
  return (
    <section style={{ margin: "0 auto 16px", maxWidth: 920, borderRadius: 10, border: `1px solid rgba(${rgb},0.2)`, background: `rgba(${rgb},0.02)`, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{title} <span style={{ color }}>{accent}</span></div>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{blurb}</p>
        </div>
        <button onClick={onCta} style={{ background: "none", border: `1px solid rgba(${rgb},0.3)`, color, padding: "8px 16px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO, cursor: "pointer", whiteSpace: "nowrap" }}>{cta}</button>
      </div>
      {children}
    </section>
  );
}

function Home({ go, goSubscribe, news }) {
  return (
    <div style={{ animation: "fu 0.5s ease", padding: "0 20px" }}>
      <section style={{ padding: "40px 0 28px", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
        <h1 style={{ fontFamily: SYNE, fontSize: "clamp(26px,6vw,48px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.015em", color: "#fff", marginBottom: 10 }}>
          The data layer for<br /><span style={{ color: C.green }}>space equity</span> investors.
        </h1>
        <p style={{ fontSize: 13, color: C.muted, maxWidth: 380, margin: "0 auto 20px", lineHeight: 1.6 }}>Live prices, launches, earnings and news. Weekly newsletter every Sunday.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => go("/markets")} style={btn(true)}>View Markets →</button>
          <button onClick={goSubscribe} style={btn(false)}>Subscribe Free →</button>
        </div>
      </section>

      <Panel color={C.green} rgb="0,255,136" title="ORBIT" accent="MARKETS" blurb="Live prices, launches, earnings and news, updated automatically." cta="View Markets →" onCta={() => go("/markets")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {FEATURES.map((f) => (
            <div key={f.t} style={{ borderRadius: 6, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{f.e}</div>
              <div style={{ fontSize: 11, color: "#fff", marginBottom: 3, fontWeight: 500 }}>{f.t}</div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </Panel>

      <section style={{ margin: "0 auto 16px", maxWidth: 920, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
        <div style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>STOCKS WE <span style={{ color: C.green }}>COVER</span></div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Each has its own page with live price, chart, SEC filings, government contracts, earnings date and news.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(PROFILES).map(([t, p]) => (
            <Link key={t} to={`/stocks/${t.toLowerCase()}`} className="hov" title={p.name} style={{ border: "1px solid rgba(0,255,136,0.18)", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: C.green, fontWeight: 700 }}>
              {t} <span style={{ color: C.muted, fontWeight: 400 }}>{p.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Panel color={C.orange} rgb="255,150,50" title="ORBIT" accent="FEED" blurb="Live news from 30+ sources · Weekly newsletter every Sunday, all in one place." cta="View Feed →" onCta={() => go("/feed")}>
        {news.loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <Skeleton w="70%" h={11} style={{ marginBottom: 6 }} /><Skeleton w="25%" h={9} />
          </div>
        ))}
        {!news.loading && news.items.slice(0, 4).map((item, i) => (
          <div key={i} onClick={() => window.open(item.link, "_blank")} className="hov" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={sourceStyle(item.source)}>{item.source}</span>
                <span style={{ fontSize: 9, color: C.muted }}>{fmtDate(item.pubDate)}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: C.orange }}>→</span>
          </div>
        ))}
      </Panel>

      <footer style={{ padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: SYNE, fontSize: 13, fontWeight: 800, color: "#222" }}>ORBIT<span style={{ color: C.green }}>ALPHA</span>.</span>
        <span style={{ fontSize: 10, color: C.muted }}>Not financial advice · Data via Yahoo Finance & rocketlaunch.live</span>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: C.muted }}>
          <Link to="/feed" className="oa-link">Feed</Link>
          <Link to="/newsletter" className="oa-link">Newsletter</Link>
          <Link to="/about" className="oa-link">About</Link>
          <a href="mailto:OrbitAlphaApp@proton.me" style={{ color: C.muted, textDecoration: "none" }} className="hov">Contact</a>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MARKETS PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const TABS = [["stocks", "Stocks"], ["launches", "Launches"], ["earnings", "Earnings"], ["contracts", "Contracts"], ["filings", "Filings"]];
const ROW_GRID = "68px 1fr 82px 72px 72px 80px";
const sectionLabel = { fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 };
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
          <span style={{ fontSize: 10, color: oc, letterSpacing: "0.08em" }}>{open ? "MARKET OPEN" : "MARKET CLOSED"}</span>
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>
          {clock.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} ·{" "}
          {clock.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit" })} EST
        </span>
      </div>

      <div style={{ display: "flex", padding: "10px 20px 0", borderBottom: border, overflowX: "auto" }}>
        {TABS.map(([id, label]) => (
          <button key={id} className="dt" onClick={() => setTab(id)} style={{ color: active === id ? C.green : C.muted, borderBottom: `1px solid ${active === id ? C.green : "transparent"}`, marginBottom: -1, flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px 40px" }}>
        {active === "stocks" && <StocksTab prices={prices} goSubscribe={goSubscribe} />}
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

const EtfTag = () => <span style={{ fontSize: 8, color: C.blue, background: "rgba(126,184,255,0.1)", padding: "1px 4px", borderRadius: 2 }}>ETF</span>;

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
  const toggleExpand = (t) => setExpanded((e) => (e === t ? null : t));
  const handleSort = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  const flashClass = (t) => (flash[t] ? `flash-${flash[t]}` : "");

  const q = search.toLowerCase();
  const sortVal = (s) => (sort.col === "mktCap" ? capValue(s.mktCap) : s[sort.col]);
  const filtered = stocks
    .filter((s) => (sector === "All" || s.sector === sector) && (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) && (!watchOnly || watchlist.includes(s.ticker)))
    .sort((a, b) => (sort.col ? (sort.dir === "desc" ? 1 : -1) * (sortVal(b) - sortVal(a)) : 0));

  return (
    <div>
      <TopGainers stocks={stocks} isLive={isLive} onPick={toggleExpand} />
      {isLive && <TodaySummary stocks={stocks} onPick={toggleExpand} />}

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
        <div style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 6, padding: "7px 8px", fontSize: 9, color: C.text, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
            <div className={`hov ${flashClass(s.ticker)}`} onClick={() => toggleExpand(s.ticker)} style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 6, padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Star on={watchlist.includes(s.ticker)} onClick={() => toggleWatch(s.ticker)} />
                <span style={{ fontWeight: 700, color: C.green, fontSize: 12 }}>{s.ticker}</span>
                {s.type === "etf" && <EtfTag />}
              </div>
              <div><div style={{ fontSize: 12, color: "#fff" }}>{s.name}</div><div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{s.sector}</div></div>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>${s.price.toFixed(2)}</span>
              <ChangeBadge v={s.changePct} />
              <span style={{ color: C.text, fontSize: 10 }}>{s.mktCap}</span>
              <Sparkline data={s.spark} positive={s.changePct >= 0} />
            </div>
            {expanded === s.ticker && <StockDetail s={s} goSubscribe={goSubscribe} />}
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="mob-only">
        {filtered.map((s) => (
          <div key={s.ticker} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, marginBottom: 8, background: "rgba(255,255,255,0.01)", overflow: "hidden" }}>
            <div className={flashClass(s.ticker)} onClick={() => toggleExpand(s.ticker)} style={{ padding: "12px 14px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={16} on={watchlist.includes(s.ticker)} onClick={() => toggleWatch(s.ticker)} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{s.ticker}</span>
                  {s.type === "etf" && <EtfTag />}
                  <span style={{ fontSize: 11, color: C.muted }}>{s.name}</span>
                </div>
                <ChangeBadge v={s.changePct} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: "#fff", fontWeight: 500 }}>${s.price.toFixed(2)}</span>
                <span style={{ fontSize: 10, color: C.muted }}>{s.mktCap}</span>
              </div>
              <div style={{ fontSize: 8, color: C.muted, marginBottom: 3, letterSpacing: "0.08em" }}>7D</div>
              <Sparkline data={s.spark} positive={s.changePct >= 0} />
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 9, color: C.light }}>{expanded === s.ticker ? "▲ tap to close" : "▼ tap for more"}</div>
            </div>
            {expanded === s.ticker && <StockDetail s={s} goSubscribe={goSubscribe} />}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 12 }}>No results.</div>}
    </div>
  );
}

function TopGainers({ stocks, isLive, onPick }) {
  const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionLabel}>Top Gainers Today · {isLive ? "Live" : "Demo"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
        {gainers.map((s, i) => (
          <div key={s.ticker} onClick={() => onPick(s.ticker)} className="hov" style={{ background: `rgba(0,255,136,${0.04 + ((5 - i) / 5) * 0.12})`, border: "1px solid rgba(0,255,136,0.12)", borderRadius: 5, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 3 }}>{s.ticker}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{pct(s.changePct)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>${s.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodaySummary({ stocks, onPick }) {
  const eq = stocks.filter((s) => s.type === "stock");
  const byChange = [...eq].sort((a, b) => b.changePct - a.changePct);
  const byVolume = eq.filter((s) => s.volume > 0).sort((a, b) => b.volume - a.volume);
  const vol = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`);
  const cards = [
    { label: "Top Gainer", s: byChange[0], c: C.green, val: (s) => pct(s.changePct) },
    { label: "Top Loser", s: byChange[byChange.length - 1], c: C.red, val: (s) => pct(s.changePct) },
    { label: "Highest Volume", s: byVolume[0], c: C.blue, val: (s) => vol(s.volume) },
  ];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={sectionLabel}>Today · 1D</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {cards.map(({ label, s, c, val }) => s && (
          <div key={label} onClick={() => onPick(s.ticker)} className="hov" style={{ border: `1px solid ${c}22`, borderRadius: 6, padding: "10px 14px", background: `${c}08` }}>
            <div style={{ ...sectionLabel, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{s.ticker}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: c }}>{val(s)}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>${s.price.toFixed(2)}</div>
          </div>
        ))}
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
        {stat("Current Price", `$${s.price.toFixed(2)}`)}
        {stat("1D Change", pct(s.changePct, 2), signColor(s.changePct))}
        {stat("Mkt Cap", s.mktCap || "-")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.light, background: "rgba(255,255,255,0.04)", padding: "5px 10px", borderRadius: 3 }}>{s.sector}</span>
        {link("View on Yahoo Finance →", C.blue, () => window.open(`https://finance.yahoo.com/quote/${s.ticker}`, "_blank"))}
        {PROFILES[s.ticker] && (
          <Link to={`/stocks/${s.ticker.toLowerCase()}`} style={{ border: "1px solid rgba(0,255,136,0.4)", background: "rgba(0,255,136,0.08)", color: C.green, fontSize: 10, padding: "5px 10px", borderRadius: 3, fontWeight: 700 }}>
            Full {s.ticker} page: filings, contracts, earnings →
          </Link>
        )}
        {link(`${s.ticker} in this week's issue →`, C.green, goSubscribe)}
      </div>
    </div>
  );
}

/* ── Launches ───────────────────────────────────────────────────────────────── */
const STATUS_STYLE = {
  GO: ["rgba(0,255,136,0.08)", C.green],
  HOLD: ["rgba(255,100,0,0.08)", "#ff8844"],
};

function LaunchCard({ l }) {
  const [bg, color] = STATUS_STYLE[l.status] || ["rgba(255,255,255,0.04)", "#888"];
  return (
    <div style={{ border, borderRadius: 8, padding: 14, marginBottom: 8, background: "rgba(255,255,255,0.01)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>{l.date}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {l.tickers.map((t) => <TickerChip key={t} ticker={t} />)}
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: bg, color }}>{l.status}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#bbb" }}>{l.mission}</div>
      {l.location && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{l.location}</div>}
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
      <SourceNote>Source: rocketlaunch.live. Tickers show the launch provider or payload owner where we can identify them.</SourceNote>
    </div>
  );
}

/* ── Earnings (live, from /api/earnings) ──────────────────────────────────── */
function EarningsTab() {
  const { data, error } = useApi("/api/earnings");
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 14 }}>Upcoming Earnings · Stocks We Cover</div>
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
      <div style={{ ...sectionLabel, marginBottom: 4 }}>Government Contract Awards · Last 12 Months</div>
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
      <div style={{ ...sectionLabel, marginBottom: 4 }}>Notable SEC Filings · Last 3 Weeks</div>
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
   STOCK PAGE  (/stocks/rklb)
   ════════════════════════════════════════════════════════════════════════════ */
const CHART_RANGES = [["1mo", "1M"], ["3mo", "3M"], ["6mo", "6M"], ["1y", "1Y"]];

function PriceChart({ points }) {
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
          ${hp.c.toFixed(2)} <span style={{ color: C.muted, marginLeft: 4 }}>{new Date(hp.t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#667", marginTop: 4 }}>
        <span>Low ${min.toFixed(2)}</span><span>High ${max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function StockPage({ ticker, prices, launches, news, goSubscribe }) {
  const profile = PROFILES[ticker];
  const [range, setRange] = useState("6mo");
  const chart = useApi(profile ? `/api/quote?ticker=${ticker}&range=${range}` : null);
  const filings = useApi(profile ? `/api/filings?ticker=${ticker}` : null);
  const contracts = useApi(profile ? `/api/contracts?ticker=${ticker}` : null);
  const earnings = useApi(profile ? "/api/earnings" : null);
  if (!profile) return <NotFound />;

  const live = prices.stocks.find((x) => x.ticker === ticker);
  const result = chart.data?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const points = (result?.timestamp || []).map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c != null);
  const rangeChange = points.length > 1 ? (points[points.length - 1].c / points[0].c - 1) * 100 : null;
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
            <h1 style={{ fontFamily: SYNE, fontSize: 34, fontWeight: 800, color: C.green, letterSpacing: "-0.01em" }}>{ticker}</h1>
            <span style={{ fontSize: 16, color: "#fff" }}>{profile.name}</span>
            <span style={{ fontSize: 9, color: C.light, border: "1px solid rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.sector}</span>
          </div>
        </div>
        {live && (
          <div className="oa-price">
            <div style={{ fontSize: 28, color: "#fff", fontWeight: 500 }}>${live.price.toFixed(2)}</div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: signColor(live.changePct), fontWeight: 600 }}>{pct(live.changePct, 2)} today</span>
              {live.mktCap && live.mktCap !== "ETF" && <span style={{ color: C.muted }}> · Mkt cap {live.mktCap}</span>}
            </div>
          </div>
        )}
      </header>
      <p style={{ fontSize: 13, color: C.light, lineHeight: 1.7, maxWidth: 720, marginBottom: 20 }}>{profile.about}</p>

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
        {!chart.data && !chart.error ? <Skeleton w="100%" h={190} /> : <PriceChart points={points} />}
      </Card>

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

      {/* Filings and contracts */}
      <div className="oa-grid" style={{ marginBottom: 14 }}>
        <Card title="SEC filings" note="Last 4 months">
          {!filings.data && !filings.error && <ListSkeleton />}
          {(filings.error || filings.data?.filings?.length === 0) && <Empty>{ticker === "MDA" ? "MDA Space files in Canada (SEDAR+), not with the SEC." : "No notable SEC filings in the last 4 months."}</Empty>}
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

      {/* Newsletter */}
      <section style={{ ...cardStyle, border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.03)", marginBottom: 24 }}>
        <div style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Follow {ticker} without the noise</div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>{profile.name} and every other space stock, summarised in one free email every Sunday.</p>
        <SubscribeForm />
      </section>

      {/* Internal links: other stocks */}
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Other stocks we cover</div>
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
      <Link to="/markets" style={{ color: C.green, fontSize: 12 }}>Go to Markets →</Link>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
        {Object.keys(PROFILES).map((t) => <TickerChip key={t} ticker={t} />)}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FEED PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const FILTERS = ["All", ...Object.keys(COMPANY_KEYWORDS)];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEYWORD_RE = Object.fromEntries(
  Object.entries(COMPANY_KEYWORDS).map(([co, kws]) => [co, new RegExp(`\\b(${kws.map(escape).join("|")})\\b`, "i")])
);
const matches = (item, co) => item.ticker === co || !!KEYWORD_RE[co]?.test(`${item.title} ${item.description || ""}`);

const pill = (on) => ({
  background: on ? "rgba(255,150,50,0.15)" : "transparent", border: `1px solid ${on ? "rgba(255,150,50,0.3)" : "transparent"}`,
  color: on ? C.orange : C.muted, padding: "7px 18px", borderRadius: 4, fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap",
});
const badge = (color, rgb) => ({ position: "absolute", top: 12, right: 12, fontSize: 9, color, background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.1em" });

function Feed({ news, feedMode, setFeedMode }) { // feedMode: "news" (/feed) or "newsletter" (/newsletter)
  const [company, setCompany] = useState("All");
  const items = company === "All" ? news.items : news.items.filter((i) => matches(i, company));

  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 800, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: SYNE, fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 6 }}>ORBIT <span style={{ color: C.orange }}>FEED</span></div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>News and analysis for space equity investors.</p>
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 3, gap: 2 }}>
          <button onClick={() => setFeedMode("news")} style={pill(feedMode !== "newsletter")}>📰 News</button>
          <button onClick={() => setFeedMode("newsletter")} style={pill(feedMode === "newsletter")}>✉ Newsletter</button>
        </div>
      </div>

      {feedMode !== "newsletter" ? (
        <div style={{ animation: "fu 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 11, color: C.muted }}>Live space stock news from 30+ sources, updated every 5 minutes.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.green }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "bk 1.5s infinite" }} />LIVE
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
            {FILTERS.map((co) => (
              <span key={co} onClick={() => setCompany(co)} className="stg" style={{ fontSize: 9, color: company === co ? C.orange : C.light, borderColor: company === co ? "rgba(255,150,50,0.3)" : "rgba(255,255,255,0.2)", background: company === co ? "rgba(255,150,50,0.05)" : "transparent" }}>{co}</span>
            ))}
          </div>

          {news.loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <Skeleton w="70%" h={13} style={{ marginBottom: 8 }} /><Skeleton w="30%" h={10} />
            </div>
          ))}
          {!news.loading && items.length === 0 && <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 12 }}>No stories for {company} right now.</div>}
          {!news.loading && items.map((item, i) => (
            <div key={i} onClick={() => window.open(item.link, "_blank")} className="hov"
              style={{ padding: 16, cursor: "pointer", animation: `fu 0.3s ease ${Math.min(i, 20) * 0.02}s both`, borderRadius: item.highlight ? 6 : 0, marginBottom: item.highlight ? 8 : 0, background: item.highlight ? "rgba(255,204,0,0.03)" : "transparent", border: item.highlight ? "1px solid rgba(255,204,0,0.15)" : "none", borderBottom: item.highlight ? "1px solid rgba(255,204,0,0.15)" : "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={sourceStyle(item.source)}>{item.source}</span>
                  {item.highlight && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(255,204,0,0.1)", color: C.yellow, letterSpacing: "0.08em" }}>⚡ KEY STORY</span>}
                </div>
                <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{fmtDate(item.pubDate, true)}</span>
              </div>
              <div style={{ fontSize: 14, color: item.highlight ? "#fff" : C.text, lineHeight: 1.65, fontWeight: item.highlight ? 500 : 400, marginBottom: 6 }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item.description}</div>}
              <div style={{ fontSize: 10, color: C.orange, marginTop: 8, opacity: 0.8 }}>Read full article →</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ animation: "fu 0.2s ease" }}>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>Every Sunday: macro overview, broker target changes and one stock deep dive. Free.</p>
          <SubscribeForm color={C.orange} style={{ marginBottom: 28 }} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>All Issues</div>
          {issues.map((issue, i) => (
            <div key={issue.issue} className="hov" onClick={() => issue.live && window.open(issue.url, "_blank")}
              style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 20, marginBottom: 10, background: "rgba(255,255,255,0.01)", cursor: issue.live ? "pointer" : "default", opacity: issue.live ? 1 : 0.5, position: "relative" }}>
              {!issue.live && <span style={badge(C.yellow, "255,204,0")}>COMING SUNDAY</span>}
              {i === 0 && issue.live && <span style={badge(C.green, "0,255,136")}>LATEST</span>}
              <div style={{ fontSize: 10, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Issue #{issue.issue} · {issue.date}</div>
              <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.4 }}>{issue.headline}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: issue.live ? 10 : 0 }}>{issue.summary}</div>
              {issue.live && <div style={{ fontSize: 10, color: C.orange, opacity: 0.7 }}>Read issue →</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   ════════════════════════════════════════════════════════════════════════════ */
const P = ({ children, mb = 16 }) => <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: mb }}>{children}</p>;
const Rule = ({ mb = 24 }) => <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: `20px 0 ${mb}px` }} />;

function About() {
  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ fontFamily: SYNE, fontSize: 28, fontWeight: 800, color: "#fff" }}>ABOUT <span style={{ color: C.green }}>ORBIT ALPHA</span></div>
      <Rule mb={20} />
      <P>Orbit Alpha is a free dashboard and weekly newsletter built for retail investors who follow space equities. It covers every publicly traded space stock, ETF and private company, with live prices, launch catalysts, broker target changes and weekly deep dives.</P>
      <P>The newsletter goes out every Sunday morning and covers three things: a macro overview of the week in space stocks, a broker pulse showing all analyst rating and price target changes, and one stock of the week (bull case, bear case, key catalysts, honest view on valuation).</P>
      <P mb={32}>Everything is free. No paywall. No signup required to use the dashboard.</P>
      <Rule />
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Get in touch</div>
      <a href="mailto:OrbitAlphaApp@proton.me" style={{ color: C.green, fontSize: 13, textDecoration: "none" }}>📬 OrbitAlphaApp@proton.me</a>
      <SubscribeForm label="Subscribe →" style={{ marginTop: 24 }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   APP SHELL
   ════════════════════════════════════════════════════════════════════════════ */
const NAV = [["/", "home", "Home"], ["/markets", "markets", "Markets"], ["/feed", "feed", "Feed"], ["/newsletter", "newsletter", "Newsletter"]];

export default function App() {
  const [route, navigate] = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const prices = useLivePrices();
  const launches = useLaunches();
  const news = useNews();

  const { page } = route;
  const path = page === "stock" ? `/stocks/${route.ticker.toLowerCase()}` : window.location.pathname;
  useDocumentMeta(route, path);
  const latest = issues[0];

  const go = (to) => { setMenuOpen(false); navigate(to); };
  const goSubscribe = () => go("/newsletter");
  const share = () =>
    navigator.share
      ? navigator.share({ title: document.title, url: window.location.href })
      : navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"));

  const marketChrome = page === "home" || page === "markets";
  const showTicker = marketChrome || page === "stock";
  const navBtn = { background: "none", border: "1px solid rgba(255,255,255,0.1)", color: C.light, padding: "7px 12px", borderRadius: 4, fontSize: 10, letterSpacing: "0.06em", fontFamily: MONO, cursor: "pointer" };

  return (
    <NavContext.Provider value={go}>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: MONO, fontSize: 13, position: "relative", overflowX: "hidden" }}>
      <GlobalStyles />
      <SubscribePopup />
      <Stars />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden", opacity: 0.02 }}>
        <div style={{ position: "absolute", width: "100%", height: 2, background: "linear-gradient(transparent,rgba(0,255,136,1),transparent)", animation: "sc 10s linear infinite" }} />
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
          <Link to="/" style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>ORBIT</span><span style={{ color: C.green }}>ALPHA.</span>
          </Link>
          <div className="desk-only" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 28 }}>
            {NAV.map(([to, p, l]) => (
              <Link key={p} to={to} style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: page === p ? C.green : C.muted, borderBottom: `1px solid ${page === p ? C.green : "transparent"}`, paddingBottom: 2 }}>{l}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="desk-only" onClick={goSubscribe} style={{ ...navBtn, background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", color: C.green, letterSpacing: "0.1em", textTransform: "uppercase" }}>Subscribe Free</button>
            <button className="desk-only" onClick={share} style={navBtn}>Share ↗</button>
            <button className="mob-only" onClick={() => setMenuOpen(!menuOpen)} style={{ ...navBtn, padding: "6px 10px", fontSize: 16 }}>{menuOpen ? "✕" : "☰"}</button>
          </div>
        </nav>

        {menuOpen && (
          <div style={{ background: "#070a14", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map(([to, p, l]) => (
              <Link key={p} to={to} style={{ color: page === p ? C.green : C.light, padding: "10px 0", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{l}</Link>
            ))}
            <button onClick={goSubscribe} style={{ background: C.green, color: C.bg, border: "none", padding: 11, borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO, cursor: "pointer", marginTop: 8 }}>Subscribe Free →</button>
          </div>
        )}

        {showTicker && <TickerStrip stocks={prices.stocks} />}

        {page === "home" && (
          <div onClick={() => latest.live && window.open(latest.url, "_blank")} className={latest.live ? "hov" : ""} style={{ background: "rgba(126,184,255,0.06)", borderBottom: "1px solid rgba(126,184,255,0.12)", padding: "8px 20px", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: C.blue, letterSpacing: "0.04em" }}>
              📬 <strong>Issue #{latest.issue} {latest.live ? "is live" : "coming Sunday"}</strong> · {latest.headline}
              {latest.live && <span style={{ marginLeft: 10, opacity: 0.6 }}>Read now →</span>}
            </span>
          </div>
        )}

        {marketChrome && (
          <div style={{ background: prices.isLive ? "rgba(0,255,136,0.05)" : "rgba(255,204,0,0.07)", borderBottom: `1px solid ${prices.isLive ? "rgba(0,255,136,0.15)" : "rgba(255,204,0,0.15)"}`, padding: "8px 16px", textAlign: "center", fontSize: 11, letterSpacing: "0.04em", color: prices.isLive ? C.green : C.yellow }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "bk 1.5s infinite", marginRight: 8 }} />
            {prices.isLive ? `LIVE DATA · Updated ${prices.lastUpdated}` : "⚠ DEMO DATA ONLY. All prices and metrics are illustrative."}
          </div>
        )}

        {page === "home" && <Home go={go} goSubscribe={goSubscribe} news={news} />}
        {page === "markets" && <Markets prices={prices} launches={launches} tab={route.tab} setTab={(t) => go(t === "stocks" ? "/markets" : `/markets/${t}`)} goSubscribe={goSubscribe} />}
        {page === "stock" && <StockPage key={route.ticker} ticker={route.ticker} prices={prices} launches={launches} news={news} goSubscribe={goSubscribe} />}
        {(page === "feed" || page === "newsletter") && <Feed news={news} feedMode={page === "newsletter" ? "newsletter" : "news"} setFeedMode={(m) => go(m === "newsletter" ? "/newsletter" : "/feed")} />}
        {page === "about" && <About />}
        {page === "notfound" && <NotFound />}
      </div>
    </div>
    </NavContext.Provider>
  );
}
