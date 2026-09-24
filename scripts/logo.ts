/**
 * The submission logo, 480x480, from the product's own mark.
 *
 * The mark is the one in app/icon.svg: a ring of marks around a solid centre.
 * It reads as a dial, which is what the app is built around, and it reads as
 * many parties resolving to one net, which is what the product does. Drawn
 * here rather than scaled from the 32px favicon, whose dash pattern goes ragged
 * at any size worth looking at.
 *
 *   npm run logo
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SIZE = 480;
const INK = "#1d1b18";
const ENAMEL = "#eef0eb";

/** Evenly spaced marks on a ring, like the minute ticks on the fixing dial. */
function ticks(count: number, r: number, len: number, w: number, opacity = 1) {
  const c = SIZE / 2;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x1 = c + Math.cos(a) * r, y1 = c + Math.sin(a) * r;
    const x2 = c + Math.cos(a) * (r + len), y2 = c + Math.sin(a) * (r + len);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
      stroke="${ENAMEL}" stroke-width="${w}" stroke-linecap="round" opacity="${opacity}"/>`;
  }).join("");
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${INK}"/>
  <!-- The dial: sixty fine marks, with twelve heavier ones, so the ring holds
       its shape when the tile is drawn at list size. -->
  ${ticks(60, 168, 13, 3, 0.42)}
  ${ticks(12, 162, 22, 7)}
  <!-- The net: one solid figure at the centre, which is the whole claim. -->
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="62" fill="${ENAMEL}"/>
</svg>`;

const out = "assets/buidl-logo.png";
mkdirSync("assets", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0">${svg}</body>`, { waitUntil: "load" });
await page.screenshot({ path: out });
await browser.close();
console.log(`  ${out}  ${SIZE}x${SIZE}`);
