/**
 * The narration script for Setoff.
 *
 * Two renderings of one script:
 *   `text` — shown as captions. Digits, because a caption is read.
 *   `say`  — spoken. Numbers written out, because TTS mangles grouped digits.
 * Both must split into the SAME number of sentences: timing maps by index.
 *   npx tsx scripts/narration-check.ts
 *
 * Every figure is interpolated from film/facts.json, which is read straight off
 * the contract by `npm run film:facts`. The script therefore cannot claim a
 * number the chain does not hold.
 *
 * Written to be SHORT. An earlier cut ran 2:26 with a caption on screen almost
 * continuously; the note back was that the product is visually interesting
 * enough to carry itself, and that every screen did not need a line over it.
 * Each segment now has more silence than speech, and the silence is aimed at
 * the moment the set-off plays.
 */
import { readFileSync } from "node:fs";

export type Block = { segment: string; secs: number; text: string; say?: string };

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

export const NARRATION: Block[] = [
  // The card carries no voice. Five seconds of type and the claim, then straight
  // into the product — the old sixteen-second open was the weakest thing in the film.
  { segment: "00-open", secs: 5, text: "" },

  {
    segment: "01-problem",
    secs: 16,
    text:
      "In 1974, regulators closed Bankhaus Herstatt. " +
      "Banks that had already paid it marks never received their dollars. " +
      "Half-settled is the worst state money can be in.",
    say:
      "In nineteen seventy-four, regulators closed Bankhaus Herstatt. " +
      "Banks that had already paid it marks never received their dollars. " +
      "Half settled is the worst state money can be in.",
  },
  {
    segment: "02-clearing",
    secs: 36,
    text:
      `Four businesses. Five currencies. ${F.debts} debts, live on Arc mainnet. ` +
      `Paid one at a time, this cycle is ${S.debts} payments and ${S.debts} conversions. ` +
      "Instead, one Chainlink read per currency prices every debt at a single fixing. " +
      "Then each party's debts are set off against what it is owed. " +
      `${S.gross} USDC was owed gross. ` +
      `Only ${S.net} USDC actually moved.`,
    say:
      `Four businesses. Five currencies. ${F.debts} debts, live on Arc mainnet. ` +
      `Paid one at a time, this cycle is ${S.debts} payments and ${S.debts} conversions. ` +
      "Instead, one Chainlink read per currency prices every debt at a single fixing. " +
      "Then each party's debts are set off against what it is owed. " +
      `${S.grossSpoken} was owed gross. ` +
      `Only ${S.netSpoken} actually moved.`,
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
    say:
      "And when someone does not pay? " +
      `Here, ${F.voided.funded} of ${F.voided.debtors} net debtors funded. ` +
      "At the deadline, anyone can void the cycle. " +
      "The deposit came back to the wei, and every debt reopened, still endorsed. " +
      "And nobody is left half settled.",
  },
  {
    segment: "04-refusals",
    secs: 20,
    text:
      `${A.total} attempts, against the live contract. ` +
      `${A.refused} must be refused by name. ${A.clears} honest ones must clear. ` +
      "It answers in its own words.",
    say:
      `${A.total} attempts, against the live contract. ` +
      `${A.refused} must be refused by name. ${A.clears} honest ones must clear. ` +
      "It answers in its own words.",
  },
  {
    segment: "05-close",
    secs: 19,
    text:
      "No owner, no admin key, and every payout is a withdrawal. " +
      "The four parties are my own wallets, and it is not audited. " +
      "Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.",
    say:
      "No owner, no admin key, and every payout is a withdrawal. " +
      "The four parties are my own wallets, and it is not audited. " +
      "Debts in five currencies clear at one on chain fixing: only the net moves, and either every party settles or none does.",
  },
];
