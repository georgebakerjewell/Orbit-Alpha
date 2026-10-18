// Share images (Open Graph cards) for each stock page, drawn at build time.
// When a stock page is shared on Reddit, X or LinkedIn, the card shows the ticker, company and
// key figures instead of the generic site image. Called by scripts/prerender.mjs.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const font = (w) => readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${w}-normal.woff`));
const FONTS = [
  { name: "Inter", data: font(400), weight: 400, style: "normal" },
  { name: "Inter", data: font(600), weight: 600, style: "normal" },
  { name: "Inter", data: font(800), weight: 800, style: "normal" },
];

const C = { bg: "#04060e", green: "#00ff88", red: "#ff5c6c", text: "#ffffff", muted: "#8a93a8", line: "rgba(255,255,255,0.12)" };
const h = (type, style, children) => ({ type, props: { style: { display: "flex", ...style }, children } });

// stats: [[label, value, color?], ...] (empty when no live data was available at build time)
export async function stockCard({ ticker, name, sector, stats, asOf, path, headline }) {
  const tree = h("div", { width: 1200, height: 630, background: C.bg, flexDirection: "column", padding: "56px 64px", fontFamily: "Inter", color: C.text }, [
    h("div", { justifyContent: "space-between", alignItems: "center" }, [
      h("div", { fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em" }, [h("span", {}, "ORBIT"), h("span", { color: C.green }, "ALPHA.")]),
      h("div", { fontSize: 22, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 14px" }, sector),
    ]),
    h("div", { flexDirection: "column", marginTop: 70 }, [
      h("div", { fontSize: 120, fontWeight: 800, color: C.green, lineHeight: 1, letterSpacing: "-0.02em" }, ticker),
      h("div", { fontSize: 46, fontWeight: 600, marginTop: 14 }, headline || `${name} stock`),
    ]),
    stats.length
      ? h("div", { marginTop: "auto", gap: 56 }, stats.map(([label, value, color]) =>
          h("div", { flexDirection: "column" }, [
            h("div", { fontSize: 22, color: C.muted }, label),
            h("div", { fontSize: 40, fontWeight: 600, color: color || C.text, marginTop: 6 }, value),
          ])))
      : h("div", { marginTop: "auto", fontSize: 34, color: C.muted }, "Live price, SEC filings, insider trades and contracts"),
    h("div", { justifyContent: "space-between", marginTop: 34, paddingTop: 22, borderTop: `1px solid ${C.line}`, fontSize: 22, color: C.muted }, [
      h("span", {}, `orbitalpha.cloud${path}`),
      h("span", {}, asOf ? `As of ${asOf}` : "Free space stocks dashboard"),
    ]),
  ]);
  const svg = await satori(tree, { width: 1200, height: 630, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

export const OG_COLORS = C;
