"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, type Hash, type TransactionReceipt } from "viem";
import { SETOFF_ADDRESS, publicClient } from "@/lib/chain";
import { setoffAbi } from "@/lib/setoff-abi";
import { useWallet } from "./WalletProvider";

type Writable = "propose" | "accept" | "cancel" | "pay" | "withdraw" | "openCycle" | "proposeInCycle" | "fixCycle" | "fund" | "settle" | "voidCycle";

export type TxPhase =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "signing" }
  | { phase: "including"; hash: Hash }
  | { phase: "done"; hash: Hash; receipt: TransactionReceipt }
  | { phase: "failed"; message: string; hash?: Hash; refused?: boolean };

/** What each Setoff refusal means, in words a person can act on. */
const REASONS: Record<string, string> = {
  StaleFixing: "The fixing for this currency is older than 25 hours, so Setoff refuses it. Nothing was charged.",
  InvalidAnswer: "The rate feed returned an invalid answer, so Setoff refuses it. Nothing was charged.",
  InvalidUpdatedAt: "The rate feed's timestamp is invalid, so Setoff refuses it. Nothing was charged.",
  Underpaid: "The fixing moved since your quote. Refresh and pay the new amount.",
  NotDebtor: "Only the debtor on this debt can do that. Switch to the debtor's account.",
  NotCreditor: "Only the creditor on this debt can do that. Switch to the creditor's account.",
  WrongState: "This debt has already moved on. Refresh to see where it is now.",
  InvalidDebtor: "The debtor must be a different, valid address.",
  ZeroAmount: "Enter an amount above zero.",
  UnsupportedCurrency: "That currency isn't supported.",
  NothingToWithdraw: "There's nothing to withdraw for this account.",
  TransferFailed: "Your address can't receive USDC right now, so the withdrawal was refused. Your balance is still owed to you.",
  AmountTooLarge: "That amount is beyond what a single debt can hold.",
  InCycle: "This debt clears in its cycle, not on its own. Fund your net on the cycle's page.",
  InvalidSchedule: "The cutoff must be in the future, and the funding window between 10 minutes and 30 days.",
  UnknownCycle: "There's no cycle with that number.",
  WrongCycleState: "This cycle has already moved on. Refresh to see where it is now.",
  BeforeCutoff: "The cutoff hasn't arrived yet. The cycle can be fixed from the cutoff.",
  PastCutoff: "Enrolment closed at the cutoff. This debt can't join the cycle now.",
  BeforeDeadline: "The funding deadline hasn't passed. A cycle can only be voided after it.",
  PastDeadline: "The funding deadline has passed. The cycle can now only be voided.",
  CycleFull: "This cycle already holds 16 debts, its limit.",
  TooManyParties: "This cycle already has 8 parties, its limit.",
  EmptyCycle: "No debt has joined this cycle, so there's nothing to fix. It can be voided after its deadline.",
  NotNetDebtor: "This account doesn't owe a net in this cycle, so there's nothing for it to fund.",
  AlreadyFunded: "This account has already funded its net.",
  Underfunded: "That's less than your net. Fund the full amount; any excess comes back to you.",
  NotFullyFunded: "Not every net debtor has funded yet. The cycle settles only when all of them have.",
  FullyFunded: "Every net debtor has funded, so this cycle settles; it can't be voided.",
};

function explain(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "You declined in your wallet. Nothing was sent.";
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && REASONS[name]) return REASONS[name];
    }
    if (/insufficient funds/i.test(error.message)) return "This account doesn't hold enough USDC on Arc for the amount plus gas.";
    return error.shortMessage;
  }
  if (error instanceof Error && /reject|denied/i.test(error.message)) return "You declined in your wallet. Nothing was sent.";
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * One path for every write: simulate first (a refusal is caught before the wallet ever asks
 * you to sign), sign, wait for inclusion (final on Arc), then re-read the page from the chain.
 */
export function useSetoffTx() {
  const { account, client, ensureArc } = useWallet();
  const router = useRouter();
  const [state, setState] = useState<TxPhase>({ phase: "idle" });

  const run = useCallback(
    async (functionName: Writable, args: readonly unknown[], value?: bigint): Promise<TransactionReceipt | null> => {
      if (!account) { setState({ phase: "failed", message: "Connect a wallet first." }); return null; }
      let hash: Hash | undefined;
      try {
        setState({ phase: "checking" });
        await ensureArc();
        const wallet = client();
        if (!wallet) throw new Error("No wallet connected.");
        const { request } = await publicClient.simulateContract({
          address: SETOFF_ADDRESS,
          abi: setoffAbi,
          functionName,
          args: args as never,
          value,
          account,
        } as never);
        setState({ phase: "signing" });
        hash = await wallet.writeContract(request as never);
        setState({ phase: "including", hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("The transaction was included but reverted.");
        setState({ phase: "done", hash, receipt });
        router.refresh();
        return receipt;
      } catch (error) {
        // Red is only for the contract saying no; a declined signature or a dropped call is not a refusal.
        const refused = (error instanceof BaseError && !!error.walk((e) => e instanceof ContractFunctionRevertedError)) || (error instanceof Error && /reverted/.test(error.message));
        setState({ phase: "failed", message: explain(error), hash, refused });
        return null;
      }
    },
    [account, client, ensureArc, router],
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, run, reset, busy: state.phase === "checking" || state.phase === "signing" || state.phase === "including" };
}
