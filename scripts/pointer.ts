/**
 * A synthetic pointer, with real interaction.
 *
 * Playwright records no cursor, so a scripted capture reads as a screenshot
 * that happens to move. A pointer gives the shot agency: the eye follows it and
 * it lands on whatever the narration is describing.
 *
 * There is no zoom. Two cuts pushed in on the page; the second cropped the one
 * figure the shot existed to show. The page is legible at the size it is shown,
 * so the camera stays still and the cursor carries the attention.
 *
 * Per move:
 *   pos     where the tip lands relative to the target. "center" suits a
 *           button; "below" and "after" park the tip beside a figure or a line
 *           of text so the arrow never covers what it points at
 *   label   a caption pinned to the cursor
 *   click   Playwright fires the real action once the cursor has ARRIVED, so
 *           the click is visibly caused by the cursor rather than teleporting
 *   hide    fade the cursor out, so a moment can play without it
 */
export type Move = {
  /** Absolute seconds into the segment. Ignored when `line` is set. */
  at?: number;
  /**
   * Anchor to a SPOKEN SENTENCE instead of a clock time: the move fires when
   * sentence `line` (0-indexed) begins, plus `lead` seconds.
   *
   * Absolute times were written against a planned narration and silently went
   * wrong the moment the voice changed pace. Anchoring to the measured timing
   * removes the whole class of drift.
   */
  line?: number;
  /** Offset from the sentence start, in seconds. Negative arrives early. */
  lead?: number;
  sel: string;
  pos?: "center" | "below" | "after";
  label?: string;
  /** Fire a real click on `sel` once the cursor arrives. */
  click?: boolean;
  /** Type into `sel` after arriving. Implies click. */
  type?: string;
  /** Fade the cursor out instead of moving it. `sel` is ignored. */
  hide?: boolean;
  /**
   * A condition, as page JavaScript, that must also hold before the move fires.
   * For moves that follow the picture rather than the voice: the refusal run
   * takes as long as the chain takes.
   */
  until?: string;
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

/** Per-project. Selectors are CSS in the page being filmed, checked against
 *  the deployed app at 1600x900. Every figure the narration names stays
 *  uncovered: the cursor parks beside it, never on it. */
export const MOVES: Record<string, Move[]> = {
  // The problem is told over the product's own claim. No cursor: the headline
  // is the thing to read.
  "01-problem": [],

  "02-clearing": [
    // "live on Arc mainnet": the block counter is the chain, ticking.
    { line: 1, lead: 0.5, sel: "header [aria-live]", pos: "below" },
    // "5 payments and 5 conversions": the five conversions, each a rate.
    { line: 2, lead: 0.7, sel: "#statement ul > li:last-child", pos: "after" },
    // "one Chainlink read per currency ... a single fixing": the fixing, on chain. The link fills
    // its grid column, so the cursor parks after its arrow rather than after the link.
    { line: 3, lead: 0.7, sel: "#trail ol > li:nth-child(2) a svg", pos: "after" },
    // Arrive on Replay as the gross is named, press it, then get out of the way.
    { line: 5, lead: -1.05, sel: "#replay", click: true },
    { line: 5, lead: 0.5, sel: "#replay", hide: true },
  ],

  "03-reversal": [
    // "1 of 2 net debtors funded": the one that did not.
    { line: 0, lead: 2.0, sel: "#beams > :nth-child(5)", pos: "after" },
    // "anyone can void the cycle": the void, as a transaction.
    { line: 1, lead: 0.4, sel: "#trail ol > li:last-child a svg", pos: "after" },
    // "The deposit came back ... every debt reopened, still endorsed."
    { line: 2, lead: 0.6, sel: "#next-act p", pos: "below" },
    { line: 3, lead: 0.0, sel: "#next-act p", hide: true },
  ],

  "04-refusals": [
    { line: 0, lead: 0.3, sel: "#run-attempts", click: true },
    // The count climbing, then the contract's own words on the tape.
    { line: 1, lead: 0.4, sel: "#run-count", pos: "below" },
    { line: 3, lead: -0.9, sel: "#tape h2", pos: "after" },
    // Back to the count once the tape has been seen and the run has finished, which is when the
    // payoff line is spoken.
    { line: 3, lead: 1.2, sel: "#run-count", pos: "below",
      until: "(document.querySelector('#run-attempts')?.textContent ?? '').includes('Run every attempt') && Number(document.querySelector('#run-count')?.dataset.ran) > 0" },
  ],

  "05-close": [
    // "every payout is a withdrawal": the page says so, in the next act.
    { line: 0, lead: 0.8, sel: "#next-act p", pos: "below" },
    // "The four parties are my own wallets": the four addresses.
    { line: 1, lead: 0.4, sel: "#beams > :nth-child(2) > span", pos: "after" },
    // The claim is spoken over the result, clean.
    { line: 2, lead: 0.0, sel: "#beams", hide: true },
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
    /* The svg's tip sits at (3,1); the element is offset by that much so the
       coordinates the moves compute are where the tip actually lands. */
    #__ptr{position:fixed;left:0;top:0;z-index:100000;pointer-events:none;opacity:0;
      margin:-1px 0 0 -3px;
      transition:opacity .45s ease, left 1.05s cubic-bezier(.33,.02,.2,1),
                 top 1.05s cubic-bezier(.33,.02,.2,1);}
    #__ptr.on{opacity:1;}
    #__ptr svg{display:block;filter:drop-shadow(0 2px 3px rgba(29,27,24,.28));}
    /* Violet is the app's signing colour, and only the signing colour: the
       cursor is the one thing on screen performing an act, so it wears it. */
    #__ptr .__ptr-l{position:absolute;left:22px;top:12px;white-space:nowrap;
      font-family:var(--figure),ui-monospace,Menlo,monospace;font-size:11px;
      letter-spacing:-.01em;color:#2e2465;background:rgba(252,253,252,.96);
      border:1px solid rgba(74,58,146,.38);padding:3px 8px;border-radius:2px;
      box-shadow:0 2px 10px -4px rgba(29,27,24,.5);
      opacity:0;transition:opacity .3s ease;}
    #__ptr.labelled .__ptr-l{opacity:1;}
    #__ptr::after{content:"";position:absolute;left:3px;top:1px;width:26px;height:26px;
      margin:-13px 0 0 -13px;border:1.5px solid rgba(74,58,146,.85);border-radius:50%;
      opacity:0;transform:scale(.35);}
    #__ptr.ping::after{animation:ptrPing .62s cubic-bezier(.2,.7,.2,1);}
    @keyframes ptrPing{0%{opacity:.95;transform:scale(.35)}100%{opacity:0;transform:scale(1.9)}}
    /* A press ring, so a real click reads as a click. */
    #__ptr.press::before{content:"";position:absolute;left:3px;top:1px;width:16px;height:16px;
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

  // Where the tip lands. "after" and "below" park it just clear of the target,
  // so a figure being pointed at is never under the arrow.
  const spot = (r, pos) => {
    if (pos === 'after') return [r.right + 10, r.top + r.height / 2 - 2];
    if (pos === 'below') return [r.left + Math.min(r.width * 0.5, 90), r.bottom + 7];
    return [r.left + Math.min(r.width * 0.5, 90), r.top + r.height / 2];
  };

  const go = m => {
    if (m.hide) { p.classList.remove('on', 'labelled'); return; }
    const el = document.querySelector(m.sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const [x, y] = spot(r, m.pos);
    // Arriving from nowhere: appear at the target rather than flying in from the corner.
    if (!p.classList.contains('on')) {
      p.style.transition = 'opacity .45s ease';
      p.style.left = Math.round(x + 26) + 'px';
      p.style.top = Math.round(y + 18) + 'px';
      void p.offsetWidth;
      p.style.transition = '';
    }
    p.style.left = Math.round(x) + 'px';
    p.style.top  = Math.round(y) + 'px';
    p.classList.add('on');
    lab.textContent = m.label || '';
    p.classList.toggle('labelled', !!m.label);
    p.classList.remove('ping');
    if (m.click) setTimeout(() => p.classList.add('ping'), 1050);
  };

  moves.forEach(m => setTimeout(() => {
    if (!m.until) return go(m);
    const t = setInterval(() => {
      let ok = false;
      try { ok = !!(0, eval)(m.until); } catch (e) {}
      if (ok) { clearInterval(t); go(m); }
    }, 50);
  }, m.at * 1000));
})(__MOVES__);
`;
