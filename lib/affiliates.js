// Brokers shown in the "Where to buy" boxes on stock pages and buying guides.
// To switch on an affiliate programme, paste its tracking link into `affiliate` (the box then uses
// it and shows the commission disclosure). Until then the box links to the broker's own site.
// Every click is captured in PostHog as `affiliate_click` (see the listener in index.html).
export const BROKERS = [
  { id: "trading212", name: "Trading 212", url: "https://www.trading212.com/", affiliate: "", note: "Commission-free, fractional shares, Stocks ISA" },
  { id: "ibkr", name: "Interactive Brokers", url: "https://www.interactivebrokers.co.uk/", affiliate: "", note: "Low currency fees, ISA and SIPP, global markets" },
  { id: "etoro", name: "eToro", url: "https://www.etoro.com/", affiliate: "", note: "Investing app with fractional shares" },
];

export const brokerHref = (b) => b.affiliate || b.url;
export const anyAffiliate = () => BROKERS.some((b) => b.affiliate);
export const RISK = "Capital at risk. The value of investments can fall as well as rise, and you may get back less than you invest.";
export const DISCLOSURE = "Orbit Alpha may earn a commission if you open an account through these links, at no extra cost to you. It does not change what we cover.";

// Static HTML version for prerendered pages and guides.
export function brokerBoxHtml({ ticker, name, placement, esc = (s) => s }) {
  const rel = (b) => (b.affiliate ? "sponsored noopener" : "noopener");
  return `<div class="oa-brokers"><p><b>Where to buy ${esc(name)}${ticker ? ` (${ticker})` : ""}</b></p><ul>${BROKERS.map((b) =>
    `<li><a href="${brokerHref(b)}" target="_blank" rel="${rel(b)}" data-broker="${b.id}" data-placement="${placement}"${ticker ? ` data-ticker="${ticker}"` : ""}>${esc(b.name)}</a>: ${esc(b.note)}</li>`).join("")}</ul><p class="oa-note">${esc(RISK)}${anyAffiliate() ? ` ${esc(DISCLOSURE)}` : ""}</p></div>`;
}
