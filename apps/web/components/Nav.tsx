"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const ITEMS = [
  { href: "/", label: "Debts", match: (p: string) => p === "/" || (p.startsWith("/debts/") && p !== "/debts/new") },
  { href: "/debts/new", label: "Record a debt", short: "Record", match: (p: string) => p === "/debts/new" },
  { href: "/refusals", label: "Refusal room", short: "Refusals", match: (p: string) => p === "/refusals" },
];

/** A three-way selector switch: the active position is a raised cap that slides between detents. */
export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="well grid grid-cols-3 p-1 sm:inline-grid">
      {ITEMS.map((it) => {
        const on = it.match(path);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex h-9 items-center justify-center rounded-[7px] px-3 text-[13px] font-semibold no-underline transition-colors duration-150 sm:px-4 ${on ? "text-ink" : "text-graphite hover:text-ink"}`}
          >
            {on && (
              <motion.span
                layoutId="nav-cap"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-[7px] bg-[linear-gradient(180deg,var(--key),var(--plate))] shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(29_27_24/0.16),0_1px_0_var(--key-skirt),0_4px_8px_-4px_rgb(29_27_24/0.35)]"
              />
            )}
            <span className="relative whitespace-nowrap">
              {it.short ? <><span className="sm:hidden">{it.short}</span><span className="hidden sm:inline">{it.label}</span></> : it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
