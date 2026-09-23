/**
 * Title cards, in Setoff's own type and palette.
 *
 * Filmed as ordinary segments so they inherit trimming, the manifest and the
 * mix. Built in HTML rather than as an ffmpeg overlay so they carry the
 * product's typography — and, here, its room: a plate on a wall, with the
 * contract band the footer already prints.
 *
 * The palette is copied from apps/web/app/globals.css. If the room changes,
 * change it here too; check-design does not police this file.
 */
export type Card = {
  name: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  secs: number;
  /** Draw the contract band above the title. */
  mark?: boolean;
};

export const THEME = {
  wall: "#d6d9d9",
  plate: "#eceeee",
  plateEdge: "#c3c7c7",
  enamel: "#fbfcfb",
  ink: "#1d1b18",
  graphite: "#595b56",
  rule: "#c7cac2",
  endorse: "#4a3a92",
  display: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  figure: '"Martian Mono", ui-monospace, Menlo, monospace',
  fonts:
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400;62..125,600;62..125,700&family=Martian+Mono:wdth,wght@75..112,400;75..112,600&display=swap",
};

export function cardHTML(c: Card): string {
  const t = THEME;
  // The band the app's own footer prints: |: SETOFF :|
  const mark = c.mark
    ? `<div class="band" aria-hidden="true">
         <span class="tick">|:</span><span class="word">SETOFF</span><span class="tick">:|</span>
       </div>`
    : "";
  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fonts}" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;overflow:hidden;background:${t.wall}}
  body{display:grid;place-items:center;font-family:${t.display};color:${t.ink}}

  /* One plate on the wall, lit the way every plate in the app is lit. */
  .plate{
    position:relative;width:min(78vw,980px);padding:72px 64px;border-radius:22px;text-align:center;
    background:linear-gradient(180deg,#f3f5f5,${t.plate} 42%,#e6e9e9);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.9),
      inset 0 -1px 0 rgba(29,27,24,.06),
      0 0 0 1px ${t.plateEdge},
      0 26px 50px -28px rgba(29,27,24,.55);
    opacity:0;animation:rise .9s cubic-bezier(.16,1,.3,1) .05s forwards;
  }
  .band{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:30px;
    opacity:0;animation:up .7s cubic-bezier(.16,1,.3,1) .35s forwards}
  .band .tick,.band .word{font-family:${t.figure};font-weight:600;color:${t.ink}}
  .band .tick{font-size:19px;opacity:.75}
  .band .word{font-size:15px;letter-spacing:.34em;text-indent:.34em}

  .k{font-family:${t.display};font-weight:700;font-variation-settings:"wdth" 125;
     font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${t.graphite};
     text-shadow:0 1px 0 rgba(255,255,255,.9);
     opacity:0;animation:up .7s cubic-bezier(.16,1,.3,1) .5s forwards}
  h1{font-weight:700;font-variation-settings:"wdth" 108;letter-spacing:-.028em;line-height:1.0;
     font-size:clamp(40px,6.4vw,86px);margin:16px 0 0;opacity:0;
     animation:up .9s cubic-bezier(.16,1,.3,1) .62s forwards}
  p{font-size:18px;line-height:1.5;color:${t.graphite};margin:24px auto 0;max-width:40ch;opacity:0;
    animation:up .85s cubic-bezier(.16,1,.3,1) .88s forwards}

  /* The perforation rule: the mark the app punches through a cleared slip. */
  .r{height:0;margin:38px auto 0;width:0;border-top:2px dashed ${t.rule};
     animation:grow 1.4s cubic-bezier(.16,1,.3,1) 1.05s forwards}
  @keyframes rise{from{opacity:0;transform:translateY(20px) scale(.994)}to{opacity:1;transform:none}}
  @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes grow{to{width:260px}}
</style>
<div class="plate">
  ${mark}
  ${c.kicker ? `<div class="k">${c.kicker}</div>` : ""}
  <h1>${c.title}</h1>
  ${c.subtitle ? `<p>${c.subtitle}</p>` : ""}
  <div class="r"></div>
</div>`;
}

export const CARDS: Card[] = [
  {
    name: "00-open",
    mark: true,
    kicker: "Arc Microgrants · Circle",
    title: "Setoff",
    subtitle: "Half-settled is the worst state money can be in.",
    secs: 17,
  },
];
