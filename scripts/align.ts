/**
 * Word-level caption timing, from ElevenLabs forced alignment.
 *
 * Each sentence was synthesised as its own file, so each is aligned against its
 * own text and the word times come back relative to that file. Added to the
 * sentence's own start within the segment, that gives every word an exact
 * position — which is what lets a caption emphasise the word being spoken
 * rather than appearing as a block.
 *
 * Cached by the sentence text: alignment costs an API call per sentence and the
 * script barely changes between builds.
 *
 *   npm run film:align
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { config as dotenv } from "dotenv";
import { NARRATION, spokenLine } from "./narration.js";
import { sentences } from "./captions.js";

dotenv({ path: new URL("../.env", import.meta.url).pathname, quiet: true });
const KEY = process.env.ELEVENLABS_API_KEY;

export type Word = { text: string; start: number; end: number };
export type AlignedLine = { text: string; at: number; secs: number; words: Word[] };

async function align(mp3: string, text: string): Promise<Word[]> {
  const body = new FormData();
  body.append("file", new Blob([readFileSync(mp3)], { type: "audio/mpeg" }), "line.mp3");
  body.append("text", text);
  const res = await fetch("https://api.elevenlabs.io/v1/forced-alignment", {
    method: "POST",
    headers: { "xi-api-key": KEY! },
    body,
  });
  if (!res.ok) throw new Error(`forced-alignment ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = (await res.json()) as { words?: Word[] };
  if (!Array.isArray(j.words) || !j.words.length) throw new Error("no words returned");
  // Whitespace comes back as its own token; captions only care about words.
  return j.words.filter((w) => w.text.trim().length > 0);
}

async function main() {
  if (!KEY) throw new Error("ELEVENLABS_API_KEY is missing");
  const timing = JSON.parse(readFileSync("film/timing.json", "utf8")) as
    Record<string, { text: string; at: number; secs: number }[]>;
  mkdirSync("film/align", { recursive: true });

  const out: Record<string, AlignedLine[]> = {};
  let called = 0, cached = 0;
  for (const b of NARRATION) {
    const lines = timing[b.segment] ?? [];
    const spoken = sentences(b.text).map(spokenLine);
    out[b.segment] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const mp3 = `film/voice/${b.segment}-${String(i).padStart(2, "0")}.mp3`;
      const cache = `film/align/${b.segment}-${String(i).padStart(2, "0")}.json`;
      // The spoken text is what was synthesised, so it is what must be aligned;
      // the caption text can differ (digits versus words) and would not match.
      const text = spoken[i] ?? line.text;
      let words: Word[];
      if (existsSync(cache) && JSON.parse(readFileSync(cache, "utf8")).text === text) {
        words = JSON.parse(readFileSync(cache, "utf8")).words; cached++;
      } else {
        words = await align(mp3, text);
        writeFileSync(cache, JSON.stringify({ text, words }, null, 2));
        called++;
      }
      out[b.segment]!.push({ ...line, words });
    }
  }
  writeFileSync("film/align.json", JSON.stringify(out, null, 2));
  const total = Object.values(out).reduce((n, ls) => n + ls.reduce((m, l) => m + l.words.length, 0), 0);
  console.log(`  ${total} words aligned across ${Object.values(out).reduce((n, l) => n + l.length, 0)} sentences`);
  console.log(`  ${called} aligned now, ${cached} from cache  ->  film/align.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
