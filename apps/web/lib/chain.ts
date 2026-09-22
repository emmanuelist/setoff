import { createPublicClient, http, type Address, type Hash } from "viem";
import { arc } from "viem/chains";

/** Setoff milestone 2 (both paths, plus netting cycles) on Arc mainnet. Sourcify exact match; see docs/EVIDENCE.md (D019). */
export const SETOFF_ADDRESS: Address = "0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6";
export const DEPLOY_BLOCK = 22_187_522n;
export const DEPLOY_TIMESTAMP = 1_790_085_128;

/** Milestone 1's contract, kept as its record: debt #1 was first paid there. */
export const SETOFF_V1_ADDRESS: Address = "0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7";

export const EXPLORER = "https://explorer.arc.io";
export const SOURCIFY = `https://sourcify.dev/server/v2/contract/5042/${SETOFF_ADDRESS}`;

/** Arc's public RPC answers at most this many blocks per eth_getLogs (measured, D014). */
export const LOG_WINDOW = 10_000n;

/**
 * Reads are batched into Multicall3, which viem's `arc` chain already knows. The RPC defaults to
 * Arc's public endpoints; NEXT_PUBLIC_ARC_RPC_URL points it at a local fork for end-to-end tests.
 */
export const publicClient = createPublicClient({
  chain: arc,
  transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || undefined),
  batch: { multicall: true },
});

export const txUrl = (hash: Hash) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: Address) => `${EXPLORER}/address/${address}`;
export const blockUrl = (block: bigint) => `${EXPLORER}/block/${block}`;
