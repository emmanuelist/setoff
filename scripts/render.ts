/**
 * Builds the manifest the composition reads, stages the footage where Remotion
 * can serve it, and renders 1920x1080 at 30fps.
 *
 *   npm run film:render
 *
 * The manifest is derived, never hand-written: chapter lengths come from the
 * measured cut (film/segments.json) and captions from the measured narration
 * with word times from forced alignment. Nothing here can claim a timing the
 * audio does not have.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { NARRATION } from "./narration.js";
import type { AlignedLine } from "./align.js";

const ROOT = resolve(import.meta.dirname, "..");
const PUB = resolve(ROOT, "film-src/public");

/** Chapter titles and the address bar each segment shows. */
const META: Record<string, { title: string; url: string }> = {
  "00-open": { title: "", url: "" },
  "01-problem": { title: "The problem", url: "setoff-omega.vercel.app" },
  "02-clearing": { title: "One fixing, one net", url: "setoff-omega.vercel.app/cycles/1" },
  "03-reversal": { title: "Or none does", url: "setoff-omega.vercel.app/cycles/3" },
  "04-refusals": { title: "Try to break it", url: "setoff-omega.vercel.app/refusals" },
  "05-close": { title: "Only the net moves", url: "setoff-omega.vercel.app/cycles/1" },
};

/** The two push-ins in the whole film, in seconds from the chapter's start. */
const ZOOM: Record<string, { at: number; until: number; scale: number; origin: string }> = {
  "02-clearing": { at: 16.5, until: 25.0, scale: 1.06, origin: "42% 58%" },
  "04-refusals": { at: 6.0, until: 13.0, scale: 1.06, origin: "38% 46%" },
};

const seg = JSON.parse(readFileSync(resolve(ROOT, "film/segments.json"), "utf8")) as Record<string, number>;
const align = JSON.parse(readFileSync(resolve(ROOT, "film/align.json"), "utf8")) as Record<string, AlignedLine[]>;

mkdirSync(PUB, { recursive: true });
const chapters = NARRATION.map((b, i) => {
  const src = resolve(ROOT, `film/norm-${String(i).padStart(2, "0")}.mp4`);
  if (!existsSync(src)) throw new Error(`missing ${src} — run npm run film:cut first`);
  copyFileSync(src, resolve(PUB, `${b.segment}.mp4`));
  const m = META[b.segment] ?? { title: "", url: "" };
  return {
    id: b.segment,
    title: m.title,
    url: m.url,
    seconds: seg[b.segment] ?? b.secs,
    card: b.segment === "00-open" ? { kicker: "", title: "", subtitle: "" } : undefined,
    lines: align[b.segment] ?? [],
    zoom: ZOOM[b.segment],
  };
});
writeFileSync(resolve(ROOT, "film-src/manifest.json"), JSON.stringify({ chapters }, null, 2));
const total = chapters.reduce((n, c) => n + c.seconds, 0);
console.log(`  manifest: ${chapters.length} chapters, ${total.toFixed(1)}s`);

// publicDir must be explicit: staticFile() resolves against the bundle's public
// directory, and without this it looks beside the project root rather than
// beside the entry point, so every clip 404'd.
const bundled = await bundle({
  entryPoint: resolve(ROOT, "film-src/Film.tsx"),
  publicDir: PUB,
});
const composition = await selectComposition({ serveUrl: bundled, id: "SetoffDemo" });
console.log(`  composition ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames`);

let shown = -1;
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  crf: 17,
  outputLocation: resolve(ROOT, "film/setoff-silent.mp4"),
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (pct !== shown) { shown = pct; process.stdout.write(`\r  rendering ${pct}%   `); }
  },
});
console.log(`\n  film/setoff-silent.mp4  (${total.toFixed(1)}s at ${composition.width}x${composition.height})`);
console.log("  Next: npm run film:mix");
