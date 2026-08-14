import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

// Display face for HUD readouts (pot, stacks, big numbers) — angular and
// technical, matching the poker table's sci-fi ship setting.
const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
});

// Body/label face — narrow and technical, pairs with Orbitron without
// competing with it for attention.
const rajdhani = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hold'em",
  description: "Texas Hold'em against 9 AI opponents",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body>{children}</body>
    </html>
  );
}
