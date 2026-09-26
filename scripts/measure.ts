/**
 * Finds the film's key moments in the footage itself.
 *
 * The capture stamps each moment with the wall clock, which only says roughly when it happened:
 * the recorder, the page and the stamp each run on their own schedule. The frames say exactly.
 * For each moment this reads the region of the picture where it happens and finds the frame
 * where that region changes, or comes to rest.
 *
 *   replay    the figure starts rolling back up to the gross
 *   setoff    the figure starts rolling down to the net
 *   landed    the figure comes to rest on the net
 *   run       the refusal run starts (its button flips to "Running…")
 *   complete  the run finishes (the button flips back)
 *
 * It also reports how far the wall clock was from the picture, so a disagreement between the two
 * shows up here rather than as a caption a few frames off.
 *
 *   npm run film:measure
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { FPS } from "./timeline.js";

type Rect = [number, number, number, number];
type Ev = { clicks?: number[]; setoff?: number; complete?: number; regions?: Record<string, Rect | null> };

const events = JSON.parse(readFileSync("film/events.json", "utf8")) as Record<string, Ev>;
const clip = (seg: string) => `film/norm-${seg.slice(0, 2)}.mp4`;

/**
 * Mean absolute change per frame inside `r`, from `from` to `to` seconds. Entry i compares frame
 * i with frame i-1 and is stamped with frame i's time.
 */
function motion(file: string, r: Rect, from: number, to: number): { t: number; d: number }[] {
  const [x, y, w, h] = r;
  const start = Math.max(0, from);
  const out = spawnSync("ffmpeg", [
    "-v", "error", "-ss", start.toFixed(3), "-t", (to - start).toFixed(3), "-i", file,
    "-vf", `format=gray,crop=${w}:${h}:${x}:${y}`, "-f", "rawvideo", "-",
  ], { maxBuffer: 1 << 30 });
  if (out.status !== 0) throw new Error(`ffmpeg: ${out.stderr.toString().slice(0, 200)}`);
  const buf = out.stdout, size = w * h, n = Math.floor(buf.length / size);
  const res: { t: number; d: number }[] = [];
  for (let i = 1; i < n; i++) {
    let sum = 0;
    const a = (i - 1) * size, b = i * size;
    for (let k = 0; k < size; k++) sum += Math.abs(buf[b + k]! - buf[a + k]!);
    res.push({ t: +(start + i / FPS).toFixed(3), d: sum / size });
  }
  return res;
}

const first = (m: { t: number; d: number }[], over: number, after = -Infinity) =>
  m.find((f) => f.t >= after && f.d > over)?.t;

/** The first frame after `after` from which the region stays still for `hold` seconds. */
function rest(m: { t: number; d: number }[], after: number, still: number, hold: number) {
  const need = Math.round(hold * FPS);
  for (let i = 0; i < m.length; i++) {
    if (m[i]!.t < after) continue;
    const run = m.slice(i, i + need);
    if (run.length === need && run.every((f) => f.d <= still)) return +(m[i]!.t - 1 / FPS).toFixed(3);
  }
  return undefined;
}

const out: Record<string, Record<string, number>> = {};
const fail: string[] = [];

// ── The set-off ────────────────────────────────────────────────────────────
{
  const seg = "02-clearing", ev = events[seg], fig = ev?.regions?.figure;
  const click = ev?.clicks?.[0];
  if (!ev || !fig || click === undefined) fail.push(`${seg}: no click or figure region was recorded`);
  else {
    // A digit rolling moves ~50 levels across the figure; its easing tail and sub-pixel settling
    // move under 1. "Landed" is when the eye sees it stop, not when the last pixel does.
    const MOVING = 5, STILL = 1;
    const m = motion(clip(seg), fig, click - 0.8, click + 7);
    const replay = first(m, MOVING, click - 0.8);
    const quiet = replay !== undefined ? rest(m, replay + 0.2, STILL, 0.25) : undefined;
    const setoff = quiet !== undefined ? first(m, MOVING, quiet) : undefined;
    const landed = setoff !== undefined ? rest(m, setoff + 0.2, STILL, 0.3) : undefined;
    if (replay === undefined || setoff === undefined || landed === undefined) {
      fail.push(`${seg}: could not find the set-off in the frames (replay ${replay}, setoff ${setoff}, landed ${landed})`);
    } else {
      out[seg] = { replay, setoff, landed, click: +(replay - 1 / FPS).toFixed(3), skew: +(replay - click).toFixed(3) };
      console.log(`  ${seg}  replay ${replay.toFixed(2)}s  set-off ${setoff.toFixed(2)}s  landed ${landed.toFixed(2)}s`);
      console.log(`               held the gross ${(setoff - replay).toFixed(2)}s, rolled to the net in ${(landed - setoff).toFixed(2)}s`);
      console.log(`               wall clock was ${((replay - click) * 1000).toFixed(0)}ms from the picture`);
    }
  }
}

// ── The refusal run ────────────────────────────────────────────────────────
{
  const seg = "04-refusals", ev = events[seg], btn = ev?.regions?.button;
  const click = ev?.clicks?.[0];
  if (!ev || !btn || click === undefined || ev.complete === undefined) fail.push(`${seg}: no click, completion or button region was recorded`);
  else {
    // The button's whole face changes when it flips; the cursor and the spinner inside it move
    // far less of it. Only a change that large counts.
    const FLIP = 15;
    const a = motion(clip(seg), btn, click - 0.6, click + 1.2);
    const b = motion(clip(seg), btn, ev.complete - 1.6, ev.complete + 1.2);
    const run = first(a, FLIP), complete = first(b, FLIP);
    if (run === undefined || complete === undefined) {
      fail.push(`${seg}: could not find the run in the frames (run ${run}, complete ${complete})`);
    } else {
      out[seg] = { click: +(run - 1 / FPS).toFixed(3), run, complete, skew: +(run - click).toFixed(3) };
      console.log(`  ${seg}  run ${run.toFixed(2)}s  complete ${complete.toFixed(2)}s  (${(complete - run).toFixed(1)}s against the chain)`);
      console.log(`               wall clock was ${((run - click) * 1000).toFixed(0)}ms from the picture`);
    }
  }
}

if (fail.length) {
  console.error("\n" + fail.map((f) => "  x " + f).join("\n"));
  process.exit(1);
}
writeFileSync("film/measured.json", JSON.stringify(out, null, 2));
console.log("\n  film/measured.json");
