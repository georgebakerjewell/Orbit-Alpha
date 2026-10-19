// Brokers shown in the "Where to buy" boxes on stock pages and buying guides.
// To switch on an affiliate programme, paste its tracking link into `affiliate` (the box then uses
// it and shows the commission disclosure). Until then the box links to the broker's own site.
// Every click is captured in PostHog as `affiliate_click` (see the listener in index.html).
export const BROKERS = [
  { id: "trading212", name: "Trading 212", url: "https://www.trading212.com/", affiliate: "", note: "Commission-free, fractional shares, Stocks ISA" },
  { id: "ibkr", name: "Interactive Brokers", url: "https://www.interactivebrokers.co.uk/", affiliate: "", note: "Low currency fees, ISA and SIPP, global markets" },
  { id: "etoro", name: "eToro", url: "https://www.etoro.com/", affiliate: "", note: "Investing app with fractional shares" },
];

// Research tools linked from each US-listed stock page ("Research RKLB" row). These programmes
// approve fast: TradingView instantly (paste the aff_id number), Seeking Alpha in about a day,
// Koyfin on application (paste the full tracking link). Clicks log as affiliate_click too.
export const TOOLS = [
  { id: "tradingview", name: "Chart on TradingView", affiliate: "", link: (t, aff) => `https://www.tradingview.com/chart/?symbol=${t}${aff ? `&aff_id=${aff}` : ""}` },
  { id: "seekingalpha", name: "Analysis on Seeking Alpha", affiliate: "", link: (t, aff) => aff || `https://seekingalpha.com/symbol/${t}` },
  { id: "koyfin", name: "Financials on Koyfin", affiliate: "", link: (t, aff) => aff || "https://www.koyfin.com/" },
];
export const toolHref = (tool, t) => tool.link(t, tool.affiliate);

export const brokerHref = (b) => b.affiliate || b.url;
export const anyAffiliate = () => [...BROKERS, ...TOOLS].some((b) => b.affiliate);
export const RISK = "Capital at risk. The value of investments can fall as well as rise, and you may get back less than you invest.";
export const DISCLOSURE = "Orbit Alpha may earn a commission if you open an account or subscribe through these links, at no extra cost to you. It does not change what we cover.";

// Static HTML version for prerendered pages and guides.
export function brokerBoxHtml({ ticker, name, placement, esc = (s) => s, tools = false }) {
  const rel = (b) => (b.affiliate ? "sponsored noopener" : "noopener");
  const research = tools && ticker ? `<p>Research ${ticker}: ${TOOLS.map((x) => `<a href="${toolHref(x, ticker)}" target="_blank" rel="${rel(x)}" data-broker="${x.id}" data-placement="${placement}" data-ticker="${ticker}">${esc(x.name)}</a>`).join(" · ")}</p>` : "";
  return `<div class="oa-brokers"><p><b>Where to buy ${esc(name)}${ticker ? ` (${ticker})` : ""}</b></p><ul>${BROKERS.map((b) =>
    `<li><a href="${brokerHref(b)}" target="_blank" rel="${rel(b)}" data-broker="${b.id}" data-placement="${placement}"${ticker ? ` data-ticker="${ticker}"` : ""}>${esc(b.name)}</a>: ${esc(b.note)}</li>`).join("")}</ul>${research}<p class="oa-note">${esc(RISK)}${anyAffiliate() ? ` ${esc(DISCLOSURE)}` : ""}</p></div>`;
}
