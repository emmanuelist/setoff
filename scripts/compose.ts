/**
 * Composites each segment to 1920x1080: ground, product in its window, chrome
 * on top, and the caption of the moment in the band below.
 *
 * Three things this arrangement buys, all of them notes from a review of the
 * previous cut:
 *   - nothing is ever drawn over the product, so no scrim and no text shadow
 *   - the captured 1440x900 is shown at 1600x1000 inside a bezel, so the film
 *     is 1080p without pretending to more detail than was captured
 *   - a caption is on screen only while its sentence is spoken, from the
 *     measured per-sentence timings, so silence is genuinely silent
 *
 *   npm run film:compose
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { NARRATION } from "./narration.js";

import { FILM, WIN } from "./geometry.js";
const W = FILM.W, H = FILM.H, GROUND = FILM.ground;
const XFADE = Number(process.env.FILM_XFADE ?? 0.5);

type Cue = { text: string; at: number; secs: number };
const timing: Record<string, Cue[]> = JSON.parse(readFileSync("film/timing.json", "utf8"));

const ff = (args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const dur = (f: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

mkdirSync("film/comp", { recursive: true });

const made: string[] = [];
for (const b of NARRATION) {
  const src = `film/norm-${b.segment.slice(0, 2)}.mp4`;
  if (!existsSync(src)) { console.log(`  ! ${b.segment}: no ${src}, run npm run film:cut first`); continue; }
  const out = `film/comp/${b.segment}.mp4`;
  const cues = timing[b.segment] ?? [];
  const chrome = `film/chrome/${b.segment}.png`;

  // Inputs: footage, chrome, then one PNG per caption.
  const inputs = ["-i", src, "-i", chrome];
  cues.forEach((_, i) => inputs.push("-i", `film/caps/${b.segment}-${String(i).padStart(2, "0")}.png`));

  // The card fills the frame; every other segment sits in the window.
  const isCard = b.segment === "00-open";
  const chain: string[] = [];
  if (isCard) {
    chain.push(`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[base]`);
  } else {
    chain.push(
      // The ground must outlast the footage: at d=1 with shortest=1 every
      // segment came out exactly one second long.
      `color=c=${GROUND}:s=${W}x${H}:r=30:d=${dur(src).toFixed(3)}[bg]`,
      `[0:v]scale=${WIN.w}:${WIN.h}:flags=lanczos,setsar=1[vid]`,
      `[bg][vid]overlay=${WIN.x}:${WIN.y}:shortest=1[base]`,
    );
  }
  chain.push(`[base][1:v]overlay=0:0[c0]`);

  // Each caption appears exactly while its sentence is spoken, plus a short
  // lead-in so the line lands a beat before the voice reaches it.
  const LEAD = 0.3;
  let last = "c0";
  cues.forEach((c, i) => {
    const from = Math.max(0, c.at - LEAD);
    const to = c.at + c.secs;
    const label = i === cues.length - 1 ? "vout" : `c${i + 1}`;
    chain.push(`[${last}][${i + 2}:v]overlay=0:0:enable='between(t,${from.toFixed(2)},${to.toFixed(2)})'[${label}]`);
    last = label;
  });
  if (!cues.length) chain.push(`[c0]null[vout]`);

  ff([...inputs, "-filter_complex", chain.join(";"), "-map", "[vout]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30",
      // No -t here: the crossfade below already removes the overlap, and the
      // manifest already records the post-transition length. Trimming to it too
      // would subtract the overlap twice and walk the voice out of sync.
      out]);
  console.log(`  ${b.segment.padEnd(14)} ${dur(out).toFixed(1)}s  ${cues.length} caption${cues.length === 1 ? "" : "s"}`);
  made.push(out);
}

// Crossfade the composited segments into one picture.
if (made.length > 1 && XFADE > 0) {

  const graph: string[] = [];
  let prev = "0:v", offset = dur(made[0]!) - XFADE;
  for (let i = 1; i < made.length; i++) {
    const label = i === made.length - 1 ? "vout" : `x${i}`;
    graph.push(`[${prev}][${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}[${label}]`);
    prev = label;
    offset += dur(made[i]!) - XFADE;
  }
  ff([...made.flatMap((f) => ["-i", f]), "-filter_complex", graph.join(";"), "-map", "[vout]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30",
      "film/setoff-silent.mp4"]);

} else {
  writeFileSync("film/list.txt", made.map((f) => `file '${f.split("/").pop()}'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", "film/list.txt", "-c", "copy", "film/setoff-silent.mp4"]);
}

console.log(`\n  film/setoff-silent.mp4  (${dur("film/setoff-silent.mp4").toFixed(1)}s at ${W}x${H})`);
console.log("  Next: npm run film:mix");
