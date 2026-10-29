// Prints which headlines the news feed keeps and drops. Usage: node scripts/test-newsfilter.mjs items.json
import { readFileSync } from "node:fs";
import { isNoise, isNewsworthy } from "../lib/newsfilter.js";
const items = JSON.parse(readFileSync(process.argv[2], "utf8"));
const keep = items.filter(isNewsworthy), drop = items.filter((i) => !isNewsworthy(i));
console.log(`KEEP ${keep.length}`); keep.forEach((i) => console.log("  +", i.source, "|", i.title));
console.log(`DROP ${drop.length}`); if (process.argv[3]) drop.forEach((i) => console.log("  -", isNoise(i) ? "noise" : "no-event", "|", i.source, "|", i.title));
