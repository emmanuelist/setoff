/**
 * Renders single frames of the film for inspection, at the moments that matter: each card's
 * landing, every caption at the instant its figure is spoken, the set-off, the finished run,
 * and the middle of every dissolve. A frame is cheaper to look at than a render is to redo.
 *
 *   npx tsx scripts/stills.ts            # the standard set
 *   npx tsx scripts/stills.ts 1240 1255  # particular frames
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "film/stills");
mkdirSync(OUT, { recursive: true });

type M = {
  xf: number; total: number;
  chapters: { id: string; from: number; dur: number }[];
  lines: { chapter: string; groups: { text: string; start: number }[] }[];
  events: Record<string, number>;
};
const m = JSON.parse(readFileSync(resolve(ROOT, "film-src/manifest.json"), "utf8")) as M;

const frames = new Map<number, string>();
const want = (f: number, name: string) => { if (f >= 0 && f < m.total && !frames.has(f)) frames.set(f, name); };

const asked = process.argv.slice(2).map(Number).filter(Number.isFinite);
if (asked.length) asked.forEach((f) => want(f, `f${f}`));
else {
  for (const [k, v] of Object.entries(m.events)) want(v + (k.endsWith("hit") ? 40 : 0), k.replace(".", "-"));
  want(m.events["02-clearing.landed"]! + 20, "02-clearing-after-landing");
  // Every caption at its first figure, or its middle word when it has none.
  m.lines.forEach((l, i) => {
    const g = l.groups.find((x) => /\d/.test(x.text)) ?? l.groups[Math.floor(l.groups.length / 2)]!;
    want(g.start + 2, `line${String(i).padStart(2, "0")}-${l.chapter}`);
  });
  for (const c of m.chapters.slice(1)) want(c.from + Math.floor(m.xf / 2), `dissolve-${c.id}`);
  want(m.total - 40, "end");
}

const bundled = await bundle({ entryPoint: resolve(ROOT, "film-src/Film.tsx"), publicDir: resolve(ROOT, "film-src/public") });
const composition = await selectComposition({ serveUrl: bundled, id: "Setoff" });
for (const [frame, name] of [...frames].sort((a, b) => a[0] - b[0])) {
  const file = resolve(OUT, `${String(frame).padStart(4, "0")}-${name}.png`);
  await renderStill({ composition, serveUrl: bundled, frame, output: file });
  console.log(`  ${file.replace(ROOT + "/", "")}`);
}
