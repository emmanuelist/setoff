/**
 * Generates the narration: one take per caption line, and film/timing.json with
 * each take's length.
 *
 * The takes are placed one by one in the render, against the picture: most
 * follow each other, some wait for a measured moment on screen. An earlier
 * version padded whole segments into one track, which could only ever be as
 * right as its guess at the picture.
 *
 * ElevenLabs when ELEVENLABS_API_KEY is set (their free tier covers this
 * script comfortably). macOS `say` otherwise, which is dated but proves the
 * pipeline without a key.
 *
 *   ELEVENLABS_API_KEY=... npm run voice
 *   npm run voice                       # local fallback
 *
 * Pick a voice:  curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/voices
 * then set ELEVENLABS_VOICE_ID.
 */
import { NARRATION, spokenLine } from "./narration.js";
import { sentences } from "./captions.js";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { config as dotenv } from "dotenv";

dotenv({ path: new URL("../.env", import.meta.url).pathname, quiet: true });

const KEY = process.env.ELEVENLABS_API_KEY;
// "George" — warm, authoritative narration. Override with ELEVENLABS_VOICE_ID.
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_v3";
/** v3 takes an inline direction. Conversational, because a technical claim read
 *  as an advertisement is the fastest way to lose a reviewer's trust. */
const DIRECTION = process.env.ELEVENLABS_DIRECTION ?? "[conversational]";
const OUT = "film/voice";

async function eleven(text: string, file: string) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      text: MODEL === "eleven_v3" ? `${DIRECTION} ${text}` : text,
      model_id: MODEL,
      // v3 reads a direction tag rather than a style number; 0.5 is its natural
      // setting and the one the reference pipeline landed on.
      voice_settings:
        MODEL === "eleven_v3"
          ? { stability: 0.5 }
          : { stability: 0.45, similarity_boost: 0.75, style: 0.12, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 180)}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

function local(text: string, file: string) {
  const aiff = file.replace(/\.mp3$/, ".aiff");
  execFileSync("say", ["-v", process.env.SAY_VOICE ?? "Daniel", "-r", "168", "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-c:a", "libmp3lame", "-b:a", "192k", file]);
}

const dur = (f: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(KEY ? "Voice: ElevenLabs" : "Voice: macOS say (no ELEVENLABS_API_KEY set)");

  // Each line's take, in order, and how long it runs. Lines follow each other here; the render
  // moves the anchored ones.
  const timing: Record<string, { text: string; at: number; secs: number }[]> = {};

  for (const b of NARRATION) {
    // Captions are the source; the voice reads the derived spoken form (SPOKEN_AS).
    const lines = sentences(b.text);
    const spoken = lines.map(spokenLine);
    timing[b.segment] = [];
    let t = 0;
    for (let i = 0; i < lines.length; i++) {
      const pf = `${OUT}/${b.segment}-${String(i).padStart(2, "0")}.mp3`;
      // Cache by the spoken text: the free tier is ~10k characters a month, and a take that
      // has not changed should never be billed twice.
      const stamp = `${pf}.txt`;
      const unchanged = existsSync(pf) && existsSync(stamp) && readFileSync(stamp, "utf8") === spoken[i]!;
      if (!unchanged) {
        if (KEY) await eleven(spoken[i]!, pf); else local(spoken[i]!, pf);
        writeFileSync(stamp, spoken[i]!);
        console.log(`    synthesised ${b.segment}[${i}]`);
      }
      const sd = dur(pf);
      timing[b.segment]!.push({ text: lines[i]!, at: +t.toFixed(3), secs: +sd.toFixed(3) });
      t += sd;
    }
    console.log(`  ${b.segment.padEnd(14)} ${lines.length ? `${lines.length} lines, ${t.toFixed(1)}s spoken` : "no voice"}`);
  }

  writeFileSync("film/timing.json", JSON.stringify(timing, null, 2));
  console.log("\n  film/timing.json    each take, in order, with its length");
}

main().catch((e) => { console.error("\nvoice failed:", e.message ?? e); process.exit(1); });
