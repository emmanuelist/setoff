import { ArrowUpRight } from "lucide-react";
import { SETOFF_ADDRESS, SOURCIFY, addressUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import { ContractBand } from "./Marks";

export function Footer() {
  return (
    <footer className="mt-[var(--seam)] flex flex-wrap items-center gap-x-6 gap-y-2 px-[calc(var(--gutter)+8px)] pt-4 pb-7 text-small text-graphite">
      <span className="text-ink"><ContractBand label="SETOFF" /></span>
      <span>
        Contract <a href={addressUrl(SETOFF_ADDRESS)} target="_blank" rel="noreferrer" className="fig text-ink">{short(SETOFF_ADDRESS)}</a> on Arc mainnet ·{" "}
        <a href={SOURCIFY} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink">source verified, exact match<ArrowUpRight className="size-3" aria-hidden="true" /></a> · no owner, no admin, every payout a withdrawal.
      </span>
      <span className="sm:ml-auto">Every figure here is read live from the chain.</span>
    </footer>
  );
}
