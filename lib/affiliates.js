// Brokers shown in the "Where to buy" boxes on stock pages and buying guides.
// To switch on an affiliate programme, paste its tracking link into `affiliate` (the box then uses
// it and shows the commission disclosure). Until then the box links to the broker's own site.
// Every click is captured in PostHog as `affiliate_click` (see the listener in index.html).
// region: who each broker is shown to. The live stock pages pick by the visitor's country
// (/api/geo, from Vercel's IP country header); static HTML shows a mixed set with region labels.
export const BROKERS = [
  { id: "trading212", name: "Trading 212", region: "uk", url: "https://www.trading212.com/", affiliate: "", note: "Commission-free, fractional shares, Stocks ISA" },
  { id: "ibkr", name: "Interactive Brokers", region: "all", url: "https://www.interactivebrokers.com/", affiliate: "", note: "Low currency fees, global markets, ISA and SIPP in the UK" },
  { id: "etoro", name: "eToro", region: "uk", url: "https://www.etoro.com/", affiliate: "", note: "Investing app with fractional shares" },
  { id: "webull", name: "Webull", region: "us", url: "https://www.webull.com/", affiliate: "", note: "US app with commission-free stock trades" },
  { id: "moomoo", name: "moomoo", region: "us", url: "https://www.moomoo.com/us", affiliate: "", note: "US app with commission-free stock trades and research tools" },
];
const EUROPE = new Set("GB IE FR DE ES IT NL BE LU PT AT CH DK SE NO FI IS PL CZ SK HU RO BG GR CY MT SI HR EE LV LT".split(" "));
const pick = (ids) => ids.map((id) => BROKERS.find((b) => b.id === id)).filter(Boolean);
export function brokersFor(country) {
  if (country === "US") return pick(["webull", "moomoo", "ibkr"]);
  if (EUROPE.has(country)) return pick(["trading212", "ibkr", "etoro"]);
  return pick(["ibkr", "trading212", "webull"]);
}
const REGION_LABEL = { uk: "UK and Europe", us: "US" };

// Research tools linked from each US-listed stock page ("Research RKLB" row).
// TradingView pays per paid plan; clicks log as affiliate_click too.
export const TOOLS = [
  // aff_sub carries the ticker, so the TradingView partner dashboard shows which stock pages convert.
  // Referred users get a $15 coupon towards a paid plan (TradingView partner page, Oct 2026).
  { id: "tradingview", name: "Chart on TradingView", affiliate: "1173251", note: "$15 off a paid plan", link: (t, aff) => `https://www.tradingview.com/chart/?symbol=${t}${aff ? `&aff_id=${aff}&aff_sub=${t}&source=orbitalpha` : ""}` },
];
export const toolHref = (tool, t) => tool.link(t, tool.affiliate);
// One-line TradingView chart link for content pages (results, previews, articles, the lockup calendar).
export function chartLinkHtml(ticker, placement, esc = (s) => s) {
  const tv = TOOLS.find((x) => x.id === "tradingview");
  return `<a href="${toolHref(tv, ticker)}" target="_blank" rel="${tv.affiliate ? "sponsored noopener" : "noopener"}" data-broker="tradingview" data-placement="${placement}" data-ticker="${ticker}">Chart ${ticker} on TradingView${tv.affiliate && tv.note ? ` (${esc(tv.note)})` : ""}</a>`;
}

export const brokerHref = (b) => b.affiliate || b.url;
export const anyAffiliate = () => [...BROKERS, ...TOOLS].some((b) => b.affiliate);
export const RISK = "Capital at risk. The value of investments can fall as well as rise, and you may get back less than you invest.";
export const DISCLOSURE = "Orbit Alpha may earn a commission if you open an account or subscribe through these links, at no extra cost to you. It does not change what we cover.";

// Static HTML version for prerendered pages and guides.
export function brokerBoxHtml({ ticker, name, placement, esc = (s) => s, tools = false }) {
  const rel = (b) => (b.affiliate ? "sponsored noopener" : "noopener");
  const research = tools && ticker ? `<p>Research ${ticker}: ${TOOLS.map((x) => `<a href="${toolHref(x, ticker)}" target="_blank" rel="${rel(x)}" data-broker="${x.id}" data-placement="${placement}" data-ticker="${ticker}">${esc(x.name)}${x.affiliate && x.note ? ` (${esc(x.note)})` : ""}</a>`).join(" · ")}</p>` : "";
  return `<div class="oa-brokers"><p><b>Where to buy ${esc(name)}${ticker ? ` (${ticker})` : ""}</b></p><ul>${brokersFor(null).map((b) =>
    `<li><a href="${brokerHref(b)}" target="_blank" rel="${rel(b)}" data-broker="${b.id}" data-placement="${placement}"${ticker ? ` data-ticker="${ticker}"` : ""}>${esc(b.name)}</a>${REGION_LABEL[b.region] ? ` (${REGION_LABEL[b.region]})` : ""}: ${esc(b.note)}</li>`).join("")}</ul>${research}<p class="oa-note">${esc(RISK)}${anyAffiliate() ? ` ${esc(DISCLOSURE)}` : ""}</p></div>`;
}
