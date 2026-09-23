/**
 * The surround: everything that is NOT the product.
 *
 * Renders two sets of transparent PNGs with Playwright, which ffmpeg then lays
 * over the footage:
 *
 *   chrome/<segment>.png   the frame — wordmark, chapter title, window bezel,
 *                          progress pips. One per segment, static for its whole
 *                          length, with a hole where the product shows through.
 *   caps/<segment>-NN.png  one caption line, sized to the band UNDER the frame.
 *
 * Captions are composited here rather than drawn in the page because an earlier
 * cut put them over the product behind a scrim, and the note back was that the
 * overlay was unnecessary and the UI should speak. Off the product there is no
 * scrim to soften and no shadow to lift the type: it sits on the film's own
 * ground, at full contrast, and never hides a figure it is describing.
 *
 *   npx tsx scripts/chrome.ts
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { NARRATION } from "./narration.js";
import { sentences } from "./captions.js";

import { FILM, WIN } from "./geometry.js";
const W = FILM.W, H = FILM.H;

const THEME = {
  ground: "#14130f",
  ink: "#f4f3ef",
  dim: "#9b9a92",
  rule: "#33312a",
  violet: "#8f7be0",
  display: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  figure: '"Martian Mono", ui-monospace, Menlo, monospace',
  fonts:
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400;62..125,600;62..125,700&family=Martian+Mono:wdth,wght@75..112,400;75..112,600&display=swap",
};

/** Chapter titles and the address bar each segment shows. */
const CHAPTERS: Record<string, { title: string; url: string }> = {
  "00-open": { title: "", url: "" },
  "01-problem": { title: "The problem", url: "setoff-omega.vercel.app" },
  "02-clearing": { title: "One fixing, one net", url: "setoff-omega.vercel.app/cycles/1" },
  "03-reversal": { title: "Or none does", url: "setoff-omega.vercel.app/cycles/3" },
  "04-refusals": { title: "Try to break it", url: "setoff-omega.vercel.app/refusals" },
  "05-close": { title: "Only the net moves", url: "setoff-omega.vercel.app/cycles/1" },
};

const shell = (body: string, extra = "") => `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${THEME.fonts}" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;width:${W}px;height:${H}px;background:transparent;overflow:hidden}
  body{font-family:${THEME.display};color:${THEME.ink};-webkit-font-smoothing:antialiased}
  ${extra}
</style>${body}`;

function chromeHTML(segment: string, index: number, total: number) {
  const c = CHAPTERS[segment]!;
  // The card fills the frame on its own; no bezel, no pips.
  if (!c.title) return shell("<body></body>");
  const pips = Array.from({ length: total - 1 }, (_, i) => {
    const on = i === index - 1, done = i < index - 1;
    return `<span style="width:${on ? 44 : 16}px;height:3px;border-radius:3px;background:${
      on ? THEME.violet : done ? "#5a5648" : "#302e28"};"></span>`;
  }).join("");
  return shell(`<body>
  <div style="position:absolute;left:${FILM.frame.x}px;top:22px;display:flex;align-items:center;gap:20px">
    <span style="font-family:${THEME.figure};font-size:13px;font-weight:600;letter-spacing:.34em;text-indent:.34em">SETOFF</span>
    <span style="width:1px;height:22px;background:${THEME.rule}"></span>
    <span style="font-size:22px;letter-spacing:-.01em;font-variation-settings:'wdth' 104">${c.title}</span>
  </div>
  <div style="position:absolute;right:${FILM.frame.x}px;top:28px;font-family:${THEME.figure};
       font-size:11px;letter-spacing:.2em;color:${THEME.dim}">ARC MAINNET · 5042</div>

  <!-- The window. Its interior is a hole: the footage shows through from below. -->
  <div style="position:absolute;left:${FILM.frame.x}px;top:${FILM.frame.y}px;width:${FILM.frame.w}px;height:${FILM.frame.bar + FILM.frame.h}px;
       border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px ${THEME.rule},0 40px 90px -40px #000">
    <div style="height:${FILM.frame.bar}px;background:#1d1c17;display:flex;align-items:center;gap:7px;padding-left:16px">
      ${["#6f6a5c", "#6f6a5c", "#6f6a5c"].map((k) => `<span style="width:9px;height:9px;border-radius:9px;background:${k}"></span>`).join("")}
      <span style="margin-left:18px;font-family:${THEME.figure};font-size:11px;color:${THEME.dim}">${c.url}</span>
    </div>
  </div>

  <div style="position:absolute;right:${FILM.frame.x}px;bottom:58px;display:flex;gap:7px;align-items:center">${pips}</div>
</body>`);
}

function capHTML(text: string) {
  return shell(
    `<body><div class="c">${text}</div></body>`,
    `.c{position:absolute;left:${FILM.frame.x}px;right:${FILM.frame.x}px;bottom:40px;
        font-size:30px;line-height:1.34;letter-spacing:-.016em;font-weight:500;
        font-variation-settings:'wdth' 100;color:${THEME.ink};max-width:52ch;
        text-wrap:balance;}`,
  );
}

async function main() {
  rmSync("film/chrome", { recursive: true, force: true });
  rmSync("film/caps", { recursive: true, force: true });
  mkdirSync("film/chrome", { recursive: true });
  mkdirSync("film/caps", { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const shot = async (html: string, out: string) => {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, omitBackground: true });
  };

  const total = NARRATION.length;
  for (let i = 0; i < total; i++) {
    const b = NARRATION[i]!;
    await shot(chromeHTML(b.segment, i, total), `film/chrome/${b.segment}.png`);
    const lines = sentences(b.text);
    for (let j = 0; j < lines.length; j++) {
      await shot(capHTML(lines[j]!), `film/caps/${b.segment}-${String(j).padStart(2, "0")}.png`);
    }
    console.log(`  ${b.segment.padEnd(14)} chrome + ${lines.length} caption${lines.length === 1 ? "" : "s"}`);
  }
  await browser.close();

  if (!existsSync("film/timing.json")) console.log("\n! no film/timing.json — run npm run voice first");
  else console.log(`\n  rendered into film/chrome and film/caps at ${W}x${H}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
