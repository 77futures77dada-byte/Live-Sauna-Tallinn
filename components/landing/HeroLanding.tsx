"use client";

import Link from "next/link";
import { ArrowRight, Flame, Snowflake, Waves } from "lucide-react";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";

// Full-screen splash before the dashboard (map + three sauna cards) —
// deliberately a different register from it: bright brand gradient here,
// calm Ivory interior there, same two-scene split as the TallinnVäljak
// reference this was designed against. MapScreen renders this inside a
// `fixed inset-0` wrapper (not this component's own doing) specifically so
// it covers AppHeader's bar too — this screen owns its own corner
// logo/language chrome instead of sharing that bar, which is why both
// appear here despite AppHeader already existing.
export function HeroLanding({
  locale,
  onEnter,
  userId,
}: {
  locale: Locale;
  onEnter: () => void;
  userId: string | null;
}) {
  const dict = getDictionary(locale);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-6 py-12 text-center"
      style={{
        // Fjord Ink -> Ember, diagonal — the same "cold outside, warm
        // inside" metaphor as the rest of the brand, not a generic blue
        // gradient like the reference itself uses.
        background: "linear-gradient(155deg, #0e2233 0%, #0e2233 42%, #e8632c 115%)",
      }}
    >
      {/* Oversized, low-opacity, bleeding past the viewport edges — decorative
          only, so they're aria-hidden and inert to pointer events. Icons are
          the app's own vocabulary (snowflake/flame/waves, see
          lib/location-types.ts) standing in for the reference's ball icons. */}
      <Snowflake
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-20 h-72 w-72 text-white/10 sm:h-80 sm:w-80"
        strokeWidth={1}
      />
      <Flame
        aria-hidden
        className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 text-white/10 sm:h-96 sm:w-96"
        strokeWidth={1}
      />
      <Waves
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/5 h-64 w-64 text-white/10 sm:h-72 sm:w-72"
        strokeWidth={1}
      />

      <div className="absolute top-5 left-5 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg sm:top-6 sm:left-6">
        <Flame className="h-6 w-6 text-ember" aria-hidden />
      </div>
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
        <LanguageSwitcher locale={locale} variant="pill" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* IBM Plex Sans at a heavy weight, not Fraunces — a one-off poster
            treatment for this wordmark only (see the file-level comment);
            the rest of the app keeps Fraunces for display type. */}
        <h1
          className="text-6xl leading-none font-extrabold tracking-tight sm:text-7xl"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          <span className="text-white">Live</span>
          <span className="text-ember">Sauna</span>
        </h1>

        <p className="mt-4 text-sm font-medium tracking-wide text-white/80">{dict.hero.tagline}</p>

        <p className="mt-5 max-w-xs text-sm text-white/70">{dict.hero.subtitle}</p>

        <button
          type="button"
          onClick={onEnter}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-fjord shadow-lg transition hover:brightness-95"
        >
          {dict.hero.viewMap}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>

        {!userId && (
          <Link
            href="/login"
            className="mt-6 text-xs font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline"
          >
            {dict.hero.login}
          </Link>
        )}
      </div>
    </div>
  );
}
