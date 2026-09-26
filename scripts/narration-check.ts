/**
 * Guards the script before any money is spent on voice.
 *
 *   - every caption word maps back to itself through speak(), word for word
 *   - no decimal figure reaches the voice as digits ("four point eight seven one eight")
 *   - every anchor names a sentence that exists
 *   - which spoken lines already have a take, and which would be billed
 *
 *   npx tsx scripts/narration-check.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { NARRATION, speak, spokenLine } from "./narration.js";
import { sentences } from "./captions.js";

let bad = 0, billed = 0, chars = 0;
const fail = (msg: string) => { bad++; console.log(`  x ${msg}`); };

for (const b of NARRATION) {
  const lines = sentences(b.text);
  for (const [k, cue] of Object.entries(b.anchors ?? {})) {
    const line = lines[Number(k)];
    if (!line) { fail(`${b.segment}: anchor on sentence ${k}, which does not exist`); continue; }
    if ((cue.word ?? 0) >= speak(line).length) fail(`${b.segment}[${k}]: anchor on word ${cue.word}, past the end of the line`);
  }
  lines.forEach((line, i) => {
    const groups = speak(line);
    const rejoined = groups.flatMap((g) => g.words).join(" ");
    if (rejoined !== line.split(" ").filter(Boolean).join(" ")) fail(`${b.segment}[${i}] caption does not survive speak(): "${line}"`);
    const spoken = spokenLine(line);
    const digits = spoken.match(/\d+\.\d+/g);
    if (digits) fail(`${b.segment}[${i}] the voice would read ${digits.join(", ")} digit by digit — add it to SPOKEN_AS`);

    const stamp = `film/voice/${b.segment}-${String(i).padStart(2, "0")}.mp3.txt`;
    const cached = existsSync(stamp) && readFileSync(stamp, "utf8") === spoken;
    if (!cached) { billed++; chars += spoken.length; }
    const cue = b.anchors?.[i];
    const anchor = cue ? `  [${speak(line)[cue.word ?? 0]!.words.join(" ")} on ${cue.on}${cue.offset ? ` ${cue.offset > 0 ? "+" : ""}${cue.offset}s` : ""}]` : "";
    console.log(`  ${cached ? "cached" : "NEW   "} ${b.segment}[${i}]${anchor}  ${line}`);
    if (spoken !== line) console.log(`         spoken as: ${spoken}`);
  });
}

console.log(`\n  ${billed} line${billed === 1 ? "" : "s"} to synthesise, ${chars} characters`);
if (bad) { console.log(`  ${bad} problem${bad === 1 ? "" : "s"}`); process.exit(1); }
console.log("  script ok");
