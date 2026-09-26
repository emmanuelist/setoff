/**
 * The film's sound: a written score, a handful of effects, and the voice, mixed.
 *
 * The first cut ran a drone under the whole film: two sines a few tenths of a hertz apart, and
 * nothing else. It had no tempo, no harmony that went anywhere and no event it answered to, so it
 * read as a hum. This is built the way the reference trailer's score is: synthesised with ffmpeg,
 * so there is no licence and nothing to attribute, and written to a tempo rather than laid under
 * the picture.
 *
 *   tempo    58.06 BPM, one beat every 31 frames. Every cut in the film is on this grid, and so is
 *            the one moment the film exists for: the net landing (render.ts moves it there).
 *   harmony  A minor while the problem is stated and the product is shown. C and a high shimmer
 *            join only when the net lands, the one piece of good news, and again under the claim
 *            at the close. The reversal goes back to A minor.
 *   events   a riser that stops dead on the landing, an impact under it, a click on each real
 *            press, a thunk when the refusal run finishes, one resolve under the end card.
 *
 * Under speech the score drops by 12 dB, on a hand-drawn envelope rather than a compressor
 * following the voice, so it never pumps between words. Every noise source has a fixed seed, so
 * two runs produce the same file.
 *
 *   npm run film:score        writes film/audio/{voice,score,sfx,mix}.wav
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

type Timeline = {
  total: number; beat: number;
  chapters: { id: string; kind: string; from: number; dur: number }[];
  voice: { take: string; at: number }[];
  speech: [number, number][];
  events: Record<string, number>;
};
const TL = JSON.parse(readFileSync("film/timeline.json", "utf8")) as Timeline;
const OUT = "film/audio";
mkdirSync(OUT, { recursive: true });

const B = TL.beat, T = +(TL.total + 0.05).toFixed(3);
const ch = (id: string) => TL.chapters.find((c) => c.id === id)!;
const ev = (k: string) => { const v = TL.events[k]; if (v === undefined) throw new Error(`no event ${k} in film/timeline.json`); return v; };
const n = (x: number) => x.toFixed(4);

const LANDED = ev("02-clearing.landed"), COMPLETE = ev("04-refusals.complete");
const OPEN_HIT = ev("open.hit"), END_HIT = ev("end.hit");
const PRODUCT = ch("02-clearing").from, REVERSAL = ch("03-reversal").from;
const END = ch("06-end").from;
/** The claim, the last spoken line: the harmony opens again under it. */
const CLAIM = TL.speech.at(-1)![0];

const ff = (args: string[]) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });

/** A level that changes at chapter boundaries, crossfading over one beat centred on each. */
function perChapter(levels: Record<string, number>): string {
  const r = B / 2;
  return TL.chapters.map((c) => {
    const l = levels[c.id] ?? 0;
    if (!l) return "0";
    const a = c.from, b = c.from + c.dur;
    return `${l}*clip((t-${n(a)})/${n(2 * r)}+0.5,0,1)*clip((${n(b)}-t)/${n(2 * r)}+0.5,0,1)`;
  }).join("+");
}

/** 0 → 1 over `d` seconds from `at`. */
const ramp = (at: number, d: number) => `clip((t-${n(at)})/${n(d)},0,1)`;
/** 1 → 0 over `d` seconds from `at`. */
const fall = (at: number, d: number) => `clip((${n(at + d)}-t)/${n(d)},0,1)`;

// ── pulse ────────────────────────────────────────────────────────────────
// A sub kick on every beat: pitch falls from ~94Hz to 46Hz inside the first 40ms, which reads as
// weight rather than as a note. Lighter under the history, full once the product is on screen.
// It drops out for the two beats of the riser, so the landing arrives out of a held breath, and
// stops once the end card has resolved.
const RISE = 2 * B;
ff(["-f", "lavfi", "-i",
  `aevalsrc=exprs='(0.55+0.45*gte(t,${n(PRODUCT)}))*min(1,t/2.6)*(1-between(t,${n(LANDED - RISE + 0.02)},${n(LANDED - 0.02)}))*lt(t,${n(END_HIT + 2 * B)})*exp(-mod(t,${n(B)})*12)*sin(2*PI*(46+48*exp(-mod(t,${n(B)})*24))*mod(t,${n(B)}))':d=${T}:s=48000`,
  "-af", "lowpass=f=320,volume=0.9", "-ac", "2", `${OUT}/_kick.wav`]);

// ── ticks ────────────────────────────────────────────────────────────────
// Two layers, a quarter and a third of a beat, so they drift in and out of phase instead of
// sounding like a metronome. They are the fixing's clock: quiet under the history, present
// under the product, forward during the refusal run, gone for the riser.
const tickLevel = perChapter({ "01-problem": 0.3, "02-clearing": 0.6, "03-reversal": 0.35, "04-refusals": 0.9, "05-close": 0.35 });
ff(["-f", "lavfi", "-i",
  `aevalsrc=exprs='0.55*(0.30+0.70*not(mod(floor(t/(${n(B)}/4)),4)))*exp(-mod(t,${n(B)}/4)*150)*sin(2*PI*2550*mod(t,${n(B)}/4))':d=${T}:s=48000`,
  "-f", "lavfi", "-i",
  `aevalsrc=exprs='0.30*exp(-mod(t,${n(B)}/3)*170)*sin(2*PI*3300*mod(t,${n(B)}/3))':d=${T}:s=48000`,
  "-filter_complex",
  `[0][1]amix=inputs=2:normalize=0,highpass=f=1100,aecho=0.9:0.35:37:0.14,` +
  `volume='(${tickLevel})*(1-between(t,${n(LANDED - RISE)},${n(LANDED)}))':eval=frame,volume=0.30[tk]`,
  "-map", "[tk]", "-ac", "2", `${OUT}/_ticks.wav`]);

// ── harmony ──────────────────────────────────────────────────────────────
// Chords, voiced in the middle register, not a drone. The first cut's bed was a 55Hz pair beating
// against itself for the whole film, which is the hum everyone hears as "hmm"; the only thing
// below 100Hz here is a quiet root and the kick. Each note carries its second and third
// harmonics, so it reads as a tone rather than a test signal, is detuned a quarter-hertz between
// the ears for width, and breathes over eight beats.
//
//   the problem, the product   A and E, an open fifth: unresolved
//   the net lands              C and a shimmer (E, A) join: the one piece of good news
//   the reversal               D minor (D, F, A): the turn, A held as the common tone
//   the refusals               back to the open fifth, the ticks forward
//   the claim, the end card    C and the shimmer again, then the resolve
const REFUSALS = ch("04-refusals").from;
type Note = { f: number; level: number; on: [number, number][] };
const A_OPEN: [number, number][] = [[0, REVERSAL], [REFUSALS, T]];
const LIFT: [number, number][] = [[LANDED, REVERSAL], [CLAIM, T]];
const NOTES: Note[] = [
  { f: 55, level: 0.10, on: A_OPEN },                      // root, felt more than heard
  { f: 110, level: 0.22, on: A_OPEN },
  { f: 164.81, level: 0.15, on: [[PRODUCT, REVERSAL], [REFUSALS, T]] },
  { f: 220, level: 0.12, on: [[0, T]] },                   // A3: common to every chord
  { f: 261.63, level: 0.11, on: LIFT },
  { f: 659.25, level: 0.035, on: LIFT },
  { f: 880, level: 0.026, on: LIFT },
  { f: 73.42, level: 0.10, on: [[REVERSAL, REFUSALS]] },   // D minor
  { f: 146.83, level: 0.18, on: [[REVERSAL, REFUSALS]] },
  { f: 174.61, level: 0.13, on: [[REVERSAL, REFUSALS]] },
];
/** On over each window, with a soft attack and a longer release, crossing at chapter cuts. */
const env = (on: [number, number][]) =>
  on.map(([a, b]) => `clip((t-${n(a - 0.5)})/1.2,0,1)*clip((${n(b + 0.8)}-t)/1.6,0,1)`).join("+");
const tone = (f: number, d: number) =>
  `(sin(2*PI*${f + d}*t)+0.25*sin(2*PI*${2 * (f + d)}*t)+0.10*sin(2*PI*${3 * (f + d)}*t))`;
const BREATHE = `(0.82+0.18*sin(2*PI*t/${n(8 * B)}-PI/2))`;
NOTES.forEach((x, i) => {
  const d = x.f >= 100 ? 0.125 : 0;
  ff(["-f", "lavfi", "-i",
    `aevalsrc=exprs='${x.level}*min(1,${env(x.on)})*${BREATHE}*${tone(x.f, -d)}|${x.level}*min(1,${env(x.on)})*${BREATHE}*${tone(x.f, d)}':d=${T}:s=48000`,
    `${OUT}/_n${i}.wav`]);
});
ff([...NOTES.flatMap((_, i) => ["-i", `${OUT}/_n${i}.wav`]),
  "-filter_complex",
  `${NOTES.map((_, i) => `[${i}]`).join("")}amix=inputs=${NOTES.length}:normalize=0,lowpass=f=2600,` +
  `afade=t=in:st=0:d=2.2,afade=t=out:st=${n(T - 3.2)}:d=3.1,volume=0.36[pad]`,
  "-map", "[pad]", "-ac", "2", `${OUT}/_pad.wav`]);

// ── riser ────────────────────────────────────────────────────────────────
// Two beats of rising pitch and rising air that stop dead on the hit.
ff(["-f", "lavfi", "-i", `aevalsrc=exprs='0.50*pow(t/${n(RISE)},2.2)*sin(2*PI*(150*exp(t*1.15))*t)':d=${n(RISE)}:s=48000`,
  "-f", "lavfi", "-i", `anoisesrc=d=${n(RISE)}:c=pink:a=0.8:seed=1001`,
  "-filter_complex", `[1]highpass=f=700,volume='pow(t/${n(RISE)},3)':eval=frame[air];` +
  `[0][air]amix=inputs=2:normalize=0,afade=t=out:st=${n(RISE - 0.075)}:d=0.075,volume=0.42[r]`,
  "-map", "[r]", "-ac", "2", `${OUT}/riser.wav`]);

// The score: pulse, ticks, harmony and the risers, left quiet so the effects and the voice sit
// on top of it.
const at = (s: number) => Math.max(0, Math.round(s * 1000));
ff(["-i", `${OUT}/_pad.wav`, "-i", `${OUT}/_kick.wav`, "-i", `${OUT}/_ticks.wav`, "-i", `${OUT}/riser.wav`, "-i", `${OUT}/riser.wav`,
  "-filter_complex",
  `[3]adelay=${at(LANDED - RISE)}:all=1,volume=0.75[r1];[4]adelay=${at(COMPLETE - RISE)}:all=1,volume=0.45[r2];` +
  `[0][1][2][r1][r2]amix=inputs=5:normalize=0,alimiter=limit=0.89,volume=0.95[mix]`,
  "-map", "[mix]", "-t", `${T}`, "-ac", "2", `${OUT}/score.wav`]);

// ── effects ──────────────────────────────────────────────────────────────
// Impact: a sub falling from ~120Hz to 26Hz, a close crack for the edge, a room tail.
ff(["-f", "lavfi", "-i", "aevalsrc=exprs='exp(-t*4.2)*sin(2*PI*(95*exp(-t*3.2)+26)*t)':d=1.6:s=48000",
  "-f", "lavfi", "-i", "anoisesrc=d=0.09:c=brown:a=1:seed=1002",
  "-f", "lavfi", "-i", "anoisesrc=d=1.3:c=pink:a=0.5:seed=1003",
  "-filter_complex", "[0]volume=0.95[sub];[1]lowpass=f=950,afade=t=out:st=0.008:d=0.08,volume=0.8[crack];" +
  "[2]lowpass=f=520,afade=t=in:st=0:d=0.02,afade=t=out:st=0.1:d=1.15,volume=0.13[tail];" +
  "[sub][crack][tail]amix=inputs=3:normalize=0,aecho=0.85:0.7:110:0.22,volume=0.8[imp]",
  "-map", "[imp]", "-ac", "2", `${OUT}/impact.wav`]);
// The same weight without the crack, for a hit that lands under a spoken word.
ff(["-f", "lavfi", "-i", "aevalsrc=exprs='exp(-t*4.2)*sin(2*PI*(95*exp(-t*3.2)+26)*t)':d=1.6:s=48000",
  "-f", "lavfi", "-i", "anoisesrc=d=1.3:c=pink:a=0.5:seed=1003",
  "-filter_complex", "[0]volume=0.95[sub];[1]lowpass=f=520,afade=t=in:st=0:d=0.02,afade=t=out:st=0.1:d=1.15,volume=0.10[tail];" +
  "[sub][tail]amix=inputs=2:normalize=0,aecho=0.85:0.7:110:0.22,volume=0.8[imp]",
  "-map", "[imp]", "-ac", "2", `${OUT}/landing.wav`]);
// Resolve: A, its fifth and octave, a few milliseconds apart, so it reads as a chord let go.
ff(["-f", "lavfi", "-i", "sine=f=880:d=2.4:r=48000", "-f", "lavfi", "-i", "sine=f=1320:d=2.4:r=48000", "-f", "lavfi", "-i", "sine=f=1760:d=2.4:r=48000",
  "-filter_complex", "[0]volume=0.5[a];[1]adelay=55:all=1,volume=0.3[b];[2]adelay=110:all=1,volume=0.16[c];" +
  "[a][b][c]amix=inputs=3:normalize=0,afade=t=in:st=0:d=0.01,afade=t=out:st=0.18:d=2.1," +
  "aecho=0.8:0.65:220|370:0.3|0.18,volume=0.55[chime]",
  "-map", "[chime]", "-ac", "2", `${OUT}/resolve.wav`]);
// Click: a short noise transient through a narrow band. A key, not a mouse.
ff(["-f", "lavfi", "-i", "anoisesrc=d=0.06:c=white:a=1:seed=1005",
  "-af", "bandpass=f=2100:width_type=q:w=1.1,afade=t=out:st=0.004:d=0.05,volume=0.45", "-ac", "2", `${OUT}/click.wav`]);
// Lock: low body and a brown-noise thud, for the run coming to rest.
ff(["-f", "lavfi", "-i", "sine=frequency=116:duration=0.45", "-f", "lavfi", "-i", "anoisesrc=d=0.08:c=brown:a=0.9:seed=1006",
  "-filter_complex", "[0]afade=t=out:st=0.04:d=0.4[a];[1]lowpass=f=700,afade=t=out:st=0.01:d=0.07[b];[a][b]amix=inputs=2:normalize=0,volume=0.75[thunk]",
  "-map", "[thunk]", "-ar", "48000", "-ac", "2", `${OUT}/lock.wav`]);
// Air, for the two thresholds: into the product, and out of it.
ff(["-f", "lavfi", "-i", "anoisesrc=d=0.9:c=pink:a=0.5:seed=1007",
  "-af", "highpass=f=300,lowpass=f=5000,afade=t=in:st=0:d=0.45,afade=t=out:st=0.5:d=0.4,volume=0.32", "-ar", "48000", "-ac", "2", `${OUT}/air.wav`]);

const SFX: { at: number; file: string; volume: number }[] = [
  { at: OPEN_HIT, file: "impact", volume: 0.7 },
  { at: ch("01-problem").from - 0.45, file: "air", volume: 0.6 },
  { at: ev("02-clearing.click"), file: "click", volume: 0.9 },
  { at: LANDED, file: "landing", volume: 1.0 },
  { at: ev("04-refusals.click"), file: "click", volume: 0.9 },
  { at: COMPLETE, file: "lock", volume: 0.85 },
  { at: COMPLETE, file: "landing", volume: 0.45 },
  { at: END - 0.45, file: "air", volume: 0.6 },
  { at: END_HIT, file: "impact", volume: 0.55 },
  { at: END_HIT, file: "resolve", volume: 1.0 },
];
ff([...SFX.flatMap((s) => ["-i", `${OUT}/${s.file}.wav`]),
  "-filter_complex",
  SFX.map((s, i) => `[${i}]adelay=${at(s.at)}:all=1,volume=${s.volume}[s${i}]`).join(";") + ";" +
  SFX.map((_, i) => `[s${i}]`).join("") + `amix=inputs=${SFX.length}:normalize=0,apad=whole_dur=${T}[fx]`,
  "-map", "[fx]", "-t", `${T}`, "-ar", "48000", "-ac", "2", `${OUT}/sfx.wav`]);

// ── voice ────────────────────────────────────────────────────────────────
// Each take where the layout put it. The takes peak near -0.8 dBTP; the master adds ~1 dB of
// gain in linear mode, which needs headroom, so a fast limiter takes the few peaks above -3.6 dB.
// It touches single syllables, not the delivery.
ff([...TL.voice.flatMap((v) => ["-i", v.take]),
  "-filter_complex",
  TL.voice.map((v, i) => `[${i}]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${at(v.at)}:all=1[v${i}]`).join(";") + ";" +
  TL.voice.map((_, i) => `[v${i}]`).join("") + `amix=inputs=${TL.voice.length}:normalize=0,alimiter=limit=0.66:attack=4:release=60:level=0,apad=whole_dur=${T}[vo]`,
  "-map", "[vo]", "-t", `${T}`, "-ar", "48000", "-ac", "2", `${OUT}/voice.wav`]);

// ── mix ──────────────────────────────────────────────────────────────────
// Lines less than a beat apart share one duck, so the score does not bob between sentences.
const spans: [number, number][] = [];
for (const [a, b] of TL.speech) {
  const last = spans.at(-1);
  if (last && a - last[1] < 0.9) last[1] = b; else spans.push([a, b]);
}
const DUCK = 0.25;   // -12 dB under speech
const duck = spans.map(([a, b]) => `clip((t-${n(a - 0.3)})/0.3,0,1)*clip((${n(b + 0.55)}-t)/0.55,0,1)`).join("+");
ff(["-i", `${OUT}/voice.wav`, "-i", `${OUT}/score.wav`, "-i", `${OUT}/sfx.wav`,
  "-filter_complex",
  `[1]volume='1-${n(1 - DUCK)}*min(1,${duck})':eval=frame,volume=${process.env.SCORE_GAIN ?? "0.7"}[bed];` +
  `[2]volume=${process.env.SFX_GAIN ?? "0.8"}[fx];` +
  // The same headroom for the sum: where a line starts as the bed is still coming down, the two
  // can peak together.
  `[0][bed][fx]amix=inputs=3:normalize=0,alimiter=limit=0.7:attack=4:release=80:level=0[m]`,
  "-map", "[m]", "-t", `${T}`, "-ar", "48000", "-ac", "2", `${OUT}/mix.wav`]);

// The bed on its own, ducked exactly as in the mix, so its level under the voice can be measured.
ff(["-i", `${OUT}/score.wav`, "-i", `${OUT}/sfx.wav`, "-filter_complex",
  `[0]volume='1-${n(1 - DUCK)}*min(1,${duck})':eval=frame,volume=${process.env.SCORE_GAIN ?? "0.7"}[bed];` +
  `[1]volume=${process.env.SFX_GAIN ?? "0.8"}[fx];[bed][fx]amix=inputs=2:normalize=0[m]`,
  "-map", "[m]", "-t", `${T}`, "-ar", "48000", "-ac", "2", `${OUT}/bed.wav`]);

// ── how it sits ──────────────────────────────────────────────────────────
// Nobody on this side of the pipeline can listen, so the balance is measured: the voice, and the
// bed both under it and between lines. Speech wants the bed 15 LU or more below it.
const during = spans.map(([a, b]) => `between(t,${n(a)},${n(b)})`).join("+");
const lufs = (file: string, select?: string) => {
  const af = (select ? `aselect='${select}',asetpts=N/SR/TB,` : "") + "ebur128=framelog=quiet";
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", af, "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(log.slice(log.lastIndexOf("Summary")));
  return m ? Number(m[1]) : NaN;
};
const voice = lufs(`${OUT}/voice.wav`, during);
const under = lufs(`${OUT}/bed.wav`, during);
const gaps = lufs(`${OUT}/bed.wav`, `not(${during})`);
console.log(`  film/audio/mix.wav  ${T.toFixed(2)}s: voice, score (${spans.length} ducks), ${SFX.length} effects`);
console.log(`  voice ${voice.toFixed(1)} LUFS · bed under it ${under.toFixed(1)} (${(voice - under).toFixed(1)} LU down) · bed between lines ${gaps.toFixed(1)}`);
if (voice - under < 15) console.log("  ! the bed is less than 15 LU under the voice; lower SCORE_GAIN");
