// Free embeddable space stocks widget.
//   /embed/space-stocks : the widget itself, a tiny self-contained page meant for an <iframe>
//                         (no React, no tracking, prices from /api/quotes, which is edge cached).
//                         Options: ?t=SPCX,RKLB,ASTS (up to 15 covered tickers), ?theme=light, ?n=10.
//   /space-stocks-widget : the guide page that explains it and gives the copy-paste code.
// The code people paste includes a plain text link back to the site, which is the point.
import { GUIDES } from "../lib/pagemeta.js";

export const WIDGET_PATH = "/embed/space-stocks";

export function widgetHtml({ profiles, SITE }) {
  const names = Object.fromEntries(Object.entries(profiles).map(([t, p]) => [t, p.name]));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Space stock prices | Orbit Alpha</title>
<style>
:root{--bg:#0b0d12;--fg:#e8ebf2;--mut:#8a93a6;--line:rgba(255,255,255,.07);--up:#00d47e;--down:#ff5c6c;--acc:#00ff88}
.light{--bg:#fff;--fg:#14161c;--mut:#5d6575;--line:rgba(0,0,0,.08);--up:#0a8a52;--down:#c62a3a;--acc:#0a8a52}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--fg);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:12px 14px}
header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}h1{font-size:14px;font-weight:700}
small,.mut{color:var(--mut);font-size:11px}table{width:100%;border-collapse:collapse}td{padding:7px 4px;border-top:1px solid var(--line);white-space:nowrap}
td.n{overflow:hidden;text-overflow:ellipsis;max-width:160px;color:var(--mut)}td.r{text-align:right;font-variant-numeric:tabular-nums}
a{color:inherit;text-decoration:none}a.t{font-weight:700;color:var(--acc)}.up{color:var(--up)}.down{color:var(--down)}
footer{margin-top:8px;display:flex;justify-content:space-between}footer a{color:var(--acc)}
@media (max-width:360px){td.n{display:none}}
</style></head><body>
<header><h1>Space stocks</h1><small id="asof">Loading prices</small></header>
<table><tbody id="rows"></tbody></table>
<footer><span class="mut">Delayed prices. Not investment advice.</span><a href="${SITE}/" target="_blank" rel="noopener">Orbit Alpha</a></footer>
<script>
(function(){
  var NAMES=${JSON.stringify(names)};
  var q=new URLSearchParams(location.search);
  if(q.get("theme")==="light")document.documentElement.className="light";
  var pick=(q.get("t")||"").toUpperCase().split(",").filter(function(t){return NAMES[t];}).slice(0,15);
  var n=Math.min(Math.max(parseInt(q.get("n"),10)||10,3),30);
  var CUR={USD:"$",EUR:"\\u20ac",GBP:"\\u00a3",CAD:"C$"};
  function price(p,c){return c==="GBp"?p.toFixed(1)+"p":(CUR[c]!=null?CUR[c]:c+" ")+p.toFixed(p>=1?2:3);}
  function load(){
    fetch("/api/quotes").then(function(r){return r.json();}).then(function(d){
      var qs=d.quotes||{};
      var list=(pick.length?pick:Object.keys(NAMES).filter(function(t){return qs[t]&&qs[t].marketCap;}).sort(function(a,b){return qs[b].marketCap-qs[a].marketCap;}).slice(0,n)).filter(function(t){return qs[t];});
      document.getElementById("rows").innerHTML=list.map(function(t){
        var x=qs[t],c=x.changePct||0,cls=c>0?"up":c<0?"down":"";
        return '<tr><td><a class="t" href="${SITE}/stocks/'+t.toLowerCase()+'" target="_blank" rel="noopener">'+t+'</a></td><td class="n">'+NAMES[t]+'</td><td class="r">'+price(x.price,x.currency)+'</td><td class="r '+cls+'">'+(c>=0?"+":"")+c.toFixed(2)+'%</td></tr>';
      }).join("");
      document.getElementById("asof").textContent="Updated "+new Date(d.asOf).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    }).catch(function(){document.getElementById("asof").textContent="Prices unavailable";});
  }
  load();setInterval(load,300000);
})();
</script></body></html>`;
}

export function buildWidgetGuide(ctx) {
  const { SITE, ORG, crumbs, esc, list, asOf, count } = ctx;
  const g = GUIDES["/space-stocks-widget"];
  const code = (src, h) => `<iframe src="${SITE}${WIDGET_PATH}${src}" title="Space stock prices" width="100%" height="${h}" style="border:0;max-width:640px" loading="lazy"></iframe>\n<p style="font-size:12px">Space stock prices from <a href="${SITE}/">Orbit Alpha</a></p>`;
  const box = (c) => `<textarea readonly rows="4" onclick="this.select()" style="width:100%;font:12px monospace;background:rgba(255,255,255,0.04);color:inherit;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:10px">${esc(c)}</textarea>`;
  return {
    path: "/space-stocks-widget", title: g.title, description: g.description, lastmod: asOf, guide: true,
    body: `<div class="oa-guide"><h1>Free space stocks widget</h1><!--oa-answer--><p>Add a live table of space stock prices to your website, blog or forum. It is free, needs no sign-up and updates itself through the trading day. Each ticker links to that company's page on Orbit Alpha.</p>
<h2>Preview</h2><iframe src="${WIDGET_PATH}" title="Space stock prices" width="100%" height="460" style="border:0;max-width:640px;border-radius:8px" loading="lazy"></iframe>
<h2>Copy the code</h2><p>The ten largest listed space companies by market value, dark theme:</p>${box(code("", 460))}
<p>Light theme, for white pages:</p>${box(code("?theme=light", 460))}
<p>Your own list, up to 15 tickers (this one shows SpaceX, Rocket Lab and AST SpaceMobile):</p>${box(code("?t=SPCX,RKLB,ASTS", 200))}
<h2>Options</h2>${list([
      "<code>?t=SPCX,RKLB,ASTS</code>: choose the stocks, from the " + count + ' companies on the <a href="/space-stocks">list of space stocks</a>',
      "<code>?n=15</code>: show the largest 3 to 30 companies by market value",
      "<code>?theme=light</code>: light background",
      "Combine options with <code>&amp;</code>, for example <code>?n=5&amp;theme=light</code>",
    ])}
<h2>Terms</h2>${list([
      "Free for any site. Please keep the Orbit Alpha credit line under the widget.",
      "Prices come from Yahoo Finance, are delayed, and are refreshed every five minutes.",
      "The widget does not set cookies or track your visitors.",
      "It is information only, not investment advice.",
    ])}
<p>Questions or a size you need: <a href="mailto:OrbitAlphaApp@proton.me">OrbitAlphaApp@proton.me</a>.</p></div>`,
    ld: [ORG, crumbs([["Home", "/"], ["Space stocks widget", "/space-stocks-widget"]])],
    answer: `Orbit Alpha's space stocks widget is a free live price table you can embed on any website with one line of code. It shows the largest listed space companies, or tickers you choose, with prices refreshed every five minutes.`,
  };
}
