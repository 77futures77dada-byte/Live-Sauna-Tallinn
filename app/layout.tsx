import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import { getLocale } from "@/lib/get-locale";
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

export const metadata: Metadata = {
  title: "Live Sauna Tallinn",
  description: "Live occupancy, water temperature, and booking for Tallinn's saunas and winter swimming spots.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
