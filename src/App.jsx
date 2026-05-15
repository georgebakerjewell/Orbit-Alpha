import { useState, useEffect, useRef } from "react";

const BEEHIIV_URL = "https://orbit-alpha.beehiiv.com/subscribe";

const EARNINGS = [
  {ticker:"RKLB",name:"Rocket Lab",date:"May 8, 2026",time:"After Market Close",watch:"Neutron development · Electron launch cadence · Space Systems revenue"},
  {ticker:"ASTS",name:"AST SpaceMobile",date:"May 11, 2026",time:"Before Market Open",watch:"BlueBird 7 impact on guidance · Block 2 launch timeline · Cash runway"},
  {ticker:"OKLO",name:"Oklo",date:"May 13, 2026",time:"After Market Close",watch:"NRC licensing progress · Power purchase agreement pipeline"},
  {ticker:"BKSY",name:"BlackSky Technology",date:"May 14, 2026",time:"Before Market Open",watch:"Defence contract pipeline · Imagery analytics revenue"},
  {ticker:"SPIR",name:"Spire Global",date:"May 15, 2026",time:"After Market Close",watch:"Government data contract wins · GNSS-R revenue"},
  {ticker:"LUNR",name:"Intuitive Machines",date:"May 19, 2026",time:"After Market Close",watch:"$900M–$1B 2026 guidance confirmation · IM-3 mission update"},
  {ticker:"SPCE",name:"Virgin Galactic",date:"May 20, 2026",time:"After Market Close",watch:"Commercial service launch date · Cash burn rate"},
  {ticker:"RDW",name:"Redwire",date:"May 22, 2026",time:"Before Market Open",watch:"ISS contract extensions · UK expansion progress"},
  {ticker:"PL",name:"Planet Labs",date:"Jun 26, 2026",time:"After Market Close",watch:"Free cash flow guidance · Government contract renewals · Pelican progress"},
];

const STOCKS = [
  { ticker:"RKLB", name:"Rocket Lab", price:24.82, changePct:15.9, mktCap:"11.2B", short:"12.4%", sentiment:78, mentions:1842, sector:"Launch", type:"stock" },
  { ticker:"ASTS", name:"AST SpaceMobile", price:31.17, changePct:4.1, mktCap:"6.8B", short:"18.2%", sentiment:65, mentions:2103, sector:"Comms", type:"stock" },
  { ticker:"LUNR", name:"Intuitive Machines", price:8.44, changePct:-6.8, mktCap:"0.9B", short:"22.1%", sentiment:44, mentions:731, sector:"Lunar", type:"stock" },
  { ticker:"PL", name:"Planet Labs", price:3.91, changePct:2.1, mktCap:"0.7B", short:"9.8%", sentiment:55, mentions:412, sector:"Earth Obs", type:"stock" },
  { ticker:"BKSY", name:"BlackSky Technology", price:6.14, changePct:3.2, mktCap:"0.4B", short:"8.1%", sentiment:58, mentions:287, sector:"Earth Obs", type:"stock" },
  { ticker:"RDW", name:"Redwire", price:11.23, changePct:4.1, mktCap:"0.8B", short:"7.3%", sentiment:61, mentions:289, sector:"Hardware", type:"stock" },
  { ticker:"MNTS", name:"Momentus", price:1.82, changePct:-5.7, mktCap:"0.1B", short:"31.4%", sentiment:31, mentions:156, sector:"Transport", type:"stock" },
  { ticker:"SPCE", name:"Virgin Galactic", price:2.14, changePct:-3.2, mktCap:"0.5B", short:"28.9%", sentiment:29, mentions:943, sector:"Tourism", type:"stock" },
  { ticker:"KRMN", name:"Karman Space", price:18.40, changePct:1.8, mktCap:"1.2B", short:"6.2%", sentiment:62, mentions:341, sector:"Hardware", type:"stock" },
  { ticker:"SATL", name:"Satellogic", price:1.23, changePct:-2.4, mktCap:"0.2B", short:"11.2%", sentiment:38, mentions:142, sector:"Earth Obs", type:"stock" },
  { ticker:"KULR", name:"KULR Technology", price:1.94, changePct:3.3, mktCap:"0.3B", short:"12.7%", sentiment:57, mentions:221, sector:"Hardware", type:"stock" },
  { ticker:"TSAT", name:"Telesat", price:9.81, changePct:-0.8, mktCap:"0.5B", short:"7.6%", sentiment:48, mentions:134, sector:"Comms", type:"stock" },
  { ticker:"GSAT", name:"Globalstar", price:1.67, changePct:1.4, mktCap:"3.1B", short:"5.2%", sentiment:52, mentions:445, sector:"Comms", type:"stock" },
  { ticker:"VSAT", name:"Viasat", price:14.32, changePct:-1.1, mktCap:"1.8B", short:"9.3%", sentiment:46, mentions:312, sector:"Comms", type:"stock" },
  { ticker:"MDA", name:"MDA Space", price:19.44, changePct:0.6, mktCap:"2.1B", short:"4.8%", sentiment:60, mentions:198, sector:"Hardware", type:"stock" },
  { ticker:"SPIR", name:"Spire Global", price:4.22, changePct:2.9, mktCap:"0.4B", short:"13.1%", sentiment:56, mentions:267, sector:"Earth Obs", type:"stock" },
  { ticker:"GILT", name:"Gilat Satellite", price:7.88, changePct:0.3, mktCap:"0.3B", short:"3.2%", sentiment:49, mentions:87, sector:"Comms", type:"stock" },
  { ticker:"DXYZ", name:"Destiny Tech100", price:38.44, changePct:4.2, mktCap:"1.1B", short:"22.3%", sentiment:67, mentions:612, sector:"Private Access", type:"stock" },
  { ticker:"LMT", name:"Lockheed Martin", price:441.20, changePct:0.4, mktCap:"105B", short:"1.2%", sentiment:55, mentions:892, sector:"Defence", type:"large" },
  { ticker:"FLY", name:"Firefly Aerospace", price:14.82, changePct:2.1, mktCap:"1.8B", short:"8.4%", sentiment:63, mentions:521, sector:"Launch", type:"stock" },
  { ticker:"OKLO", name:"Oklo", price:22.14, changePct:1.8, mktCap:"2.4B", short:"11.2%", sentiment:58, mentions:334, sector:"Energy", type:"stock" },
  { ticker:"BA", name:"Boeing", price:172.40, changePct:-0.6, mktCap:"120B", short:"2.1%", sentiment:42, mentions:1203, sector:"Defence", type:"large" },
  { ticker:"NOC", name:"Northrop Grumman", price:489.20, changePct:0.3, mktCap:"72B", short:"1.4%", sentiment:51, mentions:445, sector:"Defence", type:"large" },
  { ticker:"RTX", name:"RTX Corp", price:138.60, changePct:0.8, mktCap:"181B", short:"0.9%", sentiment:53, mentions:623, sector:"Defence", type:"large" },
  { ticker:"UFO", name:"Procure Space ETF", price:18.92, changePct:1.8, mktCap:"ETF", short:"—", sentiment:61, mentions:334, sector:"ETF", type:"etf" },
  { ticker:"ARKX", name:"ARK Space ETF", price:22.14, changePct:2.3, mktCap:"ETF", short:"—", sentiment:64, mentions:521, sector:"ETF", type:"etf" },
  { ticker:"NASA", name:"Tema Space Innovators ETF", price:24.18, changePct:3.1, mktCap:"ETF", short:"—", sentiment:71, mentions:389, sector:"ETF", type:"etf" },
  { ticker:"MARS", name:"Roundhill Space & Tech ETF", price:30.52, changePct:0.0, mktCap:"ETF", short:"—", sentiment:70, mentions:180, sector:"ETF", type:"etf" },
  { ticker:"ROKT", name:"SPDR Kensho Final Frontiers ETF", price:42.18, changePct:0.0, mktCap:"ETF", short:"—", sentiment:66, mentions:210, sector:"ETF", type:"etf" },
  { ticker:"SATS", name:"EchoStar Corporation", price:28.44, changePct:0.0, mktCap:"2.4B", short:"8.2%", sentiment:58, mentions:290, sector:"Comms", type:"stock" },
  { ticker:"VOYG", name:"Voyager Technologies", price:31.49, changePct:0.0, mktCap:"1.9B", short:"8.4%", sentiment:62, mentions:310, sector:"Defence", type:"stock" },
  { ticker:"YSS", name:"York Space Systems", price:33.61, changePct:0.0, mktCap:"4.3B", short:"6.2%", sentiment:65, mentions:280, sector:"Defence", type:"stock" },
  { ticker:"HAWK", name:"HawkEye 360", price:34.00, changePct:30.0, mktCap:"3.1B", short:"—", sentiment:72, mentions:412, sector:"Earth Obs", type:"stock" },
];

const PRIVATE = [
  { name:"SpaceX", desc:"Starship, Starlink, Falcon 9. The dominant force in commercial launch.", valuation:"~$350B", sentiment:88, news:"Starship IFT-7 targeting Apr 28. Starlink V3 constellation deployment ongoing." },
  { name:"Blue Origin", desc:"New Glenn orbital rocket, New Shepard tourism. Jeff Bezos backed.", valuation:"~$12B", sentiment:52, news:"New Glenn manifesting commercial payloads for H2 2026." },
  { name:"Relativity Space", desc:"3D-printed rockets. Terran R in development targeting orbital 2026.", valuation:"~$4.2B", sentiment:58, news:"Terran R propulsion test milestone confirmed Q1 2026." },
  { name:"Vast Space", desc:"Commercial space stations. Haven-1 targeting 2026 launch via SpaceX.", valuation:"~$3.5B", sentiment:63, news:"Haven-1 launch window confirmed late 2026, crew selection underway." },
];

const AGENCIES = [
  { name:"NASA", country:"🇺🇸", type:"Civil Agency", focus:"Artemis lunar programme, ISS, commercial cargo contracts", sentiment:71, news:"Artemis III crew announcement expected Q3 2026. $2.4B in new commercial awards." },
  { name:"Space Force", country:"🇺🇸", type:"Military", focus:"National security launch, GPS, satellite comms, NSSL contracts", sentiment:64, news:"NSSL Phase 3 Lane 2 awards — RKLB and SpaceX named as winners." },
  { name:"ESA", country:"🇪🇺", type:"Civil Agency", focus:"Ariane 6, Earth observation, science missions, Copernicus", sentiment:58, news:"Ariane 6 commercial cadence increasing through 2026. Funding review ongoing." },
  { name:"ISRO", country:"🇮🇳", type:"Civil Agency", focus:"PSLV, GSLV, Chandrayaan lunar, Gaganyaan crewed programme", sentiment:66, news:"Gaganyaan crewed mission targeting late 2026. Commercial launch services expanding." },
];

const LAUNCHES = [
  { date:"Est. May 2026", mission:"RKLB – Electron / LOXSAT-1 (NASA Tipping Point)", status:"GO", impact:"+4.2% avg", ticker:"RKLB" },
  { date:"Est. May 2026", mission:"RKLB – Electron / Synspective SAR Satellite", status:"GO", impact:"+3.8% avg", ticker:"RKLB" },
  { date:"Mid-Jun 2026", mission:"SpaceX – Falcon 9 / ASTS BlueBird 8-9-10 (Block 2)", status:"GO", impact:"+12.4% avg", ticker:"ASTS" },
  { date:"Est. Jun 2026", mission:"RKLB – Electron / VICTUS HAZE (US Space Force)", status:"GO", impact:"+4.5% avg", ticker:"RKLB" },
  { date:"Est. Jun 10", mission:"JAXA – H3-30 / VEP-5 + smallsats", status:"GO", impact:"Sector +0.5%", ticker:null },
  { date:"Est. Aug 2026", mission:"SpaceX – Dragon / CRS-35 (ISS resupply)", status:"GO", impact:"Sector +0.8%", ticker:null },
  { date:"Est. Aug 15", mission:"RKLB – Electron / NASA Aspera (UV telescope)", status:"GO", impact:"+3.5% avg", ticker:"RKLB" },
  { date:"SUMMER 2026", mission:"SpaceX – IPO Roadshow", status:"CONFIRMED", impact:"Sector re-rating", ticker:null },
];

const SPARKDATA = {
  RKLB:[18,19,17,20,21,19,22,24,23,24.82], ASTS:[28,27,29,30,29,28,30,31,30,31.17],
  LUNR:[10,9.5,9,8.8,9.2,9,8.5,8.6,8.5,8.44], PL:[3.5,3.6,3.7,3.6,3.8,3.9,3.8,3.9,3.9,3.91],
  RDW:[10,10.2,10.5,10.8,11,10.7,11,11.1,11.2,11.23], MNTS:[2.2,2.1,2,1.95,1.9,1.88,1.85,1.82,1.83,1.82],
  SPCE:[2.5,2.4,2.3,2.25,2.2,2.2,2.15,2.1,2.12,2.14], BKSY:[5.2,5.5,5.8,5.9,6.1,5.9,6.0,6.1,6.0,6.14],
  KRMN:[16,17,17.5,18,17.8,18.2,18.5,18.3,18.4,18.40], GSAT:[1.5,1.55,1.6,1.62,1.65,1.64,1.66,1.67,1.66,1.67],
  LMT:[438,440,439,441,440,442,441,440,441,441.20], DXYZ:[34,35,36,37,36,37,38,38,38,38.44],
  UFO:[17.5,18,18.2,18.5,18.3,18.6,18.8,18.9,19,18.92], ARKX:[20,21,21.5,22,21.8,22,22.1,22.2,22,22.14],
  MARS:[27,28,29,30,29.5,30.2,30.5,30.8,30.6,30.52],
  ROKT:[38,39,40,41,40.5,41.2,41.8,42.1,41.9,42.18],
  SATS:[24,25,26,27,26.5,27.2,27.8,28.1,28.3,28.44],
  IRDM:[28,29,30,31,30.5,31.0,31.2,31.4,31.1,31.22],
  VOYG:[28,30,32,35,33,31,32,31.5,31.8,31.49],
  YSS:[38,36,34,33,35,34,33.5,34,33.8,33.61],
  NASA:[20,21,22,22.5,23,23.2,23.8,24,24.1,24.18],
  FLY:[12,13,13.5,14,13.8,14.2,14.5,14.6,14.7,14.82], OKLO:[18,19,20,21,20.5,21,21.5,22,22,22.14],
  BA:[175,174,173,172,171,172,173,172,172,172.40], NOC:[485,487,488,490,489,490,489,489,489,489.20],
  RTX:[135,136,137,138,137,138,138,139,138,138.60],
  SPIR:[3.8,3.9,4.0,4.1,4.0,4.1,4.2,4.1,4.2,4.22], VSAT:[15,14.8,14.5,14.3,14.4,14.2,14.3,14.4,14.3,14.32],
  MDA:[18,18.5,19,19.2,19.1,19.3,19.4,19.5,19.4,19.44], KULR:[1.7,1.75,1.8,1.82,1.85,1.88,1.9,1.92,1.93,1.94],
  TSAT:[10.2,10,9.8,9.9,9.8,9.7,9.8,9.9,9.8,9.81],
  HAWK:[26,27,28,29,30,31,32,33,34,34.00],
};

const SECTORS = ["All","Launch","Comms","Earth Obs","Hardware","Lunar","Tourism","Transport","Defence","Energy","ETF","Private Access"];

// ── URL hash helpers ──────────────────────────────────────────────────────────
function readHash() {
  const hash = window.location.hash.replace("#", "");
  const [page, tab, feedMode] = hash.split("/");
  return {
    page: page || "home",
    tab: tab || "stocks",
    feedMode: feedMode || "news",
  };
}

function writeHash(page, tab, feedMode) {
  const parts = [page];
  if (page === "markets") parts.push(tab || "stocks");
  if (page === "feed") parts.push(tab || "stocks", feedMode || "news");
  window.location.hash = parts.join("/");
}

function Sparkline({ data, positive }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length===0) return <div style={{width:"100%",height:28}}/>;
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const w=72,h=28;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*h}`).join(" ");
  const color=positive?"#00ff88":"#ff4466";
  const hoverX=hoverIdx!==null?(hoverIdx/(data.length-1))*w:null;
  const hoverY=hoverIdx!==null?h-((data[hoverIdx]-min)/range)*h:null;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <svg width={w} height={h} style={{overflow:"visible",cursor:"crosshair"}}
        onMouseLeave={()=>setHoverIdx(null)}
        onMouseMove={e=>{
          const rect=e.currentTarget.getBoundingClientRect();
          const x=e.clientX-rect.left;
          const idx=Math.round((x/w)*(data.length-1));
          setHoverIdx(Math.max(0,Math.min(data.length-1,idx)));
        }}>
        <defs><linearGradient id={`g${positive?1:0}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g${positive?1:0})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        {hoverIdx!==null&&<>
          <line x1={hoverX} y1={0} x2={hoverX} y2={h} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6"/>
          <circle cx={hoverX} cy={hoverY} r="2.5" fill={color}/>
        </>}
      </svg>
      {hoverIdx!==null&&(
        <div style={{position:"absolute",bottom:"110%",left:"50%",transform:"translateX(-50%)",background:"#0a0f1e",border:`1px solid ${color}`,borderRadius:4,padding:"3px 8px",fontSize:10,color:"#fff",whiteSpace:"nowrap",pointerEvents:"none",zIndex:99}}>
          ${data[hoverIdx].toFixed(2)}
          <span style={{color:"#aab8c2",marginLeft:4}}>D{hoverIdx+1}</span>
        </div>
      )}
    </div>
  );
}

function Stars() {
  const stars = [
    {x:5,y:8},{x:12,y:22},{x:18,y:5},{x:25,y:35},{x:31,y:14},{x:38,y:48},{x:44,y:7},{x:51,y:28},{x:57,y:62},{x:63,y:18},
    {x:69,y:41},{x:75,y:9},{x:81,y:55},{x:87,y:25},{x:93,y:72},{x:8,y:45},{x:15,y:68},{x:22,y:82},{x:29,y:55},{x:36,y:75},
    {x:43,y:88},{x:50,y:72},{x:58,y:91},{x:65,y:78},{x:72,y:65},{x:79,y:85},{x:86,y:42},{x:92,y:58},{x:3,y:92},{x:97,y:15},
    {x:10,y:38},{x:20,y:12},{x:33,y:95},{x:47,y:52},{x:54,y:38},{x:61,y:85},{x:68,y:30},{x:76,y:72},{x:83,y:18},{x:90,y:88},
    {x:7,y:75},{x:16,y:55},{x:24,y:42},{x:41,y:22},{x:48,y:68},{x:55,y:15},{x:66,y:48},{x:73,y:8},{x:88,y:35},{x:95,y:62},
  ];
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {stars.map((st,i)=>(
        <div key={i} style={{position:"absolute",left:`${st.x}%`,top:`${st.y}%`,width:i%3===0?1.8:i%3===1?1.2:1,height:i%3===0?1.8:i%3===1?1.2:1,borderRadius:"50%",background:"#fff",opacity:i%3===0?0.18:i%3===1?0.14:0.10}}/>
      ))}
    </div>
  );
}

function TickerStrip({ stocks }) {
  const items=stocks.filter(s=>s.type==="stock"||s.type==="etf");
  return (
    <div style={{overflow:"hidden",background:"rgba(0,0,0,0.5)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"6px 0"}}>
      <div style={{display:"flex",gap:32,animation:"ts 50s linear infinite",width:"max-content"}}>
        {[...items,...items].map((s,i)=>(
          <span key={i} style={{fontSize:11,fontFamily:"monospace",whiteSpace:"nowrap",color:s.changePct>=0?"#00ff88":"#ff4466"}}>
            <span style={{color:"#aab8c2",marginRight:4}}>{s.ticker}</span>${s.price.toFixed(2)}<span style={{marginLeft:3}}>{s.changePct>=0?"▲":"▼"}{Math.abs(s.changePct).toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THREADS PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TICKER_LIST = ["RKLB","ASTS","LUNR","PL","BKSY","RDW","MNTS","SPCE","KRMN","SATL","KULR","TSAT","GSAT","VSAT","MDA","SPIR","DXYZ","LMT","FLY","OKLO","BA","NOC","RTX","UFO","ARKX","HAWK","VOYG","YSS","SATS"];

const SORT_OPTIONS = [
  { id: "hot",      label: "🔥 Hot" },
  { id: "new",      label: "🕐 New" },
  { id: "top",      label: "⬆ Top" },
  { id: "comments", label: "💬 Most discussed" },
];

function hotScore(thread) {
  const score = (thread.upvotes || 0) - (thread.downvotes || 0);
  const ageHours = (Date.now() - new Date(thread.time).getTime()) / 3_600_000;
  return score / Math.pow(ageHours + 2, 1.5);
}

function ThreadsPage({ go }) {
  const [allThreads, setAllThreads]       = useState({});
  const [loading, setLoading]             = useState(false);
  const [activeTicker, setActiveTicker]   = useState("ALL");
  const [openThread, setOpenThread]       = useState(null);
  const [showCompose, setShowCompose]     = useState(false);
  const [newTitle, setNewTitle]           = useState("");
  const [newBody, setNewBody]             = useState("");
  const [newComment, setNewComment]       = useState({});
  const [votes, setVotes]                 = useState({});
  const [posting, setPosting]             = useState(false);
  const [sortBy, setSortBy]               = useState("hot");
  const [timeFilter, setTimeFilter]       = useState("all");

  const [username, setUsername]           = useState(() => localStorage.getItem("oa_username") || "");
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const API = "/api/threads";

  const saveUsername = () => {
    const u = usernameInput.trim().replace(/\s+/g, "_").slice(0, 20);
    if (!u) return;
    localStorage.setItem("oa_username", u);
    setUsername(u);
    setShowUsernamePrompt(false);
    setUsernameInput("");
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const requireUsername = (action) => {
    if (username) { action(); return; }
    setPendingAction(() => action);
    setShowUsernamePrompt(true);
  };

  const fetchTicker = async (ticker) => {
    try {
      const res  = await fetch(`${API}?ticker=${ticker}`);
      const data = await res.json();
      return Array.isArray(data) ? data.map(t => ({ ...t, _ticker: ticker })) : [];
    } catch { return []; }
  };

  const fetchAll = async () => {
    setLoading(true);
    if (activeTicker === "ALL") {
      const batches = [];
      for (let i = 0; i < TICKER_LIST.length; i += 6) batches.push(TICKER_LIST.slice(i, i + 6));
      const results = {};
      for (const batch of batches) {
        const settled = await Promise.allSettled(batch.map(t => fetchTicker(t)));
        settled.forEach((r, i) => { results[batch[i]] = r.status === "fulfilled" ? r.value : []; });
        await new Promise(r => setTimeout(r, 200));
      }
      setAllThreads(results);
    } else {
      const threads = await fetchTicker(activeTicker);
      setAllThreads(prev => ({ ...prev, [activeTicker]: threads }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [activeTicker]);

  const rawThreads = activeTicker === "ALL"
    ? Object.values(allThreads).flat()
    : (allThreads[activeTicker] || []);

  const timeFiltered = rawThreads.filter(t => {
    if (timeFilter === "all") return true;
    const age = Date.now() - new Date(t.time).getTime();
    if (timeFilter === "today") return age < 86_400_000;
    if (timeFilter === "week")  return age < 7 * 86_400_000;
    if (timeFilter === "month") return age < 30 * 86_400_000;
    return true;
  });

  const sorted = [...timeFiltered].sort((a, b) => {
    if (sortBy === "new")      return new Date(b.time) - new Date(a.time);
    if (sortBy === "top")      return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
    if (sortBy === "comments") return (b.comments?.length||0) - (a.comments?.length||0);
    return hotScore(b) - hotScore(a);
  });

  const postThread = async () => {
    if (!newTitle.trim() || posting) return;
    const ticker = activeTicker === "ALL" ? "RKLB" : activeTicker;
    setPosting(true);
    try {
      const res  = await fetch(`${API}?ticker=${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "thread", author: username, thread: { title: newTitle.trim(), body: newBody.trim() } }),
      });
      const data = await res.json();
      setAllThreads(prev => ({ ...prev, [ticker]: Array.isArray(data) ? data.map(t => ({ ...t, _ticker: ticker })) : [] }));
      setNewTitle(""); setNewBody(""); setShowCompose(false);
    } catch {}
    setPosting(false);
  };

  const postComment = async (ticker, threadId) => {
    const text = newComment[threadId]?.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res  = await fetch(`${API}?ticker=${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", author: username, threadId, comment: text }),
      });
      const data = await res.json();
      setAllThreads(prev => ({ ...prev, [ticker]: Array.isArray(data) ? data.map(t => ({ ...t, _ticker: ticker })) : [] }));
      setNewComment(prev => ({ ...prev, [threadId]: "" }));
    } catch {}
    setPosting(false);
  };

  const handleVote = async (ticker, targetId, dir) => {
    if (votes[targetId] === dir) return;
    setVotes(prev => ({ ...prev, [targetId]: dir }));
    try {
      const res  = await fetch(`${API}?ticker=${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "vote", targetId, dir }),
      });
      const data = await res.json();
      setAllThreads(prev => ({ ...prev, [ticker]: Array.isArray(data) ? data.map(t => ({ ...t, _ticker: ticker })) : [] }));
    } catch {}
  };

  const getScore = (item, id) => {
    const vote  = votes[id];
    let score   = (item.upvotes || 0) - (item.downvotes || 0);
    if (vote === "up")   score += 1;
    if (vote === "down") score -= 1;
    return score;
  };

  const formatTime = (iso) => {
    try {
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60)    return "just now";
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch { return ""; }
  };

  const openThreadData = openThread
    ? (allThreads[openThread.ticker] || []).find(t => t.id === openThread.id)
    : null;

  const purple = "#a78bfa";
  const purpleFaint = "rgba(167,139,250,0.15)";

  return (
    <div style={{ animation: "fu 0.3s ease", maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>

      {showUsernamePrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0d1220", border: `1px solid ${purpleFaint}`, borderRadius: 12, padding: 28, maxWidth: 360, width: "100%", animation: "fu 0.2s ease" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Pick a username</div>
            <p style={{ fontSize: 12, color: "#aab8c2", lineHeight: 1.6, marginBottom: 16 }}>Shows on all your posts. Stored locally — no signup needed.</p>
            <input
              autoFocus value={usernameInput}
              onChange={e => setUsernameInput(e.target.value.replace(/\s+/g, "_").slice(0, 20))}
              onKeyDown={e => e.key === "Enter" && saveUsername()}
              placeholder="e.g. launchpad_77"
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${purpleFaint}`, color: "#fff", padding: "10px 14px", borderRadius: 6, fontSize: 13, fontFamily: "'DM Mono',monospace", outline: "none", marginBottom: 8 }}
            />
            <div style={{ fontSize: 10, color: "#aab8c2", marginBottom: 16 }}>Max 20 chars · spaces → underscores</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowUsernamePrompt(false); setPendingAction(null); setUsernameInput(""); }}
                style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#aab8c2", padding: 10, borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveUsername} disabled={!usernameInput.trim()}
                style={{ flex: 2, background: purple, color: "#04060e", border: "none", padding: 10, borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", opacity: usernameInput.trim() ? 1 : 0.4 }}>
                Set Username →
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              ORBIT <span style={{ color: purple }}>THREADS</span>
            </div>
            <div style={{ fontSize: 11, color: "#aab8c2", marginTop: 4 }}>
              Discuss any space stock.{" "}
              {username
                ? <span>Posting as <span style={{ color: purple }}>{username}</span> · <span onClick={() => { setUsernameInput(username); setShowUsernamePrompt(true); }} style={{ color: purple, cursor: "pointer", textDecoration: "underline" }}>change</span></span>
                : <span onClick={() => setShowUsernamePrompt(true)} style={{ color: purple, cursor: "pointer", textDecoration: "underline" }}>Set a username to post</span>
              }
            </div>
          </div>
          {!openThread && (
            <button onClick={() => requireUsername(() => setShowCompose(c => !c))}
              style={{ background: showCompose ? "rgba(167,139,250,0.08)" : "rgba(167,139,250,0.12)", border: `1px solid ${purpleFaint}`, color: purple, padding: "9px 18px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.06em", flexShrink: 0 }}>
              {showCompose ? "✕ Cancel" : "+ New Thread"}
            </button>
          )}
        </div>
      </div>

      {!openThread && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => { setActiveTicker("ALL"); setShowCompose(false); }}
              style={{
                background: activeTicker === "ALL" ? "rgba(167,139,250,0.15)" : "transparent",
                border: `1px solid ${activeTicker === "ALL" ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: activeTicker === "ALL" ? purple : "#aab8c2",
                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: "'DM Mono',monospace",
                cursor: "pointer", transition: "all 0.15s", fontWeight: activeTicker === "ALL" ? 700 : 400,
              }}>
              ALL
            </button>
            <span style={{ color: "#334", fontSize: 11, alignSelf: "center", margin: "0 2px" }}>·</span>
            {TICKER_LIST.map(t => {
              const isActive = activeTicker === t;
              const count = (allThreads[t] || []).length;
              return (
                <button key={t} onClick={() => { setActiveTicker(t); setShowCompose(false); setOpenThread(null); }}
                  style={{
                    position: "relative", background: isActive ? "rgba(167,139,250,0.12)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.07)"}`,
                    color: isActive ? purple : "#aab8c2", padding: "5px 10px", borderRadius: 20,
                    fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}>
                  {t}
                  {count > 0 && (
                    <span style={{ marginLeft: 5, fontSize: 9, color: isActive ? purple : "#556", background: isActive ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)", padding: "0px 4px", borderRadius: 8 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openThread && openThreadData && (() => {
        const thread = openThreadData;
        const ticker = openThread.ticker;
        const score  = getScore(thread, thread.id);
        const vote   = votes[thread.id];
        return (
          <div style={{ animation: "fu 0.2s ease" }}>
            <button onClick={() => setOpenThread(null)}
              style={{ background: "none", border: "none", color: purple, fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer", padding: "0 0 18px", display: "flex", alignItems: "center", gap: 6 }}>
              ← Back to <span style={{ color: "#fff" }}>{activeTicker === "ALL" ? ticker : activeTicker}</span> threads
            </button>

            <div style={{ border: `1px solid rgba(167,139,250,0.25)`, borderRadius: 10, padding: "20px 22px", marginBottom: 20, background: "rgba(167,139,250,0.03)" }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 28, paddingTop: 2 }}>
                  <button onClick={() => handleVote(ticker, thread.id, "up")} style={voteBtn(vote === "up", "#00ff88")}>▲</button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: score > 0 ? "#00ff88" : score < 0 ? "#ff4466" : "#aab8c2" }}>{score}</span>
                  <button onClick={() => handleVote(ticker, thread.id, "down")} style={voteBtn(vote === "down", "#ff4466")}>▼</button>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 9, color: purple }}>{thread.author}</span>
                    <span style={{ fontSize: 9, color: "#334" }}>·</span>
                    <span style={{ fontSize: 9, color: "#aab8c2" }}>{formatTime(thread.time)}</span>
                    <span style={{ fontSize: 9, color: "#00ff88", background: "rgba(0,255,136,0.06)", padding: "1px 7px", borderRadius: 4 }}>{ticker}</span>
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>{thread.title}</div>
                  {thread.body && <div style={{ fontSize: 13, color: "#ccd0d8", lineHeight: 1.75 }}>{thread.body}</div>}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 9, color: "#aab8c2", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              {thread.comments?.length || 0} comment{(thread.comments?.length || 0) !== 1 ? "s" : ""}
            </div>

            {(thread.comments || []).map(comment => {
              const cs   = getScore(comment, comment.id);
              const cvote = votes[comment.id];
              return (
                <div key={comment.id} style={{ borderLeft: `2px solid rgba(167,139,250,0.15)`, paddingLeft: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 22, paddingTop: 2 }}>
                      <button onClick={() => handleVote(ticker, comment.id, "up")} style={voteBtn(cvote === "up", "#00ff88", 12)}>▲</button>
                      <span style={{ fontSize: 10, color: cs > 0 ? "#00ff88" : cs < 0 ? "#ff4466" : "#aab8c2" }}>{cs}</span>
                      <button onClick={() => handleVote(ticker, comment.id, "down")} style={voteBtn(cvote === "down", "#ff4466", 12)}>▼</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#aab8c2", marginBottom: 5 }}>
                        <span style={{ color: purple }}>{comment.author}</span>
                        <span style={{ color: "#334", margin: "0 5px" }}>·</span>
                        {formatTime(comment.time)}
                      </div>
                      <div style={{ fontSize: 13, color: "#ccd0d8", lineHeight: 1.65 }}>{comment.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <input
                value={newComment[thread.id] || ""}
                onChange={e => setNewComment(prev => ({ ...prev, [thread.id]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && requireUsername(() => postComment(ticker, thread.id))}
                placeholder={username ? "Add a comment..." : "Set a username to reply..."}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "10px 14px", borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }}
              />
              <button onClick={() => requireUsername(() => postComment(ticker, thread.id))} disabled={posting}
                style={{ background: purple, color: "#04060e", border: "none", padding: "10px 18px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", whiteSpace: "nowrap", opacity: posting ? 0.6 : 1 }}>
                {posting ? "..." : "Reply →"}
              </button>
            </div>
          </div>
        );
      })()}

      {!openThread && (
        <div>
          {showCompose && (
            <div style={{ background: "rgba(167,139,250,0.04)", border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 10, padding: "18px 20px", marginBottom: 16, animation: "fu 0.2s ease" }}>
              <div style={{ fontSize: 9, color: purple, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                New thread · {activeTicker === "ALL" ? "RKLB" : activeTicker} · posting as <span style={{ color: "#fff" }}>{username}</span>
                {activeTicker === "ALL" && <span style={{ color: "#aab8c2", marginLeft: 6 }}>(defaults to RKLB when posting from All)</span>}
              </div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Thread title..."
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "10px 14px", borderRadius: 6, fontSize: 13, fontFamily: "'DM Mono',monospace", outline: "none", marginBottom: 8 }}
              />
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Your thoughts... (optional)" rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "10px 14px", borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none", resize: "vertical", display: "block", marginBottom: 12 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowCompose(false); setNewTitle(""); setNewBody(""); }}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#aab8c2", padding: "8px 16px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={() => requireUsername(postThread)} disabled={posting || !newTitle.trim()}
                  style={{ background: purple, color: "#04060e", border: "none", padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", opacity: (posting || !newTitle.trim()) ? 0.5 : 1 }}>
                  {posting ? "Posting..." : "Post Thread →"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 3 }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setSortBy(opt.id)}
                  style={{ background: sortBy === opt.id ? "rgba(167,139,250,0.15)" : "transparent", border: sortBy === opt.id ? `1px solid rgba(167,139,250,0.3)` : "1px solid transparent", color: sortBy === opt.id ? purple : "#aab8c2", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {[["all","All time"],["today","Today"],["week","This week"],["month","This month"]].map(([val,label]) => (
                <button key={val} onClick={() => setTimeFilter(val)}
                  style={{ background: timeFilter === val ? "rgba(255,255,255,0.07)" : "transparent", border: `1px solid ${timeFilter === val ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`, color: timeFilter === val ? "#fff" : "#aab8c2", padding: "6px 10px", borderRadius: 6, fontSize: 10, fontFamily: "'DM Mono',monospace", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#aab8c2", marginBottom: 14 }}>
            {loading
              ? <span style={{ color: "#334" }}>Loading{activeTicker === "ALL" ? " all tickers..." : ` ${activeTicker}...`}</span>
              : <span>{sorted.length} thread{sorted.length !== 1 ? "s" : ""}{activeTicker !== "ALL" ? <span> on <span style={{ color: purple, fontWeight: 700 }}>{activeTicker}</span></span> : <span> across <span style={{ color: purple, fontWeight: 700 }}>all tickers</span></span>}</span>
            }
          </div>

          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px", marginBottom: 8, display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", minWidth: 28 }}>
                <div className="skeleton" style={{ width: 14, height: 10, borderRadius: 2 }} />
                <div className="skeleton" style={{ width: 18, height: 14, borderRadius: 2 }} />
                <div className="skeleton" style={{ width: 14, height: 10, borderRadius: 2 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 11, width: "20%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: "65%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 10, width: "40%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 9, width: "25%" }} />
              </div>
            </div>
          ))}

          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.25 }}>💬</div>
              <div style={{ fontSize: 13, color: "#aab8c2", lineHeight: 1.7 }}>
                No threads{timeFilter !== "all" ? " in this time period" : ""} for {activeTicker === "ALL" ? "any ticker" : activeTicker}.<br />
                <span onClick={() => requireUsername(() => setShowCompose(true))} style={{ color: purple, cursor: "pointer" }}>
                  Start the first one →
                </span>
              </div>
            </div>
          )}

          {!loading && sorted.map(thread => {
            const ticker = thread._ticker || activeTicker;
            const score  = getScore(thread, thread.id);
            const vote   = votes[thread.id];
            const commentCount = thread.comments?.length || 0;
            return (
              <div key={`${ticker}-${thread.id}`}
                style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 18px", marginBottom: 8, background: "rgba(255,255,255,0.01)", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.22)"; e.currentTarget.style.background = "rgba(167,139,250,0.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 28, paddingTop: 2, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); handleVote(ticker, thread.id, "up"); }} style={voteBtn(vote === "up", "#00ff88", 13)}>▲</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: score > 0 ? "#00ff88" : score < 0 ? "#ff4466" : "#aab8c2", lineHeight: 1 }}>{score}</span>
                    <button onClick={e => { e.stopPropagation(); handleVote(ticker, thread.id, "down"); }} style={voteBtn(vote === "down", "#ff4466", 13)}>▼</button>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpenThread({ ticker, id: thread.id })}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: purple, fontWeight: 600 }}>{thread.author}</span>
                      <span style={{ fontSize: 9, color: "#334" }}>·</span>
                      <span style={{ fontSize: 9, color: "#aab8c2" }}>{formatTime(thread.time)}</span>
                      {activeTicker === "ALL" && (
                        <span style={{ fontSize: 9, color: "#00ff88", background: "rgba(0,255,136,0.07)", padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>{ticker}</span>
                      )}
                    </div>

                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 5, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{thread.title}</div>

                    {thread.body && (
                      <div style={{ fontSize: 12, color: "#aab8c2", lineHeight: 1.6, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {thread.body}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "#556" }}>
                        💬 <span style={{ color: commentCount > 0 ? "#aab8c2" : "#334" }}>{commentCount}</span> {commentCount === 1 ? "comment" : "comments"}
                      </span>
                      <span style={{ fontSize: 11, color: "#334" }}>·</span>
                      <span style={{ fontSize: 11, color: purple, opacity: 0.7 }}>view thread →</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function voteBtn(active, color, size = 14) {
  return {
    background: "none", border: "none", cursor: "pointer",
    fontSize: size, color: active ? color : "#445",
    lineHeight: 1, padding: 0, transition: "color 0.1s",
  };
}

const PROXY_URL = "/api/quote";
const ALL_TICKERS = STOCKS.map(s=>s.ticker);

const formatMktCap = (v) => {
  if(!v) return "—";
  if(v >= 1e12) return `$${(v/1e12).toFixed(2)}T`;
  if(v >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
  if(v >= 1e6) return `$${(v/1e6).toFixed(0)}M`;
  return `$${v}`;
};

export default function App() {
  // ── Initialise from URL hash ────────────────────────────────────────────────
  const initialState = readHash();
  const [page,setPage]=useState(initialState.page);
  const [tab,setTab]=useState(initialState.tab);
  const [feedMode,setFeedMode]=useState(initialState.feedMode);

  // Sync state → hash whenever page/tab/feedMode changes
  useEffect(() => {
    writeHash(page, tab, feedMode);
  }, [page, tab, feedMode]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onHashChange = () => {
      const s = readHash();
      setPage(s.page);
      setTab(s.tab);
      setFeedMode(s.feedMode);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const [sector,setSector]=useState("All");
  const [search,setSearch]=useState("");
  const [email,setEmail]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [liveStocks,setLiveStocks]=useState(STOCKS);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [popupEmail, setPopupEmail] = useState("");
  const [popupSubmitted, setPopupSubmitted] = useState(false);

  useEffect(()=>{
    const handleMouseLeave = (e) => { if(e.clientY <= 0 && !popupDismissed && !popupSubmitted) setShowExitPopup(true); };
    const handleScroll = () => {
      if(popupDismissed || popupSubmitted) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if(scrolled / total >= 0.9) setShowExitPopup(true);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, {passive:true});
    return ()=>{ document.removeEventListener('mouseleave', handleMouseLeave); window.removeEventListener('scroll', handleScroll); };
  },[popupDismissed, popupSubmitted]);

  const dismissPopup = () => { setShowExitPopup(false); setPopupDismissed(true); };

  const subscribe = async (emailAddress, onSuccess) => {
    if(!emailAddress || !emailAddress.includes('@')) { alert('Please enter a valid email address.'); return; }
    try {
      const res = await fetch('https://www.orbitalpha.cloud/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress }),
      });
      const data = await res.json();
      if(data.success) { onSuccess(); } else { alert('Something went wrong. Please try again.'); }
    } catch(e) { alert('Something went wrong. Please try again.'); }
  };

  const submitPopup = () => { subscribe(popupEmail, ()=>{ setPopupSubmitted(true); setShowExitPopup(false); }); };
  const sub = () => { subscribe(email, ()=>setSubmitted(true)); };

  const SUBSCRIBER_COUNT = 200;
  const [lastUpdated,setLastUpdated]=useState(null);
  const [isLive,setIsLive]=useState(false);

  const fetchQuote = async (ticker, range="7d") => {
    try {
      const res = await fetch(`${PROXY_URL}?ticker=${ticker}&range=${range}`);
      const parsed = await res.json();
      const meta = parsed?.chart?.result?.[0]?.meta;
      const quotes = parsed?.chart?.result?.[0]?.indicators?.quote?.[0];
      if(!meta) return null;
      const price = meta.regularMarketPrice || meta.previousClose;
      const closePrices = quotes?.close?.filter(Boolean) || [];
      const prevClose = closePrices.length >= 2 ? closePrices[closePrices.length - 2] : meta.chartPreviousClose || meta.previousClose;
      const changePct = meta.regularMarketChangePercent !== undefined ? meta.regularMarketChangePercent : prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const change = meta.regularMarketChange !== undefined ? meta.regularMarketChange : price - prevClose;
      const mktCap = meta.marketCap ? formatMktCap(meta.marketCap) : meta.netAssets ? formatMktCap(meta.netAssets) : null;
      const volume = meta.regularMarketVolume || 0;
      const closes = quotes?.close?.filter(Boolean) || [];
      return { ticker, price, changePct, change, mktCap, volume, sparkline: closes };
    } catch(e) { return null; }
  };

  const fetchOneTicker = async (t) => {
    const [r7, r3, r1] = await Promise.allSettled([fetchQuote(t,"7d"),fetchQuote(t,"3d"),fetchQuote(t,"1d")]);
    const base = r7.value || r3.value || r1.value;
    if(!base) return null;
    return { ...base, spark7d: r7.value?.sparkline||[], spark3d: r3.value?.sparkline||[], spark1d: r1.value?.sparkline||[] };
  };

  const applyUpdates = (results) => {
    const updates = {};
    results.forEach(r => {
      if(r.status==="fulfilled" && r.value) {
        const d = r.value;
        updates[d.ticker] = { price:d.price, changePct:d.changePct, change:d.change, ...(d.mktCap&&{mktCap:d.mktCap}), ...(d.volume&&{volume:d.volume}), spark7d:d.spark7d, spark3d:d.spark3d, spark1d:d.spark1d, liveSparkline:d.spark7d };
      }
    });
    if(Object.keys(updates).length > 0) {
      setLiveStocks(prev => prev.map(s => updates[s.ticker] ? {...s,...updates[s.ticker]} : s));
      setLastUpdated(new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}));
      setIsLive(true);
    }
  };

  const fetchAllPrices = async () => {
    try {
      const tickers = ALL_TICKERS.slice(0,35);
      // Priority tickers: fetch all at once immediately so the page feels live within ~1-2s
      const PRIORITY = ["RKLB","ASTS","LUNR","PL","HAWK","BKSY","RDW","SPCE","OKLO","LMT"];
      const rest = tickers.filter(t => !PRIORITY.includes(t));

      // Round 1: all priority tickers in parallel — no delay, paint live data fast
      const priorityResults = await Promise.allSettled(PRIORITY.map(fetchOneTicker));
      applyUpdates(priorityResults);

      // Round 2: remaining tickers in parallel — no artificial delay
      const restResults = await Promise.allSettled(rest.map(fetchOneTicker));
      applyUpdates(restResults);
    } catch(e) { console.log("Fetch error:", e); }
  };

  useEffect(()=>{ fetchAllPrices(); const interval = setInterval(fetchAllPrices, 300000); return ()=>clearInterval(interval); },[]);

  const [clock, setClock] = useState(new Date());
  useEffect(()=>{ const t = setInterval(()=>setClock(new Date()), 1000); return ()=>clearInterval(t); },[]);

  const [newsSource, setNewsSource] = useState("");
  const [newsCompany, setNewsCompany] = useState("");

  const [liveLaunches, setLiveLaunches] = useState(LAUNCHES);
  useEffect(()=>{
    const fetchLaunches = async () => {
      try {
        const res = await fetch('/api/launches');
        const data = await res.json();
        if(data.result && data.result.length > 0) {
          const now = Date.now() / 1000;
          const mapped = data.result
            .filter(l => { if(!l.sort_date) return true; return l.sort_date > now; })
            .map(l => {
              const ticker = l.provider?.slug?.includes('rocket-lab') ? 'RKLB' : l.name?.includes('BlueBird')||l.missions?.[0]?.name?.includes('BlueBird') ? 'ASTS' : l.name?.includes('Intuitive')||l.missions?.[0]?.name?.includes('IM-') ? 'LUNR' : null;
              const status = l.result === 1 ? 'SUCCESS' : l.win_open ? 'GO' : 'TBD';
              return { date:l.date_str||'TBD', mission:`${l.provider?.name||''} – ${l.vehicle?.name||''} / ${l.missions?.[0]?.name||l.name||''}`, status, impact:ticker==='RKLB'?'+4.2% avg':ticker==='ASTS'?'+12.4% avg':ticker==='LUNR'?'+8.1% avg':'Sector avg', ticker };
            });
          setLiveLaunches(mapped);
        }
      } catch(e) { console.log('Launch fetch error:', e); }
    };
    fetchLaunches();
    const interval = setInterval(fetchLaunches, 3600000);
    return ()=>clearInterval(interval);
  },[]);

  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(()=>{
    const fetchNews = async () => {
      try {
        const [rssRes, yahooRes] = await Promise.allSettled([
          fetch('/api/news?limit=50').then(r=>r.json()),
          fetch(`/api/yahoonews?t=${Date.now()}`).then(r=>r.json()),
        ]);
        const rssItems = rssRes.status==='fulfilled' && Array.isArray(rssRes.value) ? rssRes.value : [];
        const yahooItems = yahooRes.status==='fulfilled' && Array.isArray(yahooRes.value) ? yahooRes.value : [];
        const seenTitles = new Set();
        const combined = [...yahooItems, ...rssItems]
          .filter(item => { const key = item.title?.toLowerCase().slice(0,40); if(!key||seenTitles.has(key)) return false; seenTitles.add(key); return true; })
          .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
        setNewsItems(combined); setNewsLoading(false);
      } catch(e) { console.log('News fetch error:', e); setNewsLoading(false); }
    };
    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return ()=>clearInterval(interval);
  },[]);

  const isMarketOpen = ()=>{
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US",{timeZone:"America/New_York"}));
    const day=est.getDay(); const h=est.getHours(); const m=est.getMinutes(); const mins=h*60+m;
    return day>=1 && day<=5 && mins>=570 && mins<960;
  };

  const [watchlist, setWatchlist] = useState(()=>{ try { return JSON.parse(localStorage.getItem('oa_watchlist')||'[]'); } catch { return []; } });
  const toggleWatch = (ticker) => { setWatchlist(prev => { const next = prev.includes(ticker) ? prev.filter(t=>t!==ticker) : [...prev,ticker]; localStorage.setItem('oa_watchlist',JSON.stringify(next)); return next; }); };
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  const [stockNews, setStockNews] = useState({});
  const fetchStockNews = async (ticker) => {
    if(stockNews[ticker]) return;
    try {
      const res = await fetch(`/api/yahoonews?ticker=${ticker}`);
      const data = await res.json();
      setStockNews(prev => ({...prev,[ticker]:data.slice(0,3)}));
    } catch(e) {}
  };

  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const handleSort = (col) => { if(sortCol===col) setSortDir(d=>d==="desc"?"asc":"desc"); else { setSortCol(col); setSortDir("desc"); } };

  const [flashMap, setFlashMap] = useState({});
  const prevPrices = useRef({});
  useEffect(()=>{
    const flashes = {};
    liveStocks.forEach(s=>{ const prev=prevPrices.current[s.ticker]; if(prev!==undefined&&prev!==s.price) flashes[s.ticker]=s.price>prev?"up":"down"; prevPrices.current[s.ticker]=s.price; });
    if(Object.keys(flashes).length>0){ setFlashMap(flashes); setTimeout(()=>setFlashMap({}),600); }
  },[liveStocks]);

  const [expandedTicker, setExpandedTicker] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ if(isLive) setLoading(false); const t=setTimeout(()=>setLoading(false),3000); return ()=>clearTimeout(t); },[isLive]);

  // ── Navigation helper ───────────────────────────────────────────────────────
  // go(page, tab, feedMode?) — also handles the special "subscribe" shortcut
  const go=(p,t,fm)=>{
    setPage(p);
    if(t) setTab(t);
    if(fm) setFeedMode(fm);
    setMenuOpen(false);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  // Dedicated subscribe helper — goes to feed / newsletter tab
  const goSubscribe = () => go("feed", "news", "newsletter");

  const filtered = (() => {
    let arr = liveStocks.filter(s=>{
      const ms=sector==="All"||s.sector===sector;
      const mq=s.ticker.toLowerCase().includes(search.toLowerCase())||s.name.toLowerCase().includes(search.toLowerCase());
      const mw=!showWatchlistOnly||watchlist.includes(s.ticker);
      return ms&&mq&&mw;
    });
    if(sortCol) {
      arr = [...arr].sort((a,b)=>{
        let av=sortCol==="price"?a.price:sortCol==="changePct"?a.changePct:sortCol==="mktCap"?(parseFloat(a.mktCap?.replace(/[^0-9.]/g,""))||0):0;
        let bv=sortCol==="price"?b.price:sortCol==="changePct"?b.changePct:sortCol==="mktCap"?(parseFloat(b.mktCap?.replace(/[^0-9.]/g,""))||0):0;
        return sortDir==="desc"?bv-av:av-bv;
      });
    }
    return arr;
  })();

  const NAV_ITEMS = [["home","Home"],["markets","Markets"],["feed","Feed"],["threads","Threads"]];

  return (
    <div style={{minHeight:"100vh",background:"#04060e",color:"#dde1ec",fontFamily:"'DM Mono',monospace",fontSize:13,position:"relative",overflowX:"hidden"}}>

      {showExitPopup&&(
        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,animation:"fu 0.3s ease",maxWidth:340,width:"calc(100% - 48px)"}}>
          <div style={{background:"#0d1220",border:"1px solid rgba(0,255,136,0.2)",borderRadius:8,padding:"24px",boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
            <button onClick={dismissPopup} style={{position:"absolute",top:10,right:14,background:"none",border:"none",color:"#ccd0d8",fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
            <div style={{fontSize:9,color:"#00ff88",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Free Weekly Newsletter</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:8}}>The only weekly covering every space stock.</div>
            <div style={{fontSize:11,color:"#aab8c2",lineHeight:1.6,marginBottom:16}}>Macro overview · Broker target changes · One stock deep dive. Every Sunday morning.</div>
            {popupSubmitted ? (
              <div style={{fontSize:13,color:"#00ff88",padding:"10px 0"}}>✓ You're subscribed. Welcome to Orbit Alpha.</div>
            ) : (
              <>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <input value={popupEmail} onChange={e=>setPopupEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitPopup()} placeholder="your@email.com" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",padding:"9px 12px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none",minWidth:0}}/>
                  <button onClick={submitPopup} style={{background:"#00ff88",color:"#04060e",border:"none",padding:"9px 14px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Join →</button>
                </div>
                <div style={{fontSize:10,color:"#aab8c2",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:"#00ff88"}}>✓</span> {SUBSCRIBER_COUNT}+ subscribers · Free · Unsubscribe anytime
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
        @keyframes flashUp{0%{background:rgba(0,255,136,0.3)}100%{background:transparent}}
        @keyframes flashDown{0%{background:rgba(255,68,102,0.3)}100%{background:transparent}}
        @keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}
        .flash-up{animation:flashUp 0.6s ease}.flash-down{animation:flashDown 0.6s ease}
        .skeleton{background:rgba(255,255,255,0.06);border-radius:3px;animation:shimmer 1.5s infinite}
        @keyframes ts{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bk{0%,100%{opacity:1}50%{opacity:0.1}}
        @keyframes sc{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08)}
        .hov:hover{background:rgba(255,255,255,0.03)!important;cursor:pointer}
        .dt{background:none;border:none;cursor:pointer;padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;white-space:nowrap}
        .stg{cursor:pointer;font-size:10px;padding:4px 10px;border-radius:3px;border:1px solid rgba(255,255,255,0.08);transition:all 0.15s;white-space:nowrap}.stg:hover{border-color:rgba(0,255,136,0.3);color:#00ff88}
        input,button,textarea{outline:none}
        @media(max-width:600px){
          .desk-only{display:none!important}.mob-stack{flex-direction:column!important}.mob-full{width:100%!important;max-width:100%!important}
          .mob-pad{padding:48px 18px 40px!important}.mob-grid2{grid-template-columns:1fr 1fr!important}.mob-grid1{grid-template-columns:1fr!important}
          .mob-text-sm{font-size:11px!important}.mob-hide{display:none!important}
        }
      `}</style>

      <Stars/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden",opacity:0.02}}><div style={{position:"absolute",width:"100%",height:2,background:"linear-gradient(transparent,rgba(0,255,136,1),transparent)",animation:"sc 10s linear infinite"}}/></div>
      <div style={{position:"relative",zIndex:2}}>

        <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",position:"relative"}}>
          <div onClick={()=>go("home")} style={{cursor:"pointer",display:"flex",alignItems:"baseline",flexShrink:0}}>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>ORBIT</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#00ff88",letterSpacing:"-0.02em"}}>ALPHA</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#00ff88"}}>.</span>
          </div>
          <div className="desk-only" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",gap:28,alignItems:"center"}}>
            {NAV_ITEMS.map(([p,l])=>(
              <span key={p} onClick={()=>go(p)} style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",color:page===p?"#00ff88":"#aab8c2",borderBottom:page===p?"1px solid #00ff88":"1px solid transparent",paddingBottom:2,transition:"color 0.2s"}}>{l}</span>
            ))}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
            {/* FIX: Subscribe button now navigates to feed/newsletter */}
            <button className="desk-only" onClick={goSubscribe} style={{background:"rgba(0,255,136,0.07)",border:"1px solid rgba(0,255,136,0.2)",color:"#00ff88",padding:"7px 15px",borderRadius:4,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Subscribe Free</button>
            <button className="desk-only" onClick={()=>{ if(navigator.share){navigator.share({title:"Orbit Alpha",text:"Free space stocks dashboard",url:"https://orbitalpha.cloud"});}else{navigator.clipboard.writeText("https://orbitalpha.cloud").then(()=>alert("Link copied!"));}}} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"#ccd0d8",padding:"7px 12px",borderRadius:4,fontSize:10,letterSpacing:"0.06em",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Share ↗</button>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"#ccd0d8",padding:"6px 10px",borderRadius:4,cursor:"pointer",fontSize:16,display:"none"}} className="mob-menu-btn">{menuOpen?"✕":"☰"}</button>
          </div>
        </nav>

        {menuOpen&&(
          <div style={{background:"#070a14",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"16px 20px",display:"flex",flexDirection:"column",gap:4}}>
            {NAV_ITEMS.map(([p,l])=>(
              <span key={p} onClick={()=>{go(p);setMenuOpen(false);}} style={{color:page===p?"#00ff88":"#ccd0d8",padding:"10px 0",fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}}>{l}</span>
            ))}
            {/* FIX: Mobile subscribe also goes to newsletter */}
            <button onClick={()=>{goSubscribe();setMenuOpen(false);}} style={{background:"#00ff88",color:"#04060e",border:"none",padding:"11px",borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",marginTop:8}}>Subscribe Free →</button>
          </div>
        )}

        <style>{`.mob-menu-btn{display:none!important}@media(max-width:600px){.mob-menu-btn{display:block!important}}`}</style>

        {(page==="home"||page==="markets")&&<TickerStrip stocks={liveStocks}/>}

        {page==="home"&&(
          <div onClick={()=>window.open("https://orbit-alpha.beehiiv.com/p/orbit-alpha-issue-4","_blank")} style={{background:"rgba(126,184,255,0.06)",borderBottom:"1px solid rgba(126,184,255,0.12)",padding:"8px 20px",textAlign:"center",cursor:"pointer",transition:"background 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(126,184,255,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(126,184,255,0.06)"}>
            <span style={{fontSize:11,color:"#7eb8ff",letterSpacing:"0.04em"}}>
              📬 <strong>Issue #4 is live</strong> — RKLB record quarter · HawkEye 360 IPO · ASTS Falcon 9 launch
              <span style={{marginLeft:10,opacity:0.6}}>Read now →</span>
            </span>
          </div>
        )}

        {(page==="home"||page==="markets")&&(
          <div style={{background:isLive?"rgba(0,255,136,0.05)":"rgba(255,204,0,0.07)",borderBottom:`1px solid ${isLive?"rgba(0,255,136,0.15)":"rgba(255,204,0,0.15)"}`,padding:"8px 16px",textAlign:"center"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:isLive?"#00ff88":"#ffcc00",animation:"bk 1.5s infinite",flexShrink:0}}/>
              {isLive ? <span style={{fontSize:11,color:"#00ff88",letterSpacing:"0.04em"}}>LIVE DATA · Updated {lastUpdated}</span>
                : <span style={{fontSize:11,color:"#ffcc00",letterSpacing:"0.04em"}}>⚠ DEMO DATA ONLY — All prices and metrics are illustrative.</span>}
            </div>
          </div>
        )}

        {/* ── HOME ── */}
        {page==="home"&&(
          <div style={{animation:"fu 0.5s ease"}}>
            <section style={{padding:"40px 20px 28px",textAlign:"center",maxWidth:680,margin:"0 auto"}}>
              <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,6vw,48px)",fontWeight:800,lineHeight:1.05,letterSpacing:"-0.03em",color:"#fff",marginBottom:10}}>
                The data layer for<br/><span style={{color:"#00ff88"}}>space equity</span> investors.
              </h1>
              <p style={{fontSize:13,color:"#aab8c2",maxWidth:380,margin:"0 auto 20px",lineHeight:1.6}}>Live prices, launches, earnings and news. Weekly newsletter every Sunday.</p>
              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>go("markets","stocks")} style={{background:"#00ff88",color:"#04060e",border:"none",padding:"11px 24px",borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>View Markets →</button>
                {/* FIX: this hero subscribe button also goes to newsletter */}
                <button onClick={goSubscribe} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",color:"#aab8c2",padding:"11px 24px",borderRadius:4,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Subscribe Free →</button>
              </div>
            </section>

            <section style={{margin:"0 20px 16px",borderRadius:10,border:"1px solid rgba(0,255,136,0.2)",background:"rgba(0,255,136,0.02)",padding:"24px",maxWidth:920,marginLeft:"auto",marginRight:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:2}}>ORBIT <span style={{color:"#00ff88"}}>MARKETS</span></div>
                  <p style={{fontSize:11,color:"#aab8c2",lineHeight:1.5}}>Live prices, launches, earnings and news — updated automatically.</p>
                </div>
                <button onClick={()=>go("markets","stocks")} style={{background:"none",border:"1px solid rgba(0,255,136,0.3)",color:"#00ff88",padding:"8px 16px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>View Markets →</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[{e:"📈",t:"Live Prices",d:"Real-time quotes, 7D charts and market cap. Updated every 5 minutes."},{e:"🚀",t:"Launch Calendar",d:"Upcoming launches with historical price impact per mission."},{e:"📅",t:"Earnings Calendar",d:"Upcoming earnings dates with key metrics to watch."}].map((f,i)=>(
                  <div key={i} style={{borderRadius:6,padding:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:16,marginBottom:4}}>{f.e}</div>
                    <div style={{fontSize:11,color:"#fff",marginBottom:3,fontWeight:500}}>{f.t}</div>
                    <div style={{fontSize:10,color:"#aab8c2",lineHeight:1.5}}>{f.d}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{margin:"0 20px 16px",borderRadius:10,border:"1px solid rgba(255,150,50,0.2)",background:"rgba(255,150,50,0.02)",padding:"24px",maxWidth:920,marginLeft:"auto",marginRight:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:2}}>ORBIT <span style={{color:"#ff9632"}}>FEED</span></div>
                  <p style={{fontSize:11,color:"#aab8c2",lineHeight:1.5}}>Live news from 30+ sources · Weekly newsletter every Sunday — all in one place.</p>
                </div>
                <button onClick={()=>go("feed")} style={{background:"none",border:"1px solid rgba(255,150,50,0.3)",color:"#ff9632",padding:"8px 16px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>View Feed →</button>
              </div>
              {newsLoading&&Array.from({length:3}).map((_,i)=>(<div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div className="skeleton" style={{height:11,width:"70%",marginBottom:6}}/><div className="skeleton" style={{height:9,width:"25%"}}/></div>))}
              {!newsLoading&&newsItems.slice(0,4).map((item,i)=>(
                <div key={i} onClick={()=>window.open(item.link,"_blank")} className="hov" style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:"#dde1ec",lineHeight:1.4,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:item.source==="SpaceNews"?"rgba(0,255,136,0.08)":item.source==="NASA"?"rgba(126,184,255,0.08)":"rgba(255,204,0,0.08)",color:item.source==="SpaceNews"?"#00ff88":item.source==="NASA"?"#7eb8ff":"#ffcc00"}}>{item.source}</span>
                      <span style={{fontSize:9,color:"#aab8c2"}}>{item.pubDate?new Date(item.pubDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):""}</span>
                    </div>
                  </div>
                  <span style={{fontSize:11,color:"#ff9632",flexShrink:0}}>→</span>
                </div>
              ))}
            </section>

            <section style={{margin:"0 20px 40px",borderRadius:10,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(167,139,250,0.02)",padding:"24px",maxWidth:920,marginLeft:"auto",marginRight:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:2}}>ORBIT <span style={{color:"#a78bfa"}}>THREADS</span></div>
                  <p style={{fontSize:11,color:"#aab8c2",lineHeight:1.5}}>Discuss any space stock with other investors. Pick a username and post.</p>
                </div>
                <button onClick={()=>go("threads")} style={{background:"none",border:"1px solid rgba(167,139,250,0.3)",color:"#a78bfa",padding:"8px 16px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>View Threads →</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[{e:"💬",t:"Per-ticker threads",d:"Every stock has its own discussion board. Find the names you follow."},{e:"⬆",t:"Vote the best up",d:"Upvote sharp analysis. Downvote noise. The good stuff rises."},{e:"🪪",t:"Pick a username",d:"No signup needed. Set a handle once and it sticks in your browser."}].map((f,i)=>(
                  <div key={i} style={{borderRadius:6,padding:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:16,marginBottom:4}}>{f.e}</div>
                    <div style={{fontSize:11,color:"#fff",marginBottom:3,fontWeight:500}}>{f.t}</div>
                    <div style={{fontSize:10,color:"#aab8c2",lineHeight:1.5}}>{f.d}</div>
                  </div>
                ))}
              </div>
            </section>

            <footer style={{padding:"24px 20px",borderTop:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:"#222"}}>ORBIT<span style={{color:"#00ff88"}}>ALPHA</span>.</span>
              <span style={{fontSize:10,color:"#aab8c2"}}>Not financial advice · Data via Yahoo Finance & rocketlaunch.live</span>
              <div style={{display:"flex",gap:16,fontSize:10,color:"#aab8c2",flexWrap:"wrap"}}>
                <span onClick={()=>go("feed")} style={{cursor:"pointer"}} className="hov">Feed</span>
                <span onClick={()=>go("threads")} style={{cursor:"pointer"}} className="hov">Threads</span>
                <span onClick={()=>go("about")} style={{cursor:"pointer"}} className="hov">About</span>
                <a href="mailto:OrbitAlphaApp@proton.me" style={{color:"#aab8c2",textDecoration:"none"}} className="hov">Contact</a>
              </div>
            </footer>
          </div>
        )}

        {/* ── MARKETS ── */}
        {page==="markets"&&(
          <div style={{animation:"fu 0.3s ease"}}>
            <div style={{padding:"12px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:5,background:isMarketOpen()?"rgba(0,255,136,0.08)":"rgba(255,68,102,0.08)",border:`1px solid ${isMarketOpen()?"rgba(0,255,136,0.2)":"rgba(255,68,102,0.2)"}`,borderRadius:4,padding:"3px 10px"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:isMarketOpen()?"#00ff88":"#ff4466",animation:"bk 1.5s infinite"}}/>
                <span style={{fontSize:10,color:isMarketOpen()?"#00ff88":"#ff4466",letterSpacing:"0.08em"}}>{isMarketOpen()?"MARKET OPEN":"MARKET CLOSED"}</span>
              </div>
              <span style={{fontSize:10,color:"#aab8c2",fontFamily:"monospace"}}>
                {clock.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()} · {clock.toLocaleTimeString("en-US",{timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",second:"2-digit"})} EST
              </span>
            </div>

            <div style={{display:"flex",padding:"10px 20px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {[{id:"stocks",l:"Stocks"},{id:"launches",l:"Launches"},{id:"earnings",l:"Earnings"}].map(t=>(
                <button key={t.id} className="dt" onClick={()=>setTab(t.id)} style={{color:tab===t.id?"#00ff88":"#aab8c2",borderBottom:tab===t.id?"1px solid #00ff88":"1px solid transparent",marginBottom:-1,flexShrink:0}}>{t.l}</button>
              ))}
            </div>

            <div style={{padding:"16px 20px 40px"}}>
              {tab==="stocks"&&(
                <div>
                  {(()=>{
                    const gainers=[...liveStocks].filter(s=>typeof s.changePct==="number").sort((a,b)=>b.changePct-a.changePct).slice(0,5);
                    if(gainers.length===0) return null;
                    return (
                      <div style={{marginBottom:16}}>
                        <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Top Gainers Today {isLive?"· Live":"· Demo"}</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
                          {gainers.map((s,i)=>(
                            <div key={s.ticker} onClick={()=>setExpandedTicker(expandedTicker===s.ticker?null:s.ticker)} className="hov" style={{background:`rgba(0,255,136,${0.04+((5-i)/5)*0.12})`,border:"1px solid rgba(0,255,136,0.12)",borderRadius:5,padding:"10px 8px",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#00ff88",marginBottom:3}}>{s.ticker}</div>
                              <div style={{fontSize:13,fontWeight:700,color:"#00ff88"}}>+{s.changePct.toFixed(1)}%</div>
                              <div style={{fontSize:10,color:"#aab8c2",marginTop:2}}>${s.price.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {isLive&&(()=>{
                    const sorted=[...liveStocks].filter(s=>s.type==="stock"&&typeof s.changePct==="number");
                    const gainer=sorted.sort((a,b)=>b.changePct-a.changePct)[0];
                    const loser=sorted.sort((a,b)=>a.changePct-b.changePct)[0];
                    const byVolume=[...liveStocks].filter(s=>s.type==="stock"&&typeof s.volume==="number"&&s.volume>0).sort((a,b)=>b.volume-a.volume)[0];
                    return (
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Today · 1D</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {[{label:"Top Gainer",s:gainer,c:"#00ff88",val:s=>`+${s.changePct.toFixed(1)}%`},{label:"Top Loser",s:loser,c:"#ff4466",val:s=>`${s.changePct.toFixed(1)}%`},{label:"Highest Volume",s:byVolume,c:"#7eb8ff",val:s=>s.volume>=1e6?`${(s.volume/1e6).toFixed(1)}M`:s.volume>=1e3?`${(s.volume/1e3).toFixed(0)}K`:`${s.volume}`}].map(({label,s,c,val})=>s?(
                            <div key={label} onClick={()=>setExpandedTicker(expandedTicker===s.ticker?null:s.ticker)} className="hov" style={{border:`1px solid ${c}22`,borderRadius:6,padding:"10px 14px",background:`${c}08`,cursor:"pointer"}}>
                              <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <span style={{fontSize:13,fontWeight:700,color:c}}>{s.ticker}</span>
                                <span style={{fontSize:11,fontWeight:600,color:c}}>{val(s)}</span>
                              </div>
                              <div style={{fontSize:10,color:"#aab8c2",marginTop:2}}>${s.price.toFixed(2)}</div>
                            </div>
                          ):null)}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or name..." style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#ddd",padding:"8px 12px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",width:200}}/>
                    <button onClick={()=>setShowWatchlistOnly(w=>!w)} style={{background:showWatchlistOnly?"rgba(255,204,0,0.1)":"transparent",border:`1px solid ${showWatchlistOnly?"rgba(255,204,0,0.4)":"rgba(255,255,255,0.08)"}`,color:showWatchlistOnly?"#ffcc00":"#aab8c2",padding:"7px 12px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",letterSpacing:"0.08em"}}>★ Watchlist</button>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {SECTORS.map(s=>(<span key={s} className="stg" onClick={()=>setSector(s)} style={{color:sector===s?"#00ff88":"#aab8c2",borderColor:sector===s?"rgba(0,255,136,0.3)":"rgba(255,255,255,0.2)",background:sector===s?"rgba(0,255,136,0.05)":"transparent"}}>{s}</span>))}
                    </div>
                  </div>
                  <div className="desk-only" style={{overflowX:"auto"}}>
                    <div style={{minWidth:"auto",width:"100%"}}>
                      <div style={{display:"grid",gridTemplateColumns:"68px 1fr 82px 72px 72px 80px",gap:6,padding:"7px 8px",fontSize:9,color:"#dde1ec",letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <span>Ticker</span><span>Name</span>
                        {[["price","Price"],["changePct","1D Chg%"],["mktCap","Mkt Cap"]].map(([col,label])=>(
                          <span key={col} onClick={()=>handleSort(col)} style={{cursor:"pointer",color:sortCol===col?"#00ff88":"#fff",userSelect:"none"}}>{label}{sortCol===col?(sortDir==="desc"?" ↓":" ↑"):""}</span>
                        ))}
                        <span style={{textAlign:"center",color:"#aab8c2"}}>7D</span>
                      </div>
                      {loading&&Array.from({length:8}).map((_,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"68px 1fr 82px 72px 72px 80px",gap:6,padding:"12px 8px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center"}}>
                          <div className="skeleton" style={{height:12,width:40}}/><div className="skeleton" style={{height:12,width:120}}/><div className="skeleton" style={{height:12,width:60}}/><div className="skeleton" style={{height:12,width:50}}/><div className="skeleton" style={{height:12,width:55}}/><div className="skeleton" style={{height:24,width:72}}/>
                        </div>
                      ))}
                      {!loading&&filtered.map(s=>(
                        <div key={s.ticker}>
                          <div className={`hov ${flashMap[s.ticker]==="up"?"flash-up":flashMap[s.ticker]==="down"?"flash-down":""}`}
                            onClick={()=>{ setExpandedTicker(expandedTicker===s.ticker?null:s.ticker); if(expandedTicker!==s.ticker) fetchStockNews(s.ticker); }}
                            style={{display:"grid",gridTemplateColumns:"68px 1fr 82px 72px 72px 80px",gap:6,padding:"10px 8px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",transition:"background 0.15s",cursor:"pointer"}}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span onClick={e=>{e.stopPropagation();toggleWatch(s.ticker);}} style={{fontSize:12,color:watchlist.includes(s.ticker)?"#ffcc00":"#556",cursor:"pointer",marginRight:2,lineHeight:1}}>{watchlist.includes(s.ticker)?"★":"☆"}</span>
                              <span style={{fontWeight:700,color:"#00ff88",fontSize:12}}>{s.ticker}</span>
                              {s.type==="etf"&&<span style={{fontSize:8,color:"#7eb8ff",background:"rgba(126,184,255,0.1)",padding:"1px 3px",borderRadius:2}}>ETF</span>}
                            </div>
                            <div><div style={{fontSize:11,color:"#fff"}}>{s.name}</div><div style={{fontSize:9,color:"#aab8c2",marginTop:1}}>{s.sector}</div></div>
                            <span style={{fontSize:13,color:"#fff",fontWeight:500}}>${s.price.toFixed(2)}</span>
                            <span style={{fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:4,background:s.changePct>=0?"rgba(0,255,136,0.12)":"rgba(255,68,102,0.12)",color:s.changePct>=0?"#00ff88":"#ff4466",display:"inline-block",textAlign:"center"}}>{s.changePct>=0?"+":""}{s.changePct.toFixed(1)}%</span>
                            <span style={{color:"#dde1ec",fontSize:10}}>{s.mktCap}</span>
                            <Sparkline data={s.spark7d||s.liveSparkline||SPARKDATA[s.ticker]} positive={s.changePct>=0}/>
                          </div>
                          {expandedTicker===s.ticker&&(
                            <div style={{background:"rgba(0,255,136,0.02)",border:"1px solid rgba(0,255,136,0.1)",borderRadius:6,margin:"0 0 4px",padding:"14px 16px",animation:"fu 0.2s ease"}}>
                              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:10}}>
                                <div><div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Current Price</div><div style={{fontSize:16,color:"#fff",fontWeight:500}}>${s.price.toFixed(2)}</div></div>
                                <div><div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>1D Change</div><div style={{fontSize:16,color:s.changePct>=0?"#00ff88":"#ff4466",fontWeight:500}}>{s.changePct>=0?"+":""}{s.changePct.toFixed(2)}%</div></div>
                                <div><div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Mkt Cap</div><div style={{fontSize:16,color:"#fff",fontWeight:500}}>{s.mktCap||"—"}</div></div>
                              </div>
                              <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,color:"#ccd0d8",background:"rgba(255,255,255,0.04)",padding:"3px 10px",borderRadius:3}}>{s.sector}</span>
                                <span onClick={()=>window.open(`https://finance.yahoo.com/quote/${s.ticker}`,"_blank")} style={{fontSize:10,color:"#7eb8ff",cursor:"pointer",padding:"3px 10px",borderRadius:3,border:"1px solid rgba(126,184,255,0.2)"}}>View on Yahoo Finance →</span>
                                <span onClick={goSubscribe} style={{fontSize:10,color:"#00ff88",cursor:"pointer",padding:"3px 10px",borderRadius:3,border:"1px solid rgba(0,255,136,0.2)"}}>{s.ticker} covered in this week's issue →</span>
                                <span onClick={()=>go("threads")} style={{fontSize:10,color:"#a78bfa",cursor:"pointer",padding:"3px 10px",borderRadius:3,border:"1px solid rgba(167,139,250,0.2)"}}>Discuss {s.ticker} →</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"none"}} className="mob-cards">
                    <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                      <button onClick={()=>setShowWatchlistOnly(w=>!w)} style={{background:showWatchlistOnly?"rgba(255,204,0,0.1)":"transparent",border:`1px solid ${showWatchlistOnly?"rgba(255,204,0,0.4)":"rgba(255,255,255,0.08)"}`,color:showWatchlistOnly?"#ffcc00":"#aab8c2",padding:"7px 14px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",letterSpacing:"0.08em"}}>★ {showWatchlistOnly?"Watchlist Only":"Watchlist"}</button>
                      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#ddd",padding:"7px 10px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
                    </div>
                    {filtered.map(s=>(
                      <div key={s.ticker} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,marginBottom:8,background:"rgba(255,255,255,0.01)",overflow:"hidden"}}>
                        <div onClick={()=>setExpandedTicker(expandedTicker===s.ticker?null:s.ticker)} className={`${flashMap[s.ticker]==="up"?"flash-up":flashMap[s.ticker]==="down"?"flash-down":""}`} style={{padding:"12px 14px",cursor:"pointer"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span onClick={e=>{e.stopPropagation();toggleWatch(s.ticker);}} style={{fontSize:16,color:watchlist.includes(s.ticker)?"#ffcc00":"#556",cursor:"pointer",lineHeight:1,flexShrink:0}}>{watchlist.includes(s.ticker)?"★":"☆"}</span>
                              <span style={{fontSize:14,fontWeight:700,color:"#00ff88"}}>{s.ticker}</span>
                              {s.type==="etf"&&<span style={{fontSize:8,color:"#7eb8ff",background:"rgba(126,184,255,0.1)",padding:"1px 5px",borderRadius:2}}>ETF</span>}
                              <span style={{fontSize:11,color:"#aab8c2"}}>{s.name}</span>
                            </div>
                            <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:s.changePct>=0?"rgba(0,255,136,0.12)":"rgba(255,68,102,0.12)",color:s.changePct>=0?"#00ff88":"#ff4466"}}>{s.changePct>=0?"+":""}{s.changePct.toFixed(1)}%</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <span style={{fontSize:20,color:"#fff",fontWeight:500}}>${s.price.toFixed(2)}</span>
                            <span style={{fontSize:10,color:"#aab8c2"}}>{s.mktCap}</span>
                          </div>
                          <div style={{marginTop:10}}>
                            <div style={{fontSize:8,color:"#aab8c2",marginBottom:3,letterSpacing:"0.08em"}}>7D</div>
                            <Sparkline data={s.spark7d||s.liveSparkline||SPARKDATA[s.ticker]} positive={s.changePct>=0}/>
                          </div>
                          <div style={{textAlign:"center",marginTop:6,fontSize:9,color:"#ccd0d8"}}>{expandedTicker===s.ticker?"▲ tap to close":"▼ tap for more"}</div>
                        </div>
                        {expandedTicker===s.ticker&&(
                          <div style={{borderTop:"1px solid rgba(0,255,136,0.1)",padding:"12px 14px",background:"rgba(0,255,136,0.02)",animation:"fu 0.2s ease"}}>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                              <div><div style={{fontSize:9,color:"#aab8c2",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Current Price</div><div style={{fontSize:16,color:"#fff",fontWeight:500}}>${s.price.toFixed(2)}</div></div>
                              <div><div style={{fontSize:9,color:"#aab8c2",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>1D Change</div><div style={{fontSize:16,color:s.changePct>=0?"#00ff88":"#ff4466",fontWeight:500}}>{s.changePct>=0?"+":""}{s.changePct.toFixed(2)}%</div></div>
                              <div><div style={{fontSize:9,color:"#aab8c2",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Mkt Cap</div><div style={{fontSize:14,color:"#fff",fontWeight:500}}>{s.mktCap||"—"}</div></div>
                            </div>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              <button onClick={()=>window.open(`https://finance.yahoo.com/quote/${s.ticker}`,"_blank")} style={{flex:1,background:"none",border:"1px solid rgba(126,184,255,0.2)",color:"#7eb8ff",padding:"8px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Yahoo Finance →</button>
                              <button onClick={goSubscribe} style={{flex:1,background:"none",border:"1px solid rgba(0,255,136,0.2)",color:"#00ff88",padding:"8px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>{s.ticker} in newsletter →</button>
                              <button onClick={()=>go("threads")} style={{flex:1,background:"none",border:"1px solid rgba(167,139,250,0.2)",color:"#a78bfa",padding:"8px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Discuss {s.ticker} →</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <style>{`@media(max-width:600px){.desk-only{display:none!important}.mob-cards{display:block!important}}`}</style>
                  {filtered.length===0&&<div style={{padding:"28px",textAlign:"center",color:"#aab8c2",fontSize:12}}>No results.</div>}
                </div>
              )}

              {tab==="launches"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase"}}>Upcoming Launches · Historical Price Impact</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#00ff88"}}><div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",animation:"bk 1.5s infinite"}}/>LIVE · rocketlaunch.live</div>
                  </div>
                  {liveLaunches.map((l,i)=>(
                    <div key={i} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"14px",marginBottom:8,background:"rgba(255,255,255,0.01)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:12,color:"#00ff88",fontWeight:500}}>{l.date}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          {l.ticker&&<span style={{fontSize:10,color:"#00ff88",background:"rgba(0,255,136,0.06)",padding:"2px 8px",borderRadius:3}}>{l.ticker}</span>}
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:3,background:l.status==="GO"?"rgba(0,255,136,0.08)":l.status==="HOLD"?"rgba(255,100,0,0.08)":"rgba(255,255,255,0.04)",color:l.status==="GO"?"#00ff88":l.status==="HOLD"?"#ff8844":"#888"}}>{l.status}</span>
                        </div>
                      </div>
                      <div style={{fontSize:12,color:"#bbb",marginBottom:4}}>{l.mission}</div>
                      <div style={{fontSize:10,color:"#aab8c2"}}>Historical avg: {l.impact}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab==="earnings"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase"}}>Upcoming Earnings · Space Stocks</div>
                    <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.08em"}}>Updated weekly · EST times</div>
                  </div>
                  {EARNINGS.map((e,i)=>(
                    <div key={i} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"14px 16px",marginBottom:8,background:"rgba(255,255,255,0.01)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontWeight:700,color:"#00ff88",fontSize:13}}>{e.ticker}</span>
                          <span style={{fontSize:11,color:"#aab8c2"}}>{e.name}</span>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:11,color:"#fff",fontWeight:500}}>{e.date}</div>
                          <div style={{fontSize:9,color:"#aab8c2",marginTop:2}}>{e.time}</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#aab8c2",lineHeight:1.5}}><span style={{color:"#aab8c2",marginRight:6,letterSpacing:"0.08em",fontSize:9,textTransform:"uppercase"}}>Watch:</span>{e.watch}</div>
                    </div>
                  ))}
                  <div style={{padding:"12px",textAlign:"center",fontSize:10,color:"#ccd0d8",borderTop:"1px solid rgba(255,255,255,0.04)",marginTop:8}}>Estimates sourced from analyst consensus · Updated weekly · Not financial advice</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FEED ── */}
        {page==="feed"&&(
          <div style={{animation:"fu 0.3s ease",maxWidth:800,margin:"0 auto",padding:"32px 20px 60px"}}>
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:6}}>ORBIT <span style={{color:"#ff9632"}}>FEED</span></div>
              <p style={{fontSize:12,color:"#aab8c2",lineHeight:1.6,marginBottom:20}}>News and analysis for space equity investors.</p>
              <div style={{display:"inline-flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:3,gap:2}}>
                {[["news","📰 News"],["newsletter","✉ Newsletter"]].map(([mode,label])=>(
                  <button key={mode} onClick={()=>setFeedMode(mode)}
                    style={{background:feedMode===mode?"rgba(255,150,50,0.15)":"transparent",border:feedMode===mode?"1px solid rgba(255,150,50,0.3)":"1px solid transparent",color:feedMode===mode?"#ff9632":"#aab8c2",padding:"7px 18px",borderRadius:4,fontSize:11,fontFamily:"'DM Mono',monospace",cursor:"pointer",letterSpacing:"0.06em",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {feedMode==="news"&&(
              <div style={{animation:"fu 0.2s ease"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <p style={{fontSize:11,color:"#aab8c2"}}>Live space stock news from 30+ sources — updated every 5 minutes.</p>
                  <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#00ff88",flexShrink:0}}><div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",animation:"bk 1.5s infinite"}}/>LIVE</div>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
                  {["All","RKLB","ASTS","LUNR","PL","BKSY","RDW","MNTS","SPCE","KRMN","SATL","KULR","TSAT","GSAT","VSAT","MDA","SPIR","DXYZ","LMT","FLY","OKLO","BA","NOC","RTX","HAWK","SpaceX","Blue Origin","Relativity","Vast","ispace","NASA","ESA","ISRO","Space Force"].map(co=>(
                    <span key={co} onClick={()=>setNewsCompany(co==="All"?"":co)} className="stg" style={{color:newsCompany===(co==="All"?"":co)?"#ff9632":"#ccd0d8",borderColor:newsCompany===(co==="All"?"":co)?"rgba(255,150,50,0.3)":"rgba(255,255,255,0.2)",background:newsCompany===(co==="All"?"":co)?"rgba(255,150,50,0.05)":"transparent",fontSize:9}}>{co}</span>
                  ))}
                </div>
                {newsLoading&&Array.from({length:8}).map((_,i)=>(<div key={i} style={{padding:"16px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div className="skeleton" style={{height:13,width:"70%",marginBottom:8}}/><div className="skeleton" style={{height:10,width:"30%"}}/></div>))}
                {!newsLoading&&(()=>{
                  const COMPANY_KEYWORDS = {
                    RKLB:['Rocket Lab','RKLB','Electron','Neutron','Peter Beck'],ASTS:['AST SpaceMobile','ASTS','BlueBird','Abel Avellan'],
                    LUNR:['Intuitive Machines','LUNR','IM-3','IM-4','lunar lander'],PL:['Planet Labs','PBC','Pelican'],BKSY:['BlackSky','BKSY'],RDW:['Redwire','RDW'],
                    MNTS:['Momentus','MNTS'],SPCE:['Virgin Galactic','SPCE','VSS'],KRMN:['Karman','KRMN'],SATL:['Satellogic','SATL'],KULR:['KULR Technology','KULR'],
                    TSAT:['Telesat','TSAT','Lightspeed'],GSAT:['Globalstar','GSAT'],VSAT:['Viasat','VSAT'],MDA:['MDA Space','MDA Ltd'],SPIR:['Spire Global','SPIR'],
                    GILT:['Gilat Satellite','GILT'],DXYZ:['Destiny Tech','DXYZ'],LMT:['Lockheed Martin','LMT'],FLY:['Firefly Aerospace','FLY','Alpha rocket'],
                    OKLO:['Oklo','OKLO','nuclear microreactor'],BA:['Boeing','BA'],NOC:['Northrop Grumman','NOC'],RTX:['RTX','Raytheon'],
                    HAWK:['HawkEye 360','HAWK','SIGINT','RF intelligence'],SATS:['EchoStar','SATS'],VOYG:['Voyager Technologies','VOYG'],YSS:['York Space','YSS'],
                    SpaceX:['SpaceX','Starship','Falcon','Starlink'],'Blue Origin':['Blue Origin','New Glenn','BE-4'],Relativity:['Relativity Space','Terran'],
                    Vast:['Vast Space','Haven-1'],ispace:['ispace','HAKUTO'],NASA:['NASA','Artemis','ISS'],ESA:['ESA','European Space Agency','Ariane'],
                    ISRO:['ISRO','Gaganyaan','Chandrayaan'],'Space Force':['Space Force','USSF','NSSL','Golden Dome'],
                  };
                  return newsItems
                    .filter(item=>!newsSource||item.source===newsSource)
                    .filter(item=>{
                      if(!newsCompany) return true;
                      if(item.ticker===newsCompany) return true;
                      const keywords=COMPANY_KEYWORDS[newsCompany]||[newsCompany];
                      const text=`${item.title} ${item.description}`.toLowerCase();
                      return keywords.some(k=>text.includes(k.toLowerCase()));
                    })
                    .map((item,i)=>(
                      <div key={i} onClick={()=>window.open(item.link,"_blank")} className="hov" style={{padding:"16px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",animation:`fu 0.3s ease ${i*0.02}s both`,borderRadius:item.highlight?6:0,border:item.highlight?"1px solid rgba(255,204,0,0.15)":"none",borderBottom:item.highlight?"1px solid rgba(255,204,0,0.15)":"1px solid rgba(255,255,255,0.05)",background:item.highlight?"rgba(255,204,0,0.03)":"transparent",marginBottom:item.highlight?8:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span style={{fontSize:9,padding:"2px 8px",borderRadius:3,flexShrink:0,background:item.source==="SpaceNews"?"rgba(0,255,136,0.08)":item.source==="NASA"?"rgba(126,184,255,0.08)":item.source==="Space.com"?"rgba(255,255,255,0.04)":"rgba(255,204,0,0.08)",color:item.source==="SpaceNews"?"#00ff88":item.source==="NASA"?"#7eb8ff":item.source==="Space.com"?"#888":"#ffcc00"}}>{item.source}</span>
                            {item.highlight&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:"rgba(255,204,0,0.1)",color:"#ffcc00",letterSpacing:"0.08em"}}>⚡ KEY STORY</span>}
                          </div>
                          <span style={{fontSize:10,color:"#aab8c2",flexShrink:0}}>{item.pubDate?new Date(item.pubDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}</span>
                        </div>
                        <div style={{fontSize:14,color:item.highlight?"#fff":"#dde1ec",lineHeight:1.5,fontWeight:item.highlight?600:500,marginBottom:6}}>{item.title}</div>
                        {item.description&&<div style={{fontSize:12,color:"#aab8c2",lineHeight:1.6}}>{item.description}</div>}
                        <div style={{fontSize:10,color:"#ff9632",marginTop:8,opacity:0.8}}>Read full article →</div>
                      </div>
                    ));
                })()}
              </div>
            )}

            {feedMode==="newsletter"&&(
              <div style={{animation:"fu 0.2s ease"}}>
                <p style={{fontSize:12,color:"#aab8c2",lineHeight:1.6,marginBottom:20}}>Every Sunday — macro overview, broker target changes and one stock deep dive. Free.</p>
                {submitted ? (
                  <div style={{fontSize:13,color:"#00ff88",padding:"10px 0 20px"}}>✓ You're subscribed. Welcome to Orbit Alpha.</div>
                ) : (
                  <div style={{display:"flex",gap:8,maxWidth:400,marginBottom:28}}>
                    <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sub()} placeholder="your@email.com" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",padding:"10px 14px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none"}}/>
                    <button onClick={sub} style={{background:"#ff9632",color:"#04060e",border:"none",padding:"10px 22px",borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap"}}>Join Free →</button>
                  </div>
                )}
                <div style={{height:1,background:"rgba(255,255,255,0.06)",marginBottom:24}}/>
                <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:16}}>All Issues</div>
                {[
                  {issue:4,date:"11 May 2026",headline:"RKLB record quarter. HawkEye 360 arrives. ASTS Falcon 9 launch confirmed.",summary:"RKLB +30% on record $200M revenue · HawkEye 360 IPO prices at top of range · ASTS BlueBird 8-10 mid-June launch · RKLB deep dive",url:"https://orbit-alpha.beehiiv.com/p/orbit-alpha-issue-4",live:true},
                  {issue:3,date:"4 May 2026",headline:"SpaceX goes retail. LUNR's $1B moment. The sector re-rates.",summary:"NYSE Space Summit · SpaceX IPO retail allocation · ASTS FCC win vs BlueBird 7 fallout · LUNR deep dive",url:"https://orbit-alpha.beehiiv.com/p/orbit-alpha-issue-3",live:true},
                  {issue:2,date:"25 Apr 2026",headline:"ASTS BlueBird 7 fails — what it means for your portfolio.",summary:"BlueBird 7 orbital failure · Stifel raises RKLB to $105 · Starship update · ASTS deep dive: bull case, bear case",url:"https://orbit-alpha.beehiiv.com/p/orbit-alpha-issue-2",live:true},
                  {issue:1,date:"19 Apr 2026",headline:"The week space went mainstream.",summary:"RKLB +9% on CEO conviction · SpaceX $1.75T IPO filing · Artemis II · RKLB deep dive",url:"https://orbit-alpha.beehiiv.com/p/orbit-alpha-issue-1",live:true},
                ].map((issue,i)=>(
                  <div key={i} className="hov" onClick={()=>issue.live&&window.open(issue.url,"_blank")} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"20px",marginBottom:10,background:"rgba(255,255,255,0.01)",cursor:issue.live?"pointer":"default",opacity:issue.live?1:0.5,position:"relative"}}>
                    {!issue.live&&<span style={{position:"absolute",top:12,right:12,fontSize:9,color:"#ffcc00",background:"rgba(255,204,0,0.08)",border:"1px solid rgba(255,204,0,0.2)",padding:"2px 8px",borderRadius:3,letterSpacing:"0.1em"}}>COMING SUNDAY</span>}
                    {i===0&&issue.live&&<span style={{position:"absolute",top:12,right:12,fontSize:9,color:"#00ff88",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.2)",padding:"2px 8px",borderRadius:3,letterSpacing:"0.1em"}}>LATEST</span>}
                    <div style={{fontSize:10,color:"#ff9632",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Issue #{issue.issue} · {issue.date}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#fff",marginBottom:6,lineHeight:1.3}}>{issue.headline}</div>
                    <div style={{fontSize:11,color:"#aab8c2",lineHeight:1.6,marginBottom:issue.live?10:0}}>{issue.summary}</div>
                    {issue.live&&<div style={{fontSize:10,color:"#ff9632",opacity:0.7}}>Read issue →</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── THREADS ── */}
        {page==="threads"&&<ThreadsPage go={go}/>}

        {/* ── ABOUT ── */}
        {page==="about"&&(
          <div style={{animation:"fu 0.3s ease",maxWidth:640,margin:"0 auto",padding:"32px 20px 60px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:6}}>ABOUT <span style={{color:"#00ff88"}}>ORBIT ALPHA</span></div>
            <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"20px 0"}}/>
            <p style={{fontSize:13,color:"#aab8c2",lineHeight:1.8,marginBottom:16}}>Orbit Alpha is a free dashboard and weekly newsletter built for retail investors who follow space equities. It covers every publicly traded space stock, ETF and private company — with live prices, launch catalysts, broker target changes and weekly deep dives.</p>
            <p style={{fontSize:13,color:"#aab8c2",lineHeight:1.8,marginBottom:16}}>The newsletter goes out every Sunday morning and covers three things: a macro overview of the week in space stocks, a broker pulse showing all analyst rating and price target changes, and one stock of the week — bull case, bear case, key catalysts, honest view on valuation.</p>
            <p style={{fontSize:13,color:"#aab8c2",lineHeight:1.8,marginBottom:32}}>Everything is free. No paywall. No signup required to use the dashboard.</p>
            <div style={{height:1,background:"rgba(255,255,255,0.06)",marginBottom:24}}/>
            <div style={{fontSize:10,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Get in touch</div>
            <a href="mailto:OrbitAlphaApp@proton.me" style={{color:"#00ff88",fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>📬 OrbitAlphaApp@proton.me</a>
            <div style={{marginTop:24}}>
              {submitted ? (
                <div style={{fontSize:13,color:"#00ff88",padding:"10px 0"}}>✓ You're subscribed. Welcome to Orbit Alpha.</div>
              ) : (
                <div style={{display:"flex",gap:8,maxWidth:400}}>
                  <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sub()} placeholder="your@email.com" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",padding:"10px 14px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none"}}/>
                  <button onClick={sub} style={{background:"#00ff88",color:"#04060e",border:"none",padding:"10px 22px",borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap"}}>Subscribe →</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
