/**
 * Lays out the film and renders its picture.
 *
 *   npm run film:render
 *
 * Everything the composition draws and the score plays comes from one layout, computed here:
 *
 *   - chapters are cut on whole beats of the score (31 frames), so every dissolve lands where the
 *     music has a downbeat;
 *   - each chapter's key moment (the net landing, the refusal run finishing) is moved onto a beat
 *     by holding the chapter's first frame a fraction of a beat longer, so the hit in the score and
 *     the moment on screen are the same frame;
 *   - each line of narration is placed on its own: most follow the one before, the anchored ones
 *     are placed against a moment measured from the footage (film/measured.json);
 *   - captions carry each word's time from forced alignment, mapped onto the written words by
 *     construction (speak() says which spoken words each caption word stands for).
 *
 * It writes film-src/manifest.json for the composition and film/timeline.json for the score, and
 * renders film/setoff-picture.mp4, which has no sound; npm run film:score and film:master add it.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { NARRATION, speak, type Anchor } from "./narration.js";
import { sentences } from "./captions.js";
import { FPS, BEAT, BEAT_FRAMES, XF_FRAMES, TAIL_MIN, GAP, planned } from "./timeline.js";
import type { AlignedLine } from "./align.js";

const ROOT = resolve(import.meta.dirname, "..");
const PUB = resolve(ROOT, "film-src/public");
const F = (s: number) => Math.round(s * FPS);

/** The cards are drawn, not filmed, and last a whole number of beats. */
const CARD_BEATS: Record<string, number> = { "00-open": 4, "06-end": 7 };

/** Chapter titles and the address each shot shows. */
const META: Record<string, { title: string; url: string }> = {
  "01-problem": { title: "Half-settled", url: "setoff-omega.vercel.app" },
  "02-clearing": { title: "One fixing, one net", url: "setoff-omega.vercel.app/cycles/1" },
  "03-reversal": { title: "Or none does", url: "setoff-omega.vercel.app/cycles/3" },
  "04-refusals": { title: "Try to break it", url: "setoff-omega.vercel.app/refusals" },
  "05-close": { title: "Only the net moves", url: "setoff-omega.vercel.app/cycles/1" },
};

/**
 * The moment in each shot that the score hits, and how long the picture holds after it. The
 * chapter is shifted so this moment falls on a beat.
 */
const KEY: Record<string, { on: Anchor; hold: number }> = {
  "02-clearing": { on: "landed", hold: 1.4 },
  "04-refusals": { on: "complete", hold: 1.4 },
};

/** The least silence between two spoken lines when one of them has been moved onto the picture. */
const BREATH = 0.28;

type Word = { text: string; start: number; end: number };
type Measured = Record<string, Partial<Record<Anchor | "click" | "run" | "skew", number>>>;

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9-]/g, "");

/**
 * Each caption group with the time its spoken words take. speak() says how many spoken words a
 * group stands for, so the mapping is by construction; the check is that the aligner heard the
 * same words the script says were spoken.
 */
function groups(line: string, words: Word[]) {
  const out: { text: string; start: number; end: number }[] = [];
  let k = 0;
  for (const g of speak(line)) {
    const said = g.spoken.split(/\s+/).filter(Boolean);
    const span = words.slice(k, k + said.length);
    if (span.length !== said.length || span.some((w, i) => norm(w.text) !== norm(said[i]!)))
      throw new Error(`alignment does not match the script in "${line}" at "${g.words.join(" ")}": heard ${JSON.stringify(span.map((w) => w.text))}, expected ${JSON.stringify(said)}`);
    out.push({ text: g.words.join(" "), start: span[0]!.start, end: span.at(-1)!.end });
    k += said.length;
  }
  if (k !== words.length) throw new Error(`"${line}": ${words.length - k} aligned words left over`);
  return out;
}

const align = JSON.parse(readFileSync(resolve(ROOT, "film/align.json"), "utf8")) as Record<string, AlignedLine[]>;
const measured = JSON.parse(readFileSync(resolve(ROOT, "film/measured.json"), "utf8")) as Measured;
const clipSecs = JSON.parse(readFileSync(resolve(ROOT, "film/segments.json"), "utf8")) as Record<string, number>;

type Chapter = {
  id: string; kind: "card" | "shot"; from: number; dur: number;
  pre: number; title: string; url: string; index: number;
};
type Line = {
  chapter: string; take: string; at: number; secs: number;
  speech: [number, number]; show: [number, number];
  groups: { text: string; start: number; end: number }[];
  /** Break the caption after this group. Set only for lines too long for one line. */
  br?: number;
};

/**
 * Where a caption too long for one line should break: at the punctuation nearest its middle, so
 * it breaks where the voice pauses rather than wherever the width runs out ("fixing: / only the
 * net moves", not "fixing: only / the net moves").
 */
const ONE_LINE = 84;
function lineBreak(g: { text: string }[]): number | undefined {
  const total = g.map((x) => x.text).join(" ").length;
  if (total <= ONE_LINE) return undefined;
  let best: number | undefined, miss = Infinity, left = 0;
  g.forEach((x, i) => {
    left += x.text.length + (i ? 1 : 0);
    if (i === g.length - 1 || !/[,:;?.]$/.test(x.text)) return;
    const d = Math.abs(left - total / 2);
    if (d < miss && left <= ONE_LINE && total - left <= ONE_LINE) { miss = d; best = i; }
  });
  return best;
}

const chapters: Chapter[] = [];
const lines: Line[] = [];
const events: Record<string, number> = {};
let cursor = 0, shotIndex = 0;

for (const b of NARRATION) {
  if (!b.text) {
    const dur = (CARD_BEATS[b.segment] ?? 4) * BEAT_FRAMES;
    chapters.push({ id: b.segment, kind: "card", from: cursor, dur, pre: 0, title: "", url: "", index: -1 });
    cursor += dur;
    continue;
  }

  const script = sentences(b.text);
  const aligned = align[b.segment] ?? [];
  if (aligned.length !== script.length) throw new Error(`${b.segment}: ${aligned.length} aligned lines for ${script.length} in the script; run npm run voice && npm run film:align`);
  const ev = measured[b.segment] ?? {};
  // The wall clock and the picture disagreed by this much in this chapter; the voice follows the
  // picture, because that is where the cursor is.
  const skew = ev.skew ?? 0;
  const plan = planned(aligned);

  // ── Place each line, in chapter seconds ──
  const placed: { at: number; secs: number; g: ReturnType<typeof groups>; take: string }[] = [];
  for (let i = 0; i < aligned.length; i++) {
    const a = aligned[i]!;
    const g = groups(script[i]!, a.words);
    const prev = placed[i - 1];
    let at = prev ? prev.at + prev.secs + GAP : plan[0]! + skew;
    const cue = b.anchors?.[i];
    if (cue) {
      const t = ev[cue.on];
      if (t === undefined) throw new Error(`${b.segment}[${i}] is placed on "${cue.on}", which film/measured.json does not have`);
      const want = t + (cue.offset ?? 0) - g[cue.word ?? 0]!.start;
      const floor = prev ? prev.at + prev.g.at(-1)!.end + BREATH - g[0]!.start : 0;
      at = Math.max(want, floor);
      if (want < floor - 0.05) console.log(`  ! ${b.segment}[${i}] wanted ${want.toFixed(2)}s but the line before runs to ${floor.toFixed(2)}s`);
    }
    placed.push({ at, secs: a.secs, g, take: `film/voice/${b.segment}-${String(i).padStart(2, "0")}.mp3` });
  }

  // ── Cut the chapter on beats, with its key moment on one ──
  const key = KEY[b.segment];
  const keyAt = key ? ev[key.on] : undefined;
  if (key && keyAt === undefined) throw new Error(`${b.segment}: no measured "${key.on}" to put on the beat`);
  const pre = keyAt !== undefined ? (BEAT_FRAMES - (F(keyAt) % BEAT_FRAMES)) % BEAT_FRAMES : 0;
  const last = placed.at(-1)!;
  const end = Math.max(last.at + last.g.at(-1)!.end + TAIL_MIN, keyAt !== undefined ? keyAt + key!.hold : 0);
  const dur = Math.ceil((pre + F(end)) / BEAT_FRAMES) * BEAT_FRAMES;
  const have = F(clipSecs[b.segment] ?? 0);
  if (dur - pre + XF_FRAMES > have)
    throw new Error(`${b.segment}: needs ${((dur - pre + XF_FRAMES) / FPS).toFixed(2)}s of footage, the take has ${(have / FPS).toFixed(2)}s`);

  const from = cursor, zero = from + pre;   // zero: the global frame of the clip's t=0
  const m = META[b.segment]!;
  chapters.push({ id: b.segment, kind: "shot", from, dur, pre, title: m.title, url: m.url, index: shotIndex++ });
  for (const [k, v] of Object.entries(ev)) if (k !== "skew" && v !== undefined) events[`${b.segment}.${k}`] = zero + F(v);

  for (const p of placed) {
    const at = zero + F(p.at);
    lines.push({
      chapter: b.segment, take: p.take, at, secs: p.secs,
      speech: [at + F(p.g[0]!.start), at + F(p.g.at(-1)!.end)],
      show: [0, 0],
      groups: p.g.map((x) => ({ text: x.text, start: at + F(x.start), end: at + F(x.end) })),
      br: lineBreak(p.g),
    });
  }
  cursor += dur;
}
const total = cursor;

// ── When each caption is on screen ──
// In a few frames before the voice, out a beat after it, never over the next line, and never
// across a cut.
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]!, next = lines[i + 1];
  const ch = chapters.find((c) => c.id === l.chapter)!;
  const inAt = Math.max(ch.from + XF_FRAMES, l.speech[0] - 6);
  let out = Math.max(l.speech[1] + 14, inAt + F(1.2));
  if (next && next.chapter === l.chapter) out = Math.min(out, next.speech[0] - 6);
  out = Math.min(out, ch.from + ch.dur);
  l.show = [inAt, out];
}

// ── The picture's own moments, for the composition and the score ──
const open = chapters[0]!, endCard = chapters.at(-1)!;
events["open.hit"] = open.from + BEAT_FRAMES;          // the title lands on the second beat
events["end.hit"] = endCard.from + BEAT_FRAMES;

// ── Stage the footage and the fonts ──
mkdirSync(PUB, { recursive: true });
for (const c of chapters) {
  if (c.kind !== "shot") continue;
  copyFileSync(resolve(ROOT, `film/norm-${c.id.slice(0, 2)}.mp4`), resolve(PUB, `${c.id}.mp4`));
}
await fonts();

const manifest = { fps: FPS, beat: BEAT_FRAMES, xf: XF_FRAMES, total, chapters, lines, events };
writeFileSync(resolve(ROOT, "film-src/manifest.json"), JSON.stringify(manifest, null, 2));

// Seconds, for the score: it is written against the same clock.
const sec = (f: number) => +(f / FPS).toFixed(4);
writeFileSync(resolve(ROOT, "film/timeline.json"), JSON.stringify({
  total: sec(total), beat: BEAT,
  chapters: chapters.map((c) => ({ id: c.id, kind: c.kind, from: sec(c.from), dur: sec(c.dur) })),
  voice: lines.map((l) => ({ take: l.take, at: sec(l.at) })),
  speech: lines.map((l) => [sec(l.speech[0]), sec(l.speech[1])]),
  events: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, sec(v)])),
}, null, 2));

console.log(`  ${chapters.length} chapters, ${lines.length} lines, ${(total / FPS).toFixed(2)}s (${total} frames)`);
for (const c of chapters) {
  const on = Object.entries(events).filter(([k]) => k.startsWith(c.id + ".")).map(([k, v]) => `${k.split(".")[1]} ${((v - c.from) / FPS).toFixed(2)}s`);
  console.log(`    ${c.id.padEnd(12)} ${(c.from / FPS).toFixed(2).padStart(6)}s  ${(c.dur / BEAT_FRAMES).toString().padStart(2)} beats${c.pre ? `, held ${c.pre} frames` : ""}${on.length ? `   ${on.join(", ")}` : ""}`);
}
for (const [k, v] of Object.entries(events)) {
  if (!/landed|complete|hit/.test(k)) continue;
  if (v % BEAT_FRAMES !== 0) throw new Error(`${k} is at frame ${v}, off the beat`);
}

if (process.argv.includes("--layout")) process.exit(0);

// publicDir must be explicit: staticFile() resolves against the bundle's public directory, and
// without this it looks beside the project root rather than beside the entry point.
const bundled = await bundle({ entryPoint: resolve(ROOT, "film-src/Film.tsx"), publicDir: PUB });
const composition = await selectComposition({ serveUrl: bundled, id: "Setoff" });
console.log(`  composition ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames`);

let shown = -1;
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  crf: 12,
  x264Preset: "slow",
  colorSpace: "bt709",
  muted: true,
  outputLocation: resolve(ROOT, "film/setoff-picture.mp4"),
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (pct !== shown) { shown = pct; process.stdout.write(`\r  rendering ${pct}%   `); }
  },
});
console.log(`\n  film/setoff-picture.mp4`);
console.log("  Next: npm run film:score && npm run film:master");

/**
 * Archivo and Martian Mono, the app's own faces, as local files. The composition renders in a
 * headless browser; without them it silently falls back to the system font.
 */
async function fonts() {
  const dir = resolve(PUB, "fonts");
  mkdirSync(dir, { recursive: true });
  const want = {
    "archivo.woff2": "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=block",
    "martian-mono.woff2": "https://fonts.googleapis.com/css2?family=Martian+Mono:wdth,wght@75..112,100..800&display=block",
  };
  for (const [file, css] of Object.entries(want)) {
    const path = resolve(dir, file);
    if (existsSync(path)) continue;
    // A modern user agent gets the variable woff2; the latin subset is the block marked so.
    const sheet = await (await fetch(css, { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" } })).text();
    const latin = sheet.split("/* latin */")[1]?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!latin) throw new Error(`no latin woff2 in ${css}`);
    writeFileSync(path, Buffer.from(await (await fetch(latin)).arrayBuffer()));
    console.log(`  fetched ${file}`);
  }
}
