#!/usr/bin/env node
// Verify DESIGN.md against what actually shipped in the stylesheet.
//
// DESIGN.md is authority of intent. globals.css is authority of truth.
// When they disagree, the design system has drifted and nobody can see it —
// a hardcoded value and a token render identically until someone changes the token.
//
//   node scripts/check-design.mjs            report
//   node scripts/check-design.mjs --strict   exit 1 on any drift (use in CI)

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STRICT = process.argv.includes("--strict");

const CSS_CANDIDATES = [
  "apps/web/app/globals.css", "apps/web/src/app/globals.css",
  "app/globals.css", "src/app/globals.css",
  "web/app/globals.css", "web/src/app/globals.css",
];
const CODE_DIRS = ["app", "components", "src", "apps/web/app", "apps/web/components", "web/src"];

const isPlaceholder = (s) => /[<>]/.test(s);
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };

if (!existsSync("DESIGN.md")) die("no DESIGN.md here — run from the project root");
const design = readFileSync("DESIGN.md", "utf8");

const cssPath = CSS_CANDIDATES.find(existsSync);
if (!cssPath) die(`no stylesheet found. Looked in:\n   ${CSS_CANDIDATES.join("\n   ")}`);
const css = readFileSync(cssPath, "utf8");

// --- tokens -----------------------------------------------------------------
const declared = new Set(
  [...design.matchAll(/--[a-z0-9][a-z0-9-]*/gi)].map((m) => m[0]).filter((t) => !isPlaceholder(t))
);
const defined = new Set([...css.matchAll(/^\s*(--[a-z0-9][a-z0-9-]*)\s*:/gim)].map((m) => m[1]));

const missing = [...declared].filter((t) => !defined.has(t));
const undocumented = [...defined].filter((t) => !declared.has(t));

// --- colours ----------------------------------------------------------------
const hexes = (s) => new Set([...s.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()));
const designHex = hexes(design);
const cssHex = hexes(css);
const absentHex = [...designHex].filter((h) => !cssHex.has(h));

// --- raw values in components ----------------------------------------------
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|css)$/.test(e) && p !== cssPath) out.push(p);
  }
  return out;
};
const raw = [];
for (const f of CODE_DIRS.flatMap((d) => walk(d))) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/#[0-9a-f]{6}\b/gi)) {
    const line = src.slice(0, m.index).split("\n").length;
    raw.push(`${f}:${line}  ${m[0]}`);
  }
}

// --- report -----------------------------------------------------------------
const section = (title, items, note) => {
  if (!items.length) return 0;
  console.log(`\n${title}  (${items.length})`);
  if (note) console.log(`  ${note}`);
  items.slice(0, 15).forEach((i) => console.log(`    ${i}`));
  if (items.length > 15) console.log(`    … ${items.length - 15} more`);
  return items.length;
};

console.log(`DESIGN.md  ↔  ${cssPath}`);
console.log(`  ${declared.size} tokens declared · ${defined.size} defined`);

let n = 0;
n += section("Declared in DESIGN.md, absent from the stylesheet:", missing,
  "The document describes a system that was never built.");
n += section("Defined in the stylesheet, undocumented in DESIGN.md:", undocumented,
  "The build has decisions the design record does not know about.");
n += section("Colours named in DESIGN.md that appear nowhere in the stylesheet:", absentHex,
  "This is the drift that makes a beautiful design document a work of fiction.");
n += section("Raw hex values outside the stylesheet:", raw,
  "These render identically to tokens until someone changes a token.");

if (n === 0) {
  console.log("\n✓ DESIGN.md and the stylesheet agree.");
  process.exit(0);
}
console.log(`\n${n} drift${n === 1 ? "" : "s"}. Fix the build or fix the record — not neither.`);
process.exit(STRICT ? 1 : 0);
