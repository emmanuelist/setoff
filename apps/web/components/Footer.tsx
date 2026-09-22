import { SETOFF_ADDRESS, SOURCIFY, addressUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import { ContractBand } from "./Marks";
import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={s.foot}>
      <span className={s.band}><ContractBand label="SETOFF" /></span>
      <span>
        Contract <a href={addressUrl(SETOFF_ADDRESS)} target="_blank" rel="noreferrer" className="fig">{short(SETOFF_ADDRESS)}</a> on Arc mainnet ·{" "}
        <a href={SOURCIFY} target="_blank" rel="noreferrer">source verified (exact match)</a> · no owner, no admin, every payout a withdrawal.
      </span>
      <span className={s.note}>Every figure on this site is read live from the chain.</span>
    </footer>
  );
}
