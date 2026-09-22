import { formatUnits, hexToString, parseUnits, stringToHex, type Hex } from "viem";

export const CURRENCIES = ["USD", "EUR", "MXN", "BRL", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Debt amounts are the currency's value × 10^6 (Setoff.AMOUNT_DECIMALS). */
export const AMOUNT_DECIMALS = 6;
/** Native USDC on Arc has 18 decimals. Never mix it with the 6-decimal ERC-20 view (D006). */
export const USDC_DECIMALS = 18;

const DISPLAY_DECIMALS: Record<Currency, number> = { USD: 2, EUR: 2, MXN: 2, BRL: 2, JPY: 0 };

export const isCurrency = (code: string): code is Currency =>
  (CURRENCIES as readonly string[]).includes(code);

export const encodeCurrency = (code: Currency): Hex => stringToHex(code, { size: 3 });
export const decodeCurrency = (hex: Hex): string => hexToString(hex, { size: 3 }).replace(/\0/g, "");

/** Rounds an exact decimal string half-up to `digits` places, without ever using a float. */
export function roundDecimal(value: string, digits: number): string {
  const negative = value.startsWith("-");
  const [int, frac = ""] = (negative ? value.slice(1) : value).split(".");
  if (frac.length <= digits) {
    const out = digits ? `${int}.${frac.padEnd(digits, "0")}` : int;
    return negative ? `-${out}` : out;
  }
  const scaled = BigInt(int + frac.slice(0, digits)) + (Number(frac[digits]) >= 5 ? 1n : 0n);
  const s = scaled.toString().padStart(digits + 1, "0");
  const out = digits ? `${s.slice(0, -digits)}.${s.slice(-digits)}` : s;
  return negative ? `-${out}` : out;
}

const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function withGrouping(decimal: string): string {
  const negative = decimal.startsWith("-");
  const [int, frac] = (negative ? decimal.slice(1) : decimal).split(".");
  const out = frac === undefined ? group(int) : `${group(int)}.${frac}`;
  return negative ? `−${out}` : out;
}

/** "MXN 1,250.00" — always with the ISO code, never a bare symbol. */
export function formatAmount(amount: bigint, code: string): string {
  const digits = isCurrency(code) ? DISPLAY_DECIMALS[code] : 2;
  return withGrouping(roundDecimal(formatUnits(amount, AMOUNT_DECIMALS), digits));
}

/** USDC from native units, to `digits` places. */
export function formatUsdc(wei: bigint, digits = 4): string {
  return withGrouping(roundDecimal(formatUnits(wei, USDC_DECIMALS), digits));
}

/** The exact USDC value, every significant digit. */
export const exactUsdc = (wei: bigint) => formatUnits(wei, USDC_DECIMALS);

export function formatRate(answer: bigint, decimals: number): string {
  return formatUnits(answer, decimals);
}

/** Parses a user-typed amount into currency × 10^6. Returns null when it isn't a number. */
export function parseAmount(input: string): bigint | null {
  const clean = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{0,6})?$/.test(clean)) return null;
  try {
    return parseUnits(clean, AMOUNT_DECIMALS);
  } catch {
    return null;
  }
}

/** Mirrors Setoff.toUsdc exactly: currency × 10^6 → native USDC, rounded up. */
export function toUsdc(amount: bigint, code: string, answer: bigint, decimals: number): bigint {
  if (code === "USD") return amount * 10n ** 12n;
  const numerator = amount * answer * 10n ** 12n;
  const denominator = 10n ** BigInt(decimals);
  return (numerator + denominator - 1n) / denominator;
}
