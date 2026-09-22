import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import "./globals.css";

// The width axis is load-bearing: the figure compresses from gross to net (DESIGN.md §5).
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const martian = Martian_Mono({ subsets: ["latin"], axes: ["wdth"], variable: "--font-martian", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Setoff — debts in five currencies, cleared on Arc", template: "%s · Setoff" },
  description: "Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${martian.variable}`}>
      <body>
        <WalletProvider>
          <Masthead />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
