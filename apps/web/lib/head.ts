"use client";

import { useSyncExternalStore } from "react";
import { publicClient } from "./chain";

/** The chain's latest block, polled once for the whole page however many clocks read it. */
export type Head = { number: bigint; timestamp: number; seenAt: number };

const POLL_MS = 2500;
let head: Head | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
const listeners = new Set<() => void>();

async function poll() {
  try {
    const b = await publicClient.getBlock();
    if (!head || b.number > head.number) {
      head = { number: b.number, timestamp: Number(b.timestamp), seenAt: performance.now() };
      listeners.forEach((l) => l());
    }
  } catch {
    // A missed poll keeps the last block; the clock never invents one.
  }
  if (listeners.size > 0) timer = setTimeout(poll, document.hidden ? POLL_MS * 4 : POLL_MS);
  else running = false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!running) { running = true; poll(); }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) { clearTimeout(timer); timer = null; running = false; }
  };
}

export function useHead(): Head | null {
  return useSyncExternalStore(subscribe, () => head, () => null);
}
