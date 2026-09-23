/**
 * The narration script for Setoff.
 *
 * Two renderings of one script:
 *   `text` — shown as captions. Digits, because a caption is read.
 *   `say`  — spoken. Numbers written out, because TTS mangles grouped digits.
 * Both must split into the SAME number of sentences: timing maps by index.
 *
 * Every figure is interpolated from film/facts.json, which is read straight off
 * the contract by `npm run film:facts`. The script therefore cannot claim a
 * number the chain does not hold.
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
  {
    segment: "00-open",
    secs: 16,
    text:
      "At half past three on the 26th of June 1974, German regulators closed Bankhaus Herstatt. " +
      "Banks that had already paid it Deutsche marks never received their dollars. " +
      "Half-settled is the worst state money can be in.",
    say:
      "At half past three on the twenty-sixth of June, nineteen seventy-four, German regulators closed Bankhaus Herstatt. " +
      "Banks that had already paid it Deutsche marks never received their dollars. " +
      "Half settled is the worst state money can be in.",
  },
  {
    segment: "01-claim",
    secs: 21,
    text:
      "Setoff is live on Arc mainnet. " +
      "Four businesses owe each other in five currencies: dollars, euros, pesos, reais and yen. " +
      `There are ${F.debts} debts on this contract, and every one of them is a real transaction. ` +
      "Nothing here is seeded and there is no database.",
    say:
      "Setoff is live on Arc mainnet. " +
      "Four businesses owe each other in five currencies: dollars, euros, pesos, reais and yen. " +
      `There are ${F.debts} debts on this contract, and every one of them is a real transaction. ` +
      "Nothing here is seeded, and there is no database.",
  },
  {
    segment: "02-clearing",
    secs: 36,
    text:
      `Paid one by one, these ${S.debts} debts are ${S.debts} payments and ${S.debts} currency conversions. ` +
      "Instead they enter one cycle. " +
      "At the cutoff, one Chainlink read per currency prices every debt. " +
      "That single published rate is the fixing, and it is stored with its round ID. " +
      "Then each party's debts are set off against what it is owed. " +
      `${S.gross} USDC was owed gross. ` +
      `Only ${S.net} USDC moved, and ${S.setOff}% of it cancelled.`,
    say:
      `Paid one by one, these ${S.debts} debts are ${S.debts} payments and ${S.debts} currency conversions. ` +
      "Instead they enter one cycle. " +
      "At the cutoff, one Chainlink read per currency prices every debt. " +
      "That single published rate is the fixing, and it is stored with its round I D. " +
      "Then each party's debts are set off against what it is owed. " +
      `${S.grossSpoken} was owed gross. ` +
      `Only ${S.netSpoken} moved, and ${S.setOff} percent of it cancelled.`,
  },
  {
    segment: "03-reversal",
    secs: 28,
    text:
      "The other half of the claim is what happens when someone does not pay. " +
      `In this cycle, ${F.voided.funded} of ${F.voided.debtors} net debtors funded. ` +
      "At the deadline, anyone can void it. " +
      "The funded party's deposit came back to the wei. " +
      "Its balance fell by exactly its gas, and nothing else. " +
      "Every debt returned to the direct path, still endorsed, and nobody is left half-settled.",
    say:
      "The other half of the claim is what happens when someone does not pay. " +
      `In this cycle, ${F.voided.funded} of ${F.voided.debtors} net debtors funded. ` +
      "At the deadline, anyone can void it. " +
      "The funded party's deposit came back to the wei. " +
      "Its balance fell by exactly its gas, and nothing else. " +
      "Every debt returned to the direct path, still endorsed, and nobody is left half settled.",
  },
  {
    segment: "04-refusals",
    secs: 26,
    text:
      `All ${A.total} attempts here run against the live contract as read-only calls. ` +
      "Stale rates, underpayment, paying someone else's debt, settling a cycle twice. " +
      `${A.refused} must be refused by name, and ${A.clears} honest ones must clear. ` +
      "The contract answers in its own words.",
    say:
      `All ${A.total} attempts here run against the live contract as read only calls. ` +
      "Stale rates, underpayment, paying someone else's debt, settling a cycle twice. " +
      `${A.refused} must be refused by name, and ${A.clears} honest ones must clear. ` +
      "The contract answers in its own words.",
  },
  {
    segment: "05-close",
    secs: 29,
    text:
      "USDC is Arc's native currency, so the net moves as a plain payment, with no token approvals anywhere. " +
      "The contract is verified, has no owner and no admin key, and every payout is a withdrawal. " +
      "The four parties are my own wallets, and it has not been audited. " +
      "Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.",
    say:
      "U S D C is Arc's native currency, so the net moves as a plain payment, with no token approvals anywhere. " +
      "The contract is verified, has no owner and no admin key, and every payout is a withdrawal. " +
      "The four parties are my own wallets, and it has not been audited. " +
      "Debts in five currencies clear at one on chain fixing: only the net moves, and either every party settles or none does.",
  },
];
