import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import "./globals.css";

// Archivo's width axis carries the engraved legends (wdth 125); Martian Mono's carries the figures.
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
          <TooltipProvider delayDuration={120}>
            <Masthead />
            {children}
            <Footer />
          </TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
