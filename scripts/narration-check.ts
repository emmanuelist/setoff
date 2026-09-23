/** Captions and speech must split into the same sentences: timing maps by index. */
import { NARRATION } from "./narration.js";
import { sentences } from "./captions.js";

let bad = 0;
for (const b of NARRATION) {
  const t = sentences(b.text), s = sentences(b.say ?? b.text);
  if (t.length !== s.length) {
    bad++;
    console.log(`MISMATCH ${b.segment}  text ${t.length}  say ${s.length}`);
    t.forEach((x, i) => console.log(`   text[${i}] ${x.slice(0, 70)}`));
    s.forEach((x, i) => console.log(`   say [${i}] ${x.slice(0, 70)}`));
  } else {
    console.log(`ok  ${b.segment.padEnd(12)} ${t.length} sentences  ${b.secs}s`);
  }
}
console.log(bad ? `\n${bad} block(s) mismatched` : "\nall blocks aligned");
console.log("planned total", NARRATION.reduce((a, b) => a + b.secs, 0), "s");
if (bad) process.exit(1);
