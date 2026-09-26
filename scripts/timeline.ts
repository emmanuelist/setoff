/**
 * One film clock, shared by capture (film.ts) and render (render.ts). They disagreed once, over
 * a window size, and the product was drawn through its own bezel; so every number that both of
 * them use lives here and nowhere else.
 */
export const FPS = 30;

/**
 * One beat is 31 frames: 58.06 BPM, the house tempo of the reference score. Chapters are cut on
 * whole beats, so every dissolve starts where the music has a downbeat.
 */
export const BEAT_FRAMES = 31;
export const BEAT = BEAT_FRAMES / FPS;

/** The dissolve between chapters. */
export const XF_FRAMES = 15;
export const XF = XF_FRAMES / FPS;

/** Silence before a chapter's first line, longer than the dissolve, so no line starts on a cut. */
export const LEAD = 0.6;

/** The least breath after a chapter's last line before the next cut begins. */
export const TAIL_MIN = 1.1;

/**
 * The pause added between one take and the next. The takes carry almost no silence of their own
 * (about 0.1s in front, 0.04s behind), so laid end to end the sentences ran into each other.
 */
export const GAP = 0.32;

/**
 * Where each line starts, in chapter seconds, before any line is moved onto something that
 * happens on screen. The capture schedules the cursor on these times and the render places the
 * voice on them, so the two cannot disagree.
 */
export function planned(lines: { secs: number }[]): number[] {
  const out: number[] = [];
  let t = LEAD;
  for (const l of lines) { out.push(+t.toFixed(3)); t += l.secs + GAP; }
  return out;
}
