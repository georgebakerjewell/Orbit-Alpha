// Prints the "all 30 companies at a glance" page to PDF. Usage: node scripts/print-sheet.mjs <url-or-file> <out.pdf>
// Run weekly by .github/workflows/space-stocks-sheet.yml against the live site.
import { chromium } from "playwright";
const [src = "https://www.orbitalpha.cloud/downloads/space-stocks-sheet", out = "public/downloads/space-stocks-2026.pdf"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(src.startsWith("http") ? src : `file://${process.cwd()}/${src}`, { waitUntil: "networkidle" });
await page.pdf({ path: out, format: "A4", landscape: true, printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
await browser.close();
console.log(`printed ${out}`);
