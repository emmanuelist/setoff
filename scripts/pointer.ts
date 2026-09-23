/**
 * A synthetic pointer, with optional zoom and real interaction.
 *
 * Playwright records no cursor, so a scripted capture reads as a screenshot
 * that happens to move. A pointer gives the shot agency: the eye follows it and
 * it lands on whatever the narration is describing.
 *
 * Three capabilities, each optional per move:
 *   label   a caption pinned to the cursor
 *   click   Playwright fires the real action once the cursor has ARRIVED, so
 *           the click is visibly caused by the cursor rather than teleporting
 *   zoom    the page scales toward the target and holds, then releases
 *
 * Zoom transforms `document.body`. The pointer and captions are therefore
 * appended to `documentElement`, outside the transform: a transformed ancestor
 * becomes the containing block for `position: fixed` descendants, which would
 * otherwise break both. The pointer reads getBoundingClientRect, which is
 * already post-transform, so it lands correctly at any scale.
 */
export type Move = {
  /** Absolute seconds into the segment. Ignored when `line` is set. */
  at?: number;
  /**
   * Anchor to a SPOKEN SENTENCE instead of a clock time: the move fires when
   * sentence `line` (0-indexed) begins, plus `lead` seconds.
   *
   * Absolute times were written against a planned narration and silently went
   * wrong the moment the voice changed pace — the "one agent, this many times"
   * label fired at 11.0s for a sentence actually spoken at 16.07s. Anchoring to
   * the measured timing removes the whole class of drift.
   */
  line?: number;
  /** Offset from the sentence start, in seconds. Negative arrives early. */
  lead?: number;
  sel: string;
  label?: string;
  /** Fire a real click on `sel` once the cursor arrives. */
  click?: boolean;
  /** Type into `sel` after arriving. Implies click. */
  type?: string;
  /** Scale to hold while parked here. 1 releases. ~1.5-1.8 reads well. */
  zoom?: number;
};

export const TRAVEL_MS = 1050;   // cursor travel; actions fire after this

/**
 * Resolve `line`-anchored moves against the measured narration, so the cursor
 * lands on whatever is being said regardless of how fast the narrator reads.
 */
export function resolveMoves(
  moves: Move[],
  lines: { at: number; secs: number }[] | undefined,
): (Move & { at: number })[] {
  return moves
    .map((m) => {
      if (m.line === undefined) return { ...m, at: m.at ?? 0 };
      const l = lines?.[m.line];
      // Fall back to any absolute time when a segment has no measured timing yet.
      if (!l) return { ...m, at: m.at ?? 0 };
      return { ...m, at: Math.max(0, l.at + (m.lead ?? 0)) };
    })
    .sort((a, b) => a.at - b.at);
}

/** Per-project. Selectors are CSS in the page being filmed.
 *  No zoom here: the product is dense and legible at 1440x900, and pushing in
 *  on every beat reads as nausea. The cursor carries the attention instead. */
export const MOVES: Record<string, Move[]> = {
  // Zoom is 1.06 and used twice in the whole film. An earlier cut pushed to 1.55
  // on six beats; the note back was that constant motion competes with the UI
  // rather than directing the eye. A nudge reads as attention; a lurch reads as
  // an effect.
  "01-problem": [
    { line: 0, lead: 1.4, sel: "#claim h1" },
    { line: 2, lead: 0.6, sel: "#fixings" },
  ],

  "02-clearing": [
    { line: 1, lead: 0.6, sel: "#statement .fig" },
    { line: 2, lead: 0.8, sel: "#fixings", label: "one read per currency" },
    // Press replay, then get out of the way and let it play.
    { line: 3, lead: 0.4, sel: "#replay", label: "replay the set-off", click: true },
    { line: 4, lead: 1.2, sel: "#beams", zoom: 1.06 },
    { line: 6, lead: 1.0, sel: "#statement .fig" },
  ],

  "03-reversal": [
    { line: 0, lead: 0.6, sel: "#statement .fig" },
    { line: 1, lead: 0.8, sel: "#beams", label: "one funded, one did not" },
    { line: 3, lead: 0.6, sel: "#statement" },
  ],

  "04-refusals": [
    { line: 0, lead: 0.3, sel: "#run-attempts", label: "run all of them", click: true },
    { line: 1, lead: 1.6, sel: "main .plate:nth-child(2)", zoom: 1.06 },
  ],

  "05-close": [
    { line: 2, lead: 0.8, sel: "#statement .fig" },
  ],
};



export const POINTER_RUNTIME = `
(moves => {
  const root = document.documentElement;
  const p = document.createElement('div');
  p.id = '__ptr';
  p.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 22 22">' +
    '<path d="M3 1 L3 17 L7.2 13.2 L10 19.5 L12.6 18.3 L9.9 12.2 L15.5 12.2 Z"' +
    ' fill="#fbfcfb" stroke="rgba(29,27,24,.92)" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
    '<span class="__ptr-l"></span>';
  const css = document.createElement('style');
  css.textContent = \`
    /* Zoom lives on body; the cursor lives outside it so a transformed
       ancestor cannot capture its fixed positioning. */
    body{transition:transform 1.15s cubic-bezier(.3,.02,.2,1);will-change:transform;}
    #__ptr{position:fixed;left:0;top:0;z-index:100000;pointer-events:none;opacity:0;
      transform:translate(-50%,-50%);
      transition:opacity .45s ease, left 1.05s cubic-bezier(.33,.02,.2,1),
                 top 1.05s cubic-bezier(.33,.02,.2,1);}
    #__ptr.on{opacity:1;}
    /* Violet is the app's signing colour, and only the signing colour: the
       cursor is the one thing on screen performing an act, so it wears it. */
    #__ptr .__ptr-l{position:absolute;left:22px;top:12px;white-space:nowrap;
      font-family:var(--figure),ui-monospace,Menlo,monospace;font-size:11px;
      letter-spacing:-.01em;color:#2e2465;background:rgba(252,253,252,.96);
      border:1px solid rgba(74,58,146,.38);padding:3px 8px;border-radius:2px;
      box-shadow:0 2px 10px -4px rgba(29,27,24,.5);
      opacity:0;transition:opacity .3s ease;}
    #__ptr.labelled .__ptr-l{opacity:1;}
    #__ptr::after{content:"";position:absolute;left:1px;top:1px;width:26px;height:26px;
      margin:-13px 0 0 -13px;border:1.5px solid rgba(74,58,146,.85);border-radius:50%;
      opacity:0;transform:scale(.35);}
    #__ptr.ping::after{animation:ptrPing .62s cubic-bezier(.2,.7,.2,1);}
    @keyframes ptrPing{0%{opacity:.95;transform:scale(.35)}100%{opacity:0;transform:scale(1.9)}}
    /* A press ring, so a real click reads as a click. */
    #__ptr.press::before{content:"";position:absolute;left:1px;top:1px;width:16px;height:16px;
      margin:-8px 0 0 -8px;border-radius:50%;background:rgba(74,58,146,.5);
      animation:ptrPress .34s ease-out;}
    @keyframes ptrPress{0%{opacity:.9;transform:scale(.2)}100%{opacity:0;transform:scale(1.5)}}
  \`;
  document.head.appendChild(css);
  root.appendChild(p);
  const lab = p.querySelector('.__ptr-l');

  window.__ptrPress = () => {
    p.classList.remove('press');
    void p.offsetWidth;
    p.classList.add('press');
  };

  moves.forEach(m => setTimeout(() => {
    const el = document.querySelector(m.sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    p.style.left = Math.round(r.left + Math.min(r.width * 0.5, 90)) + 'px';
    p.style.top  = Math.round(r.top + r.height / 2) + 'px';
    p.classList.add('on');
    lab.textContent = m.label || '';
    p.classList.toggle('labelled', !!m.label);
    p.classList.remove('ping');
    setTimeout(() => p.classList.add('ping'), 1050);

    // Zoom toward the target and hold. Origin is the element's centre in page
    // space, so the thing being discussed stays put while everything else grows.
    if (m.zoom !== undefined) {
      const b = document.body;
      if (m.zoom === 1) { b.style.transform = ''; b.style.transformOrigin = ''; }
      else {
        const cx = r.left + r.width / 2 + scrollX;
        const cy = r.top + r.height / 2 + scrollY;
        b.style.transformOrigin = cx + 'px ' + cy + 'px';
        b.style.transform = 'scale(' + m.zoom + ')';
      }
    }
  }, m.at * 1000));
})(__MOVES__);
`;
