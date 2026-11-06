// Draws public/og.png, the generic site share card. Everything is centred so the card still reads
// when Reddit, Discord or iMessage crop it to a narrower box. Run: node scripts/og-site.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const font = (w) => readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${w}-normal.woff`));
const h = (type, style, children) => ({ type, props: { style: { display: "flex", ...style }, children } });

const tree = h("div", {
  width: 1200, height: 630, flexDirection: "column", alignItems: "center", justifyContent: "center",
  fontFamily: "Inter", color: "#ffffff", textAlign: "center",
  background: "radial-gradient(circle at 50% 45%, #0d3324 0%, #061411 38%, #04060e 72%)",
}, [
  h("div", { fontSize: 30, fontWeight: 800, letterSpacing: "0.22em", color: "#00ff88" }, "ORBIT ALPHA"),
  h("div", { flexDirection: "column", alignItems: "center", marginTop: 34, fontSize: 62, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }, [
    h("div", {}, "Every space stock,"),
    h("div", {}, "one live dashboard."),
  ]),
  h("div", { marginTop: 30, fontSize: 26, color: "#a3acc0" }, "Prices · launches · contracts · filings"),
  h("div", { marginTop: 14, fontSize: 28, fontWeight: 600, color: "#ffffff" }, "Free weekly newsletter"),
  h("div", { marginTop: 40, fontSize: 26, color: "#00ff88" }, "orbitalpha.cloud"),
]);

const svg = await satori(tree, {
  width: 1200, height: 630,
  fonts: [400, 600, 800].map((w) => ({ name: "Inter", data: font(w), weight: w, style: "normal" })),
});
writeFileSync(new URL("../public/og.png", import.meta.url), new Resvg(svg).render().asPng());
console.log("wrote public/og.png");
