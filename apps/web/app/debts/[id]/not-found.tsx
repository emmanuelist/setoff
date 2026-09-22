import Link from "next/link";

export default function NoSuchDebt() {
  return (
    <main className="sec" style={{ display: "grid", gap: 14, justifyItems: "start", minHeight: "40svh", alignContent: "center" }}>
      <span className="stamp returned">No such debt</span>
      <p className="dim">The contract has no debt with that number.</p>
      <Link href="/" className="link">See every debt</Link>
    </main>
  );
}
