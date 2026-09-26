/**
 * The narration script for Setoff.
 *
 * Captions are the source of truth and the voice is DERIVED from them. Each caption word is
 * spoken as written unless SPOKEN_AS says otherwise, because a caption is read and a voice is
 * heard: "1974" should print as 1974 and be said as a year, "0.2669 USDC" should print as the
 * exact figure the chain holds and be said as money. Because every caption word maps to a known
 * span of spoken words, each word can light on the voice's own timing rather than on a guess.
 *
 * An earlier version kept a hand-written `say` beside every `text`. The two drifted, and the film
 * printed "27 cents" where the chain holds 0.2669: the one figure the shot exists to show.
 *
 * Every figure is interpolated from film/facts.json, which is read straight off the contract by
 * `npm run film:facts`. The script therefore cannot claim a number the chain does not hold.
 *
 *   npx tsx scripts/narration-check.ts
 */
import { readFileSync } from "node:fs";

/**
 * A picture event, measured from the captured frames, that a line is placed against.
 *   replay    Replay is pressed and the figure starts rolling back up to the gross
 *   setoff    the gross is let go and the figure starts rolling down to the net
 *   landed    the net figure comes to rest
 *   complete  the refusal run has answered every attempt
 */
export type Anchor = "replay" | "setoff" | "landed" | "complete";

/** Place a line so that caption group `word` (see speak()) is spoken `offset` seconds after `on`. */
export type Cue = { on: Anchor; word?: number; offset?: number };

export type Block = {
  segment: string;
  /** Planned length, used only before a capture exists to measure. */
  secs: number;
  /** The captions. Sentences split on full stops; see captions.ts. */
  text: string;
  /**
   * Lines placed against something that happens on screen, by sentence index. A line never
   * starts before the previous one has finished; the lines after it keep their spacing.
   */
  anchors?: Record<number, Cue>;
};

type Cycle = {
  id: number; gross: string; net: string; setOff: string;
  debts?: number; grossSpoken?: string; netSpoken?: string;
  debtors?: number; funded?: number;
};
type Attempts = { total: number; refused: number; clears: number };
type Facts = { contract: string; attempts: Attempts; debts: number; settled: Cycle; voided: Cycle };

const F: Facts = JSON.parse(readFileSync("film/facts.json", "utf8"));
const S = F.settled;
const A = F.attempts;

/**
 * How the voice reads a caption word or phrase. Keys may span words: a figure and its unit are
 * one phrase, so "0.2669 USDC" is said as money and the whole phrase lights together.
 * The hyphenated compounds are written apart only because the existing takes were recorded that
 * way; the voice reads them identically, and this keeps those takes rather than re-billing them.
 */
export const SPOKEN_AS: Record<string, string> = {
  "1974": "nineteen seventy-four",
  [`${S.gross} USDC`]: S.grossSpoken ?? S.gross,
  [`${S.net} USDC`]: S.netSpoken ?? S.net,
  "Half-settled": "Half settled",
  "half-settled": "half settled",
  "on-chain": "on chain",
};

export type Spoken = { words: string[]; spoken: string };

const PUNCT = /^(.*?)([.,?!:;]*)$/;
const PHRASES = Object.keys(SPOKEN_AS)
  .filter((k) => k.includes(" "))
  .map((k) => k.split(" "))
  .sort((a, b) => b.length - a.length);

/** Each caption word or phrase, with the text the voice actually reads for it. */
export function speak(line: string): Spoken[] {
  const tokens = line.split(" ").filter(Boolean);
  const out: Spoken[] = [];
  for (let i = 0; i < tokens.length; ) {
    const phrase = PHRASES.find((p) =>
      p.every((w, k) => {
        const t = tokens[i + k];
        if (t === undefined) return false;
        return k === p.length - 1 ? PUNCT.exec(t)![1] === w : t === w;
      }),
    );
    if (phrase) {
      const words = tokens.slice(i, i + phrase.length);
      const tail = PUNCT.exec(words[words.length - 1]!)![2]!;
      out.push({ words, spoken: SPOKEN_AS[phrase.join(" ")]! + tail });
      i += phrase.length;
      continue;
    }
    const [, core, tail] = PUNCT.exec(tokens[i]!)!;
    out.push({ words: [tokens[i]!], spoken: (SPOKEN_AS[core!] ?? core!) + tail! });
    i += 1;
  }
  return out;
}

export const spokenLine = (line: string): string =>
  speak(line).map((w) => w.spoken).filter(Boolean).join(" ");

export const NARRATION: Block[] = [
  // The card carries no voice: five seconds of type and the claim, then straight into the product.
  { segment: "00-open", secs: 6, text: "" },

  {
    segment: "01-problem",
    secs: 16,
    text:
      "In 1974, regulators closed Bankhaus Herstatt. " +
      "Banks that had already paid it marks never received their dollars. " +
      "Half-settled is the worst state money can be in.",
  },
  {
    segment: "02-clearing",
    secs: 34,
    text:
      `Four businesses. Five currencies. ${F.debts} debts, live on Arc mainnet. ` +
      `Paid one at a time, this cycle is ${S.debts} payments and ${S.debts} conversions. ` +
      "Instead, one Chainlink read per currency prices every debt at a single fixing. " +
      "Then each party's debts are set off against what it is owed. " +
      `${S.gross} USDC was owed gross. ` +
      `Only ${S.net} USDC actually moved.`,
    // The gross is named as Replay rolls the figure back up to it, and the net is named as the
    // figure comes to rest on it: the voice and the number arrive together.
    anchors: { 5: { on: "replay", word: 0, offset: 0.15 }, 6: { on: "landed", word: 1, offset: -0.25 } },
  },
  {
    segment: "03-reversal",
    secs: 22,
    text:
      "And when someone does not pay? " +
      `Here, ${F.voided.funded} of ${F.voided.debtors} net debtors funded. ` +
      "At the deadline, anyone can void the cycle. " +
      "The deposit came back to the wei, and every debt reopened, still endorsed. " +
      "And nobody is left half-settled.",
  },
  {
    segment: "04-refusals",
    secs: 34,
    text:
      `${A.total} attempts, against the live contract. ` +
      `${A.refused} must be refused by name. ${A.clears} honest ones must clear. ` +
      "It answers in its own words. " +
      `All ${A.total} ran, and every one ended exactly as its rule said.`,
    // An earlier cut ended at "8 of 17 run": the payoff was promised and never shown. This line
    // waits for the counter to reach the end, so the viewer sees it land.
    anchors: { 4: { on: "complete", word: 0, offset: 0.35 } },
  },
  {
    segment: "05-close",
    secs: 19,
    text:
      "No owner, no admin key, and every payout is a withdrawal. " +
      "The four parties are my own wallets, and it is not audited. " +
      "Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.",
  },
  // The end card: the name and where to find it, while the resolve rings out.
  { segment: "06-end", secs: 6, text: "" },
];
