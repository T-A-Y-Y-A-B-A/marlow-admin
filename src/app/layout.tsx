import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const text = Instrument_Sans({ subsets: ["latin"], variable: "--font-text", display: "swap" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Marlow Admin", template: "%s · Marlow Admin" },
  description: "Revenue, subscribers and team management for Marlow.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0a" },
  ],
};

// Runs before first paint so the saved theme never flashes.
// The key and default must match lib/settings.ts (not imported: that module is client-only).
const STORAGE_KEY = "marlow:settings:v1";
const preferencesScript = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}"),t=s.theme||"dark";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;if(s.reduceMotion)document.documentElement.dataset.motion="reduce"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${text.variable} ${code.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className="font-sans text-[14.5px] text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
