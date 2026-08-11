import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Landing hero only (components/landing/HeroLanding.tsx) — Fraunces for
// the display headline, IBM Plex Sans for the live conditions numbers.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Live Sauna Tallinn",
  description: "Live occupancy, water temperature, and booking for Tallinn's saunas and winter swimming spots.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
