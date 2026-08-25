"use client";

import Link from "next/link";
import { ArrowRight, Flame, Snowflake, Waves } from "lucide-react";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";

// Full-screen splash before the dashboard (map + three sauna cards) —
// deliberately a different register from it: a bright ice/water teal
// splash here, strict monochrome white interior there. The dashboard
// (including AppHeader's in-app logo) stays black/white per the rebrand;
// this screen alone keeps a soft Frost Blue accent as a warmer first
// impression, scoped to this file only — no shared color token reused
// here, so it can't leak into the monochrome interior by accident. Same
// two-scene split as the TallinnVäljak reference this was designed
// against. MapScreen renders this inside a
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
        // Deep-to-light ice/water teal, not black — the one place the
        // monochrome rebrand deliberately doesn't apply (see file-level
        // comment). Frost Blue (#3fa9d6) as the light stop, a deeper
        // version of the same hue underneath rather than a different
        // color entirely.
        background: "linear-gradient(155deg, #0e4a5c 0%, #3fa9d6 100%)",
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
      {/* The one deliberate warm touch against this otherwise cool teal
          splash (see lib/occupancy-status.ts for the same idea on the
          dashboard's status dot) — a soft amber glow behind the flame,
          sitting under it in paint order rather than tinting the icon
          itself, so the icon vocabulary (white, matching its snowflake/
          wave siblings) stays consistent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 sm:h-96 sm:w-96"
        style={{
          background: "radial-gradient(circle, rgba(242,184,75,0.35) 0%, rgba(242,184,75,0) 70%)",
          filter: "blur(24px)",
        }}
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
        <Flame className="h-6 w-6 text-fjord" aria-hidden />
      </div>
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
        <LanguageSwitcher locale={locale} variant="pill" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Heavy-weight IBM Plex Sans poster treatment — white + the same
            Frost Blue as the background's light stop, not the dashboard's
            monochrome fjord/steam. */}
        <h1 className="text-6xl leading-none font-extrabold tracking-tight sm:text-7xl">
          <span className="text-white">Live</span>
          <span className="text-[#3fa9d6]">Sauna</span>
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
