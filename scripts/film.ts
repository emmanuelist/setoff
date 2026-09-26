/**
 * Films the demo.
 *
 * This automates the CAMERA, not the content. Every frame is the deployed app reading Arc
 * mainnet. Nothing is stubbed and no footage is synthesised. What it buys is determinism: exact
 * beats, no mouse fumbling, and a re-run if anything changes.
 *
 * It also MEASURES the moments the rest of the film has to land on, rather than predicting them:
 * each real click, the instant the set-off begins, and the instant the refusal run finishes. They
 * are written to film/events.json in clip time, and the render anchors voice, captions and sound
 * to them. A take that misses one of those moments, or whose refusal run is not clean, fails here
 * rather than reaching the cut.
 *
 *   npm run film       then   npm run film:cut
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, rmSync, readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { MOVES, POINTER_RUNTIME, TRAVEL_MS, resolveMoves, type Move } from "./pointer.js";
import { NARRATION } from "./narration.js";
import { planned } from "./timeline.js";

/** The chapters that are footage. The title and end cards are drawn by the render, not filmed. */
const SHOTS = NARRATION.filter((b) => b.text).map((b) => b.segment);

/**
 * Each segment runs as long as its narration takes, from LEAD, plus a tail. The render cuts it
 * down to whole beats, so the tail only has to be long enough to cut from. Some segments have a
 * floor because the picture needs longer than the voice: the refusal run takes ~20s whatever is
 * being said over it.
 */
const TAIL = 4.5;
function windowFor(segment: string, fallback: number, floor = 0): number {
  let secs = fallback;
  if (existsSync("film/timing.json")) {
    try {
      const t = JSON.parse(readFileSync("film/timing.json", "utf8")) as Record<string, { at: number; secs: number }[]>;
      const lines = t[segment];
      if (lines?.length) secs = planned(lines).at(-1)! + lines.at(-1)!.secs + TAIL;
    } catch { /* first run: the fallback */ }
  }
  return Math.round(Math.max(secs, floor) * 10) / 10;
}

const APP = process.env.APP_URL ?? "https://setoff-omega.vercel.app";
const OUT = "film";
/** Cycle ids and the attempt count come from the facts file, so the film cannot point at a cycle
 *  the narration is not describing, or accept a run that is not the one it narrates. */
const FACTS: { settled: { id: number }; voided: { id: number }; attempts: { total: number } } =
  JSON.parse(readFileSync("film/facts.json", "utf8"));
const W = 1600, H = 900;  // 16:9, shown at 1520x855 in the 1080p frame: a 5% downscale, never a stretch

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until the page actually has content. Fixed sleeps guess; this checks. */
async function untilPainted(page: Page, minChars = 400, timeoutMs = 40_000) {
  const t0 = Date.now();
  for (;;) {
    const n = await page.evaluate(() => (document.body?.innerText ?? "").trim().length).catch(() => 0);
    if (n >= minChars) { process.stdout.write(`  painted (${n} chars, ${((Date.now() - t0) / 1000).toFixed(1)}s)\n`); return; }
    if (Date.now() - t0 > timeoutMs) { process.stdout.write(`  ! never painted after ${timeoutMs / 1000}s\n`); return; }
    await wait(500);
  }
}

/**
 * Wait for the app's own "still reading" signals to clear: skeleton plates carry aria-busy, and
 * the masthead's block counter prints "reading…" until its first poll lands.
 */
const unsettled: string[] = [];
async function untilSettled(page: Page, name: string, timeoutMs = 60_000) {
  const t0 = Date.now();
  for (;;) {
    const busy = await page
      .evaluate(() =>
        document.querySelectorAll("[aria-busy='true']").length +
        ((document.body?.innerText ?? "").includes("reading…") ? 1 : 0))
      .catch(() => 0);
    if (busy === 0) { process.stdout.write(`  settled (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`); return; }
    if (Date.now() - t0 > timeoutMs) {
      process.stdout.write(`  ! still busy after ${timeoutMs / 1000}s\n`);
      unsettled.push(name);
      return;
    }
    await wait(300);
  }
}

// ── Clip time ──────────────────────────────────────────────────────────────────
// Playwright records from context creation. The cut trims everything up to the moment the roll
// starts, so clip t=0 is exactly that moment, and every event is stored relative to it.
const setupTimes: Record<string, number> = {};
const rollStart: Record<string, number> = {};
/** Wall-clock stamps end in "@" and become clip seconds when written; the rest is kept as is. */
const events: Record<string, Record<string, unknown>> = {};
const stamp = (name: string, key: string, at = Date.now()) => {
  const list = ((events[name] ??= {})[`${key}s@`] ??= []) as number[];
  list.push(at);
};
const stampOnce = (name: string, key: string, at = Date.now()) => { (events[name] ??= {})[`${key}@`] = at; };

async function holdAfterSetup(name: string, contextAt: number, secs: number) {
  const now = Date.now();
  rollStart[name] = now;
  setupTimes[name] = +((now - contextAt) / 1000).toFixed(3);
  process.stdout.write(`  setup ${setupTimes[name]!.toFixed(1)}s (trimmed), rolling ${secs}s of picture\n`);
  await wait(secs * 1000);
}

/**
 * Fire the real interactions, timed to when the cursor ARRIVES rather than when it sets off, and
 * record the instant each one happens so the render can put a sound on it.
 */
function scheduleActions(page: Page, name: string, moves: (Move & { at: number })[]) {
  for (const m of moves) {
    if (!m.click && m.type === undefined) continue;
    setTimeout(async () => {
      try {
        await page.evaluate(() => (window as unknown as { __ptrPress?: () => void }).__ptrPress?.());
        stamp(name, "click");
        const el = page.locator(m.sel).first();
        if (m.type !== undefined) { await el.click({ timeout: 2500 }); await el.fill(m.type as string, { timeout: 2500 }); }
        else { await el.click({ timeout: 2500 }); }
        process.stdout.write(`    acted on ${m.sel}\n`);
      } catch (e) {
        process.stdout.write(`    action skipped (${m.sel}): ${((e as Error).message.split("\n")[0] ?? "").slice(0, 60)}\n`);
      }
    }, m.at * 1000 + TRAVEL_MS);
  }
}

/** Poll a condition in the page until it holds, then return the instant it first did. */
async function until(page: Page, test: string, timeoutMs: number): Promise<number | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ok = await page.evaluate(test).catch(() => null);
    if (ok === null) return null;           // page closed under us
    if (ok) return Date.now();
    await wait(40);
  }
  return null;
}

/** The set-off: Replay flips the statement to the gross, then back to the net. */
function watchSetoff(page: Page, name: string) {
  void (async () => {
    const attr = `document.querySelector('#statement')?.getAttribute('data-set-off')`;
    if (!(await until(page, `${attr} === 'gross'`, 60_000))) return;
    const at = await until(page, `${attr} === 'net'`, 15_000);
    if (at) { stampOnce(name, "setoff", at); process.stdout.write(`    set-off began\n`); }
  })();
}

/** The refusal run: the button goes to "Running…" and back when every attempt has answered. */
function watchRun(page: Page, name: string) {
  void (async () => {
    const btn = `(document.querySelector('#run-attempts')?.textContent ?? '')`;
    if (!(await until(page, `${btn}.includes('Running')`, 60_000))) return;
    const at = await until(page, `${btn}.includes('Run every attempt')`, 90_000);
    if (!at) return;
    // The counters are NumberFlow, drawn in a shadow root; the paragraph carries their values.
    const n = await page.evaluate(`(() => { const d = document.querySelector('#run-count')?.dataset ?? {};
      return { ran: Number(d.ran), off: Number(d.off), failed: Number(d.failed) }; })()`)
      .catch(() => ({ ran: NaN, off: NaN, failed: NaN })) as { ran: number; off: number; failed: number };
    stampOnce(name, "complete", at);
    Object.assign((events[name] ??= {}), { ran: n.ran, off: n.off, failed: n.failed });
    process.stdout.write(`    run complete: ${n.ran} ran, ${n.off} off their rule, ${n.failed} could not run\n`);
  })();
}

/**
 * Where the measured moments happen on screen, in capture pixels. The frames are measured
 * after the cut, because the wall clock only says roughly when a moment happened; the picture
 * says exactly.
 */
async function regions(page: Page, name: string, sels: Record<string, string>) {
  const r = await page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([k, s]) => {
    const e = document.querySelector(s);
    if (!e) return [k, null];
    const b = e.getBoundingClientRect();
    return [k, [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]];
  })), sels);
  (events[name] ??= {}).regions = r;
}

/** The cursor. Moves are keyed to spoken lines, at the times the render will speak them. */
async function pointer(page: Page, name: string) {
  let measured: { at: number; secs: number }[] | undefined;
  try {
    const t = JSON.parse(readFileSync("film/timing.json", "utf8")) as Record<string, { at: number; secs: number }[]>;
    const lines = t[name];
    if (lines) { const at = planned(lines); measured = lines.map((l, i) => ({ ...l, at: at[i]! })); }
  } catch { /* first run: absolute times */ }
  const moves = MOVES[name] ? resolveMoves(MOVES[name]!, measured) : undefined;
  if (!moves?.length) { process.stdout.write(`  pointer: no moves for ${name}\n`); return; }
  try {
    await page.evaluate(POINTER_RUNTIME.replace("__MOVES__", JSON.stringify(moves)));
    const ok = await page.evaluate(() => !!document.getElementById("__ptr"));
    const acts = moves.filter((m) => m.click || m.type !== undefined).length;
    process.stdout.write(`  pointer: ${moves.length} moves, ${acts} actions, element ${ok ? "present" : "MISSING"}\n`);
    scheduleActions(page, name, moves);
  } catch (e) { process.stdout.write(`  pointer FAILED: ${(e as Error).message.slice(0, 90)}\n`); }
}

async function segment(name: string, secs: number, go: (p: Page) => Promise<void>) {
  const browser = await chromium.launch();
  const contextAt = Date.now();   // recording starts with the context
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: `${OUT}/${name}`, size: { width: W, height: H } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  // The first recorded frames are about:blank; paint the film's ground before navigating.
  await page.goto("data:text/html,<body style=\"margin:0;background:#14130f\"></body>");
  console.log(`\n▸ ${name}`);
  await go(page);
  await pointer(page, name);
  await holdAfterSetup(name, contextAt, secs);
  await ctx.close();     // flushes the video
  await browser.close();
}

async function main() {
  if (existsSync("film/timing.json")) console.log("Sizing segments to film/timing.json");
  else console.log("No film/timing.json: using planned windows. Run npm run voice first.");

  mkdirSync(OUT, { recursive: true });
  const wanted = new Set(SHOTS);
  for (const name of wanted) rmSync(`${OUT}/${name}`, { recursive: true, force: true });
  // Drop segment directories that are no longer part of the film; film-cut globs the directory.
  for (const entry of readdirSync(OUT, { withFileTypes: true })) {
    if (!entry.isDirectory() || wanted.has(entry.name) || !/^\d\d-/.test(entry.name)) continue;
    rmSync(`${OUT}/${entry.name}`, { recursive: true, force: true });
    console.log(`  removed stale segment ${entry.name}`);
  }

  const open = async (p: Page, path: string, name: string) => {
    await p.goto(`${APP}${path}`, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 1200);
    await untilSettled(p, name);
    await wait(700);
  };

  // 1. The problem, over the live product's own claim. No scroll: the claim stays in frame.
  await segment("01-problem", windowFor("01-problem", 16), (p) => open(p, "/", "01-problem"));

  // 2. The moment. Replay rolls the figure back up to the gross, holds it, then sets off.
  await segment("02-clearing", windowFor("02-clearing", 34), async (p) => {
    await open(p, `/cycles/${FACTS.settled.id}`, "02-clearing");
    await regions(p, "02-clearing", { figure: "#statement .fig" });
    watchSetoff(p, "02-clearing");
  });

  // 3. The reversal: the cycle that was voided, and the deposit that came back.
  await segment("03-reversal", windowFor("03-reversal", 22), (p) => open(p, `/cycles/${FACTS.voided.id}`, "03-reversal"));

  // 4. The refusal room, pressed live, held until the run has finished.
  await segment("04-refusals", windowFor("04-refusals", 34, 34), async (p) => {
    await open(p, "/refusals", "04-refusals");
    await regions(p, "04-refusals", { button: "#run-attempts", count: "#run-count" });
    watchRun(p, "04-refusals");
  });

  // 5. Close on the strongest result: the settled statement.
  await segment("05-close", windowFor("05-close", 19), (p) => open(p, `/cycles/${FACTS.settled.id}`, "05-close"));

  writeFileSync(`${OUT}/setup.json`, JSON.stringify(setupTimes, null, 2));

  // Events in clip time, and a refusal to hand a bad take to the cut.
  const clip: Record<string, Record<string, unknown>> = {};
  for (const [name, ev] of Object.entries(events)) {
    const zero = rollStart[name]!;
    clip[name] = {};
    for (const [k, v] of Object.entries(ev)) {
      if (k.endsWith("s@")) clip[name]![k.replace("s@", "s")] = (v as number[]).map((x) => +((x - zero) / 1000).toFixed(3));
      else if (k.endsWith("@")) clip[name]![k.replace("@", "")] = +(((v as number) - zero) / 1000).toFixed(3);
      else clip[name]![k] = v;
    }
  }
  writeFileSync(`${OUT}/events.json`, JSON.stringify(clip, null, 2));
  console.log(`\nevents: ${JSON.stringify(clip)}`);

  const problems: string[] = [];
  // A page still reading when the roll starts films "reading…" where a block number should be.
  for (const name of unsettled) problems.push(`${name} was still reading from the chain when it rolled`);
  if (typeof clip["02-clearing"]?.setoff !== "number") problems.push("the set-off never began: Replay was not pressed or did not take");
  const run = clip["04-refusals"];
  if (typeof run?.complete !== "number") problems.push("the refusal run never finished inside the window");
  else {
    if (run.ran !== FACTS.attempts.total) problems.push(`the run shows ${run.ran} of ${FACTS.attempts.total}`);
    if (run.off !== 0) problems.push(`${run.off} attempts came out off their rule`);
    if (run.failed !== 0) problems.push(`${run.failed} attempts could not run (RPC); re-film`);
    // The payoff line and a held beat after it must fit inside what was recorded.
    const last = JSON.parse(readFileSync("film/timing.json", "utf8"))["04-refusals"]?.at(-1)?.secs ?? 5;
    const need = (run.complete as number) + last + 3;
    const have = windowFor("04-refusals", 34, 34);
    if (need > have) problems.push(`the run finished at ${(run.complete as number).toFixed(1)}s; the payoff needs ${need.toFixed(1)}s of a ${have}s take`);
  }
  if (problems.length) {
    console.error("\n" + problems.map((p) => "  x " + p).join("\n") + "\n\nThis take is not good enough to cut. Re-run npm run film.");
    process.exit(1);
  }
  console.log("\nfilmed, and every measured moment is present. next: npm run film:cut");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
