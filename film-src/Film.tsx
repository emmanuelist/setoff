 
import {
  AbsoluteFill,
  Composition,
  OffthreadVideo,
  Sequence,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from "remotion";
import manifest from "./manifest.json";

/**
 * The film. Footage of the live app, in a window, with the surround drawn
 * around it — never over it.
 *
 * Everything is expressed in frames rather than in an ffmpeg filtergraph, which
 * is why this exists: the graph version cost a fade-clock bug, an enable-window
 * bug and a geometry mismatch, all of them timing errors that a frame-indexed
 * component cannot make.
 */

const FPS = 30;
const W = 1920, H = 1080;
const FRAME = { x: 200, y: 56, w: 1520, bar: 38, h: 855 };

const T = {
  ground: "#14130f",
  ink: "#f4f3ef",
  dim: "#8e8d85",
  spoken: "#ffffff",
  rule: "#33312a",
  violet: "#8f7be0",
  display: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  figure: '"Martian Mono", ui-monospace, Menlo, monospace',
};

type Word = { text: string; start: number; end: number };
type Line = { text: string; at: number; secs: number; words: Word[] };
type Chapter = {
  id: string; title: string; url: string; seconds: number;
  card?: { kicker: string; title: string; subtitle: string };
  lines: Line[];
  zoom?: { at: number; until: number; scale: number; origin: string };
};

const CH = manifest.chapters as Chapter[];
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A caption that emphasises the word currently being spoken. */
function Caption({ lines, t }: { lines: Line[]; t: number }) {
  const LEAD = 0.28, FADE = 0.22;
  const active = lines.find((l) => t >= l.at - LEAD && t <= l.at + l.secs + 0.12);
  if (!active) return null;
  const from = active.at - LEAD, to = active.at + active.secs + 0.12;
  const alpha =
    Math.min(interpolate(t, [from, from + FADE], [0, 1], { extrapolateRight: "clamp" }),
             interpolate(t, [to - FADE, to], [1, 0], { extrapolateLeft: "clamp" }));
  const rise = interpolate(t, [from, from + FADE], [10, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute", left: FRAME.x, right: FRAME.x, bottom: 40,
        fontFamily: T.display, fontSize: 30, lineHeight: 1.34, fontWeight: 500,
        letterSpacing: "-0.016em", maxWidth: "52ch",
        opacity: alpha, transform: `translateY(${rise}px)`,
      }}
    >
      {active.words.map((w, i) => {
        // The word being spoken sits at full white; the rest of the line is a
        // step behind it. Emphasis by weight of colour, never by movement —
        // a caption that jumps competes with the product.
        const on = t >= active.at + w.start - 0.04 && t <= active.at + w.end + 0.1;
        const said = t > active.at + w.end;
        return (
          <span key={i} style={{ color: on ? T.spoken : said ? T.ink : T.dim, transition: "none" }}>
            {w.text}{i < active.words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}

function Pips({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const grow = ease(interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", right: FRAME.x, bottom: 58, display: "flex", gap: 7, alignItems: "center" }}>
      {CH.filter((c) => !c.card).map((c, i) => {
        const on = i === index;
        return (
          <span key={c.id} style={{
            width: on ? 16 + 28 * grow : 16, height: 3, borderRadius: 3,
            background: on ? T.violet : i < index ? "#5a5648" : "#302e28",
          }} />
        );
      })}
    </div>
  );
}

function Window({ chapter, index }: { chapter: Chapter; index: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const enter = ease(interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }));

  // One restrained push-in per chapter that asks for it, eased in and released.
  const z = chapter.zoom;
  const scale = !z ? 1 : interpolate(
    t, [z.at, z.at + 1.2, z.until - 1.0, z.until],
    [1, z.scale, z.scale, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: T.ground, fontFamily: T.display, color: T.ink }}>
      <div style={{ position: "absolute", left: FRAME.x, top: 22, display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontFamily: T.figure, fontSize: 13, fontWeight: 600, letterSpacing: "0.34em", textIndent: "0.34em" }}>
          SETOFF
        </span>
        <span style={{ width: 1, height: 22, background: T.rule }} />
        <span style={{
          fontSize: 22, letterSpacing: "-0.01em",
          opacity: enter, transform: `translateY(${(1 - enter) * 7}px)`,
        }}>
          {chapter.title}
        </span>
      </div>
      <div style={{
        position: "absolute", right: FRAME.x, top: 28, fontFamily: T.figure,
        fontSize: 11, letterSpacing: "0.2em", color: T.dim,
      }}>
        ARC MAINNET · 5042
      </div>

      <div style={{
        position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.bar + FRAME.h,
        borderRadius: 14, overflow: "hidden",
        boxShadow: `0 0 0 1px ${T.rule}, 0 40px 90px -40px #000`,
      }}>
        <div style={{
          height: FRAME.bar, background: "#1d1c17", display: "flex", alignItems: "center",
          gap: 7, paddingLeft: 16,
        }}>
          {[0, 1, 2].map((k) => (
            <span key={k} style={{ width: 9, height: 9, borderRadius: 9, background: "#6f6a5c" }} />
          ))}
          <span style={{ marginLeft: 18, fontFamily: T.figure, fontSize: 11, color: T.dim }}>{chapter.url}</span>
        </div>
        <div style={{ height: FRAME.h, overflow: "hidden" }}>
          <OffthreadVideo
            muted
            src={staticFile(`${chapter.id}.mp4`)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: `scale(${scale})`, transformOrigin: z?.origin ?? "50% 50%",
            }}
          />
        </div>
      </div>

      <Caption lines={chapter.lines} t={t} />
      <Pips index={index} />
    </AbsoluteFill>
  );
}

/** The title card fills the frame: it is the product's own plate, not a window. */
function Card({ chapter }: { chapter: Chapter }) {
  return (
    <AbsoluteFill>
      <OffthreadVideo muted src={staticFile(`${chapter.id}.mp4`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
}

function Film() {
  let at = 0, page = -1;
  return (
    <AbsoluteFill style={{ background: T.ground }}>
      {CH.map((c) => {
        const from = at;
        at += Math.round(c.seconds * FPS);
        if (!c.card) page += 1;
        const index = page;
        return (
          <Sequence key={c.id} from={from} durationInFrames={Math.round(c.seconds * FPS)}>
            {c.card ? <Card chapter={c} /> : <Window chapter={c} index={index} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition
    id="SetoffDemo"
    component={Film}
    durationInFrames={Math.round(CH.reduce((n, c) => n + c.seconds, 0) * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
));
