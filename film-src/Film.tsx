import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Freeze,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from "remotion";
import manifest from "./manifest.json";

/**
 * The film. Footage of the live app, in a window, with the surround drawn around it, never
 * over it. Every frame number here comes from the layout scripts/render.ts computed: chapter
 * cuts on the score's beats, lines on the voice's own timing, the net landing on a downbeat.
 * This file only draws.
 *
 * Nothing zooms. The page is legible at the size it is shown, and a push-in once cropped the
 * one figure the shot existed to show.
 */

const W = 1920, H = 1080;
const FRAME = { x: 200, y: 48, w: 1520, bar: 36, h: 855 };
const CAPTION_TOP = FRAME.y + FRAME.bar + FRAME.h + 19;

const T = {
  ground: "#14130f",
  ink: "#f4f3ef",
  dim: "#8e8d85",
  rule: "#33312a",
  violet: "#8f7be0",
  // The room, for the cards: the app's own enamel plate on the film's ground.
  plateHi: "#f3f5f5", plate: "#eceeee", plateLo: "#e6e9e9", plateEdge: "#c3c7c7",
  plateInk: "#1d1b18", graphite: "#595b56", perf: "#c7cac2",
  display: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  figure: '"Martian Mono", ui-monospace, Menlo, monospace',
};

type Chapter = { id: string; kind: string; from: number; dur: number; pre: number; title: string; url: string; index: number };
type Group = { text: string; start: number; end: number };
type Line = { chapter: string; show: number[]; groups: Group[]; br?: number };

const M = manifest as unknown as {
  total: number; xf: number; beat: number;
  chapters: Chapter[]; lines: Line[]; events: Record<string, number>;
};
const XF = M.xf;
const SHOTS = M.chapters.filter((c) => c.kind === "shot");
const OPEN = M.chapters[0]!, END = M.chapters[M.chapters.length - 1]!;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 over [a, b], eased. */
const rise = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: out });

/** Opacity of something that dissolves in at `from` and out at `until` (each over XF frames). */
const dissolve = (f: number, from: number, until: number) =>
  Math.min(interpolate(f, [from, from + XF], [0, 1], clamp), interpolate(f, [until, until + XF], [1, 0], clamp));

// ── Fonts ─────────────────────────────────────────────────────────────────
// The app's faces, as local files; without them the headless browser falls back silently.
const FACES = `
@font-face{font-family:"Archivo";src:url(${staticFile("fonts/archivo.woff2")}) format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:block}
@font-face{font-family:"Martian Mono";src:url(${staticFile("fonts/martian-mono.woff2")}) format("woff2");font-weight:100 800;font-stretch:75% 112%;font-display:block}`;

function useFaces() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('500 40px "Archivo"'),
      document.fonts.load('700 120px "Archivo"'),
      document.fonts.load('500 16px "Martian Mono"'),
    ]).then(() => continueRender(handle), () => continueRender(handle));
  }, [handle]);
}

// ── Captions ──────────────────────────────────────────────────────────────
/**
 * The line being spoken, each word lit as it is said. Figures read from the chain are set in
 * the app's figure face, as they are on the page, so "0.2669 USDC" under the picture is visibly
 * the same number as the one in it.
 */
function Caption() {
  const f = useCurrentFrame();
  const line = M.lines.find((l) => f >= l.show[0]! && f < l.show[1]!);
  if (!line) return null;
  const [a, b] = line.show as [number, number];
  const alpha = Math.min(interpolate(f, [a, a + 5], [0, 1], clamp), interpolate(f, [b - 6, b], [1, 0], clamp));
  const lift = interpolate(f, [a, a + 7], [8, 0], { ...clamp, easing: out });
  return (
    <div style={{
      position: "absolute", left: FRAME.x, top: CAPTION_TOP, width: FRAME.w,
      fontFamily: T.display, fontSize: 40, lineHeight: 1.22, fontWeight: 500,
      letterSpacing: "-0.012em", color: T.ink, textWrap: "balance",
      opacity: alpha, transform: `translateY(${lift}px)`,
    }}>
      {line.groups.map((g, i) => {
        const lit = interpolate(f, [g.start - 2, g.start + 3], [0.32, 1], clamp);
        return (
          <React.Fragment key={i}>
            <span style={{ opacity: lit }}><Words text={g.text} /></span>
            {i === line.br ? <br /> : i < line.groups.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Only the digits take the figure face; a unit or a comma after them stays in the text face. */
const FIGURE: React.CSSProperties = { fontFamily: T.figure, fontSize: "0.86em", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" };
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => {
        const m = /^(\d[\d.,]*\d|\d)(\D*)$/.exec(w);
        return (
          <React.Fragment key={i}>
            {i ? " " : ""}
            {m ? <><span style={FIGURE}>{m[1]}</span>{m[2]}</> : w}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── The chrome around the shots ───────────────────────────────────────────
function Chrome() {
  const f = useCurrentFrame();
  const first = SHOTS[0]!, until = END.from;
  const on = dissolve(f, first.from, until);
  if (on <= 0) return null;
  const current = [...SHOTS].reverse().find((c) => f >= c.from) ?? first;

  return (
    <AbsoluteFill style={{ opacity: on }}>
      {/* The band the app's footer prints, then the chapter. */}
      <div style={{ position: "absolute", left: FRAME.x, top: 0, height: FRAME.y, display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontFamily: T.figure, fontSize: 13, fontWeight: 600, color: T.ink, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.6 }}>|:</span>
          <span style={{ letterSpacing: "0.34em", marginRight: "-0.34em" }}>SETOFF</span>
          <span style={{ opacity: 0.6 }}>:|</span>
        </span>
        <span style={{ width: 1, height: 18, background: T.rule }} />
        <span style={{ position: "relative", height: FRAME.y, width: 600 }}>
          {SHOTS.map((c) => {
            const o = dissolve(f, c.from, c.from + c.dur);
            if (o <= 0) return null;
            const y = interpolate(f, [c.from, c.from + XF + 4], [7, 0], { ...clamp, easing: out });
            return (
              <span key={c.id} style={{
                position: "absolute", left: 0, top: 0, height: FRAME.y, display: "flex", alignItems: "center",
                fontFamily: T.display, fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", color: T.ink,
                whiteSpace: "nowrap", opacity: o, transform: `translateY(${y}px)`,
              }}>{c.title}</span>
            );
          })}
        </span>
      </div>

      {/* Where the viewer is in the film. The current chapter fills as it plays. */}
      <div style={{ position: "absolute", right: FRAME.x, top: 0, height: FRAME.y, display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontFamily: T.figure, fontSize: 11, letterSpacing: "0.18em", color: T.dim }}>ARC MAINNET · 5042</span>
        <span style={{ display: "flex", gap: 6 }}>
          {SHOTS.map((c) => {
            const p = interpolate(f, [c.from, c.from + c.dur], [0, 1], clamp);
            const now = c.id === current.id;
            return (
              <span key={c.id} style={{ position: "relative", width: now ? 40 : 16, height: 3, borderRadius: 2, background: "#2d2b25", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, width: `${p * 100}%`, background: now ? T.violet : "#6b675a" }} />
              </span>
            );
          })}
        </span>
      </div>

      {/* The window. */}
      <div style={{
        position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.bar + FRAME.h,
        borderRadius: 14, overflow: "hidden", background: "#1d1c17",
        boxShadow: `0 0 0 1px ${T.rule}, 0 44px 90px -40px #000`,
      }}>
        <div style={{ height: FRAME.bar, display: "flex", alignItems: "center", gap: 7, paddingLeft: 16, position: "relative" }}>
          {[0, 1, 2].map((k) => <span key={k} style={{ width: 9, height: 9, borderRadius: 9, background: "#5d594d" }} />)}
          {SHOTS.map((c) => {
            const o = dissolve(f, c.from, c.from + c.dur);
            if (o <= 0) return null;
            return (
              <span key={c.id} style={{
                position: "absolute", left: 76, top: 0, height: FRAME.bar, display: "flex", alignItems: "center",
                fontFamily: T.figure, fontSize: 12, color: T.dim, opacity: o,
              }}>{c.url}</span>
            );
          })}
        </div>
        <div style={{ position: "relative", height: FRAME.h, background: "#d6d9d9" }}>
          {SHOTS.map((c) => <Shot key={c.id} c={c} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * One chapter's footage. `pre` frames of its first frame are held before it plays, which is how
 * its key moment was moved onto a beat. It runs XF frames past its end, under the next chapter's
 * dissolve.
 */
function Shot({ c }: { c: Chapter }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [c.from, c.from + XF], [0, 1], clamp);
  const src = staticFile(`${c.id}.mp4`);
  const fill = { width: "100%", height: "100%", objectFit: "fill" as const, display: "block" };
  return (
    <Sequence from={c.from} durationInFrames={c.dur + XF} layout="none">
      <AbsoluteFill style={{ opacity: o }}>
        {c.pre > 0 && (
          <Sequence durationInFrames={c.pre} layout="none">
            <AbsoluteFill><Freeze frame={0}><OffthreadVideo muted src={src} style={fill} /></Freeze></AbsoluteFill>
          </Sequence>
        )}
        <Sequence from={c.pre} layout="none">
          <AbsoluteFill><OffthreadVideo muted src={src} style={fill} /></AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </Sequence>
  );
}

// ── The cards ─────────────────────────────────────────────────────────────
/** The title lands on the second beat; the score hits there. */
const LAND = 31;

function Plate({ local, children }: { local: number; children: React.ReactNode }) {
  const p = rise(local, 0, 22);
  return (
    <div style={{
      width: 1040, padding: "76px 72px 64px", borderRadius: 24, textAlign: "center",
      background: `linear-gradient(180deg, ${T.plateHi}, ${T.plate} 42%, ${T.plateLo})`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(29,27,24,.06), 0 0 0 1px ${T.plateEdge}, 0 50px 100px -40px rgba(0,0,0,.85)`,
      opacity: p, transform: `translateY(${(1 - p) * 26}px)`,
    }}>
      {children}
    </div>
  );
}

function Up({ local, at, len = 14, dy = 14, children }: { local: number; at: number; len?: number; dy?: number; children: React.ReactNode }) {
  const p = rise(local, at, at + len);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)` }}>{children}</div>;
}

function Band() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: T.figure, fontWeight: 600, color: T.plateInk }}>
      <span style={{ fontSize: 22, opacity: 0.72 }}>|:</span>
      <span style={{ fontSize: 17, letterSpacing: "0.34em", marginRight: "-0.34em" }}>SETOFF</span>
      <span style={{ fontSize: 22, opacity: 0.72 }}>:|</span>
    </div>
  );
}

function Perforation({ local }: { local: number }) {
  const w = interpolate(local, [LAND, LAND + 40], [0, 300], { ...clamp, easing: out });
  return <div style={{ height: 0, width: w, margin: "40px auto 0", borderTop: `2px dashed ${T.perf}` }} />;
}

function Title({ local }: { local: number }) {
  // Settles exactly on LAND: the score's first hit is this frame.
  const p = interpolate(local, [LAND - 16, LAND], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.9, 0.25, 1) });
  return (
    <div style={{
      fontFamily: T.display, fontWeight: 700, fontStretch: "108%", fontSize: 132, lineHeight: 1,
      letterSpacing: "-0.03em", color: T.plateInk, marginTop: 18,
      opacity: p, transform: `translateY(${(1 - p) * 20}px)`,
    }}>Setoff</div>
  );
}

const kicker: React.CSSProperties = {
  fontFamily: T.display, fontWeight: 700, fontStretch: "125%", fontSize: 13, letterSpacing: "0.22em",
  textTransform: "uppercase", color: T.graphite, marginTop: 34,
};

function OpenCard() {
  const f = useCurrentFrame();
  const local = f - OPEN.from;
  const o = Math.min(interpolate(f, [OPEN.from, OPEN.from + 8], [0, 1], clamp), interpolate(f, [OPEN.from + OPEN.dur, OPEN.from + OPEN.dur + XF], [1, 0], clamp));
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
      <Plate local={local}>
        <Up local={local} at={6}><Band /></Up>
        <Up local={local} at={12}><div style={kicker}>Arc Microgrants · Circle</div></Up>
        <Title local={local} />
        <Perforation local={local} />
      </Plate>
    </AbsoluteFill>
  );
}

function EndCard() {
  const f = useCurrentFrame();
  const local = f - END.from;
  if (local < 0) return null;
  const o = Math.min(interpolate(local, [0, XF], [0, 1], clamp), interpolate(local, [END.dur - 26, END.dur - 1], [1, 0], clamp));
  const where: [string, string, string?][] = [
    ["Live", "setoff-omega.vercel.app"],
    ["Code", "github.com/emmanuelist/setoff"],
    ["Contract", "0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6", "Arc mainnet · Sourcify exact match"],
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
      <Plate local={local}>
        <Up local={local} at={6}><Band /></Up>
        <Title local={local} />
        <div style={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 18, rowGap: 14, marginTop: 42, justifyContent: "center", textAlign: "left" }}>
          {where.map(([k, v, note], i) => (
            <React.Fragment key={k}>
              <Up local={local} at={LAND + 10 + i * 9} dy={8}>
                <div style={{ fontFamily: T.display, fontWeight: 700, fontStretch: "125%", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: T.graphite, textAlign: "right", lineHeight: "26px" }}>{k}</div>
              </Up>
              <Up local={local} at={LAND + 10 + i * 9} dy={8}>
                <div style={{ fontFamily: T.figure, fontSize: 19, lineHeight: "26px", color: T.plateInk, letterSpacing: "-0.01em" }}>{v}</div>
                {note && <div style={{ fontFamily: T.display, fontSize: 15, color: T.graphite, marginTop: 2 }}>{note}</div>}
              </Up>
            </React.Fragment>
          ))}
        </div>
        <Perforation local={local} />
      </Plate>
    </AbsoluteFill>
  );
}

function Film() {
  useFaces();
  return (
    <AbsoluteFill style={{ background: T.ground }}>
      <style>{FACES}</style>
      <OpenCard />
      <Chrome />
      <Caption />
      <EndCard />
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition id="Setoff" component={Film} durationInFrames={M.total} fps={30} width={W} height={H} />
));
