import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans, Lora } from "next/font/google";
import Script from "next/script";
import { DemoBanner } from "@/components/DemoBanner";
import { getLocale } from "@/lib/get-locale";
import { isDemoMode } from "@/lib/demo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: "variable",
});

// Serif for headings (font-display) — "wood and charcoal" in the client's
// design notes. Lora rather than the app's original Fraunces: it carries a
// Cyrillic subset, which the Russian locale's headings need and Fraunces
// lacks. Variable font, so no explicit weight list.
const lora = Lora({
  variable: "--font-serif-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Live Sauna Tallinn",
  description: "Live occupancy, water temperature, and booking for Tallinn's saunas and winter swimming spots.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, demo] = await Promise.all([getLocale(), isDemoMode()]);

  return (
    <html
      lang={locale}
      // The theme-init script below sets data-theme on <html> before React
      // hydrates (so a returning dark-theme visitor never flashes light).
      // That's a deliberate, controlled-outside-React mutation — this tells
      // React to expect this one element's attributes to differ from the
      // server HTML instead of logging a hydration mismatch. Scoped to
      // <html>'s own attributes only; <head>/<body> and everything inside
      // are still fully hydration-checked.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSans.variable} ${lora.variable} h-full antialiased`}
    >
      <body className={`min-h-full flex flex-col ${demo ? "pt-8" : ""}`}>
        {demo && <DemoBanner />}
        {children}
        {/* Sets data-theme before first paint so a returning dark-theme
            visitor never flashes light — beforeInteractive is Next's
            mechanism for exactly this (injected into <head>, runs ahead of
            hydration; see node_modules/next/dist/docs .../script.md), which
            rules out doing this from a React effect. ThemeToggle owns the
            toggle itself and mirrors this same read/write contract with
            localStorage. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {"try{if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}"}
        </Script>
      </body>
    </html>
  );
}
