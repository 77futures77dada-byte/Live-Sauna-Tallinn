"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Share2, Thermometer, Waves } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SaunaLakeIllustration } from "@/components/locator/icons/SaunaLakeIllustration";
import type { LiveSnapshot } from "@/lib/occupancy-status";

// Amber accent for the live-people snapshot pill and its pulsing dot —
// one of the two places amber is allowed under the new palette (CTAs and
// the live signal; see app/globals.css). Matches --color-ember.
const AMBER = "#cc7a2e";

// Compact brand banner above the map+cards dashboard — distinct from
// HeroLanding (the full-screen pre-entry landing page): this is a strip,
// always visible once someone's past that landing screen. It carries the
// at-a-glance state (sauna/people count, shared air/water reading), a live
// dot, a share action, and a jump-to-the-list CTA so the common actions
// don't need a scroll. Client component: only ever rendered inside the
// already-client MapScreen, and the share toast needs local state.
//
// Colours stay on the dashboard theme tokens (ivory/fjord/steam/
// warm-border, see app/globals.css) plus the one amber accent, so the
// strip — the illustration included — inverts cleanly with the manual
// dark toggle.
export function LocatorHeroBanner({
  locale,
  totalSaunas,
  liveSnapshot,
  airTemperature,
  waterTemperature,
  backHref,
}: {
  locale: Locale;
  totalSaunas: number;
  liveSnapshot: LiveSnapshot;
  // Shared Ilmateenistus station reading (lib/weather-stations.ts),
  // fetched once in MapScreen — null when the station has nothing in the
  // current feed, in which case that half of the weather pill just isn't
  // rendered (same "nothing invented" rule as the LocationListCard stats).
  airTemperature: number | null;
  waterTemperature: number | null;
  // Set only on the QR deep-link page (app/location/[slug]) — the main
  // dashboard is the top of the app, nothing to go back to.
  backHref?: string;
}) {
  const dict = getDictionary(locale);
  const t = dict.banner;

  // A live report of at least one person on site — the dot pulses amber to
  // signal "updating"; with nobody reporting it sits as a muted grey bullet
  // rather than flashing for attention.
  const live = liveSnapshot.peopleCount > 0;
  const hasWeather = airTemperature !== null || waterTemperature !== null;

  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context, or permission denied) —
      // no toast rather than a broken-looking fallback.
    }
  }

  return (
    <div className="relative overflow-hidden border-b border-warm-border bg-ivory-shade">
      {/* Faint amber wash left-to-right so the centre doesn't read as empty. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(105deg, ${AMBER}14 0%, transparent 55%)` }}
      />

      {/* Share — pinned to the top-right corner of the strip. */}
      <button
        type="button"
        onClick={share}
        aria-label={t.share}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-warm-border bg-ivory/80 px-2.5 py-1.5 text-xs font-medium text-steam backdrop-blur transition hover:text-fjord lg:top-4 lg:right-6"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
        <span className={copied ? "inline" : "hidden sm:inline"}>
          {copied ? t.shareCopied : t.share}
        </span>
      </button>

      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:gap-6 sm:py-9 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex w-fit items-center gap-1 text-xs font-medium text-steam transition-colors hover:text-fjord"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {t.back}
            </Link>
          )}

          <p className="text-xs font-medium tracking-[0.2em] text-steam uppercase">
            {dict.hero.eyebrow}
          </p>
          <h1 className="font-display text-4xl leading-none font-semibold text-fjord sm:text-5xl">
            Harku
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {/* Unconditional "3 saunas · N people right now" — the sauna
                count is worth showing even at 0 people, and it's the one
                number here that never changes. */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
              style={{ backgroundColor: `${AMBER}1f`, borderColor: `${AMBER}59` }}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full bg-steam ${live ? "animate-pulse" : ""}`}
                style={live ? { backgroundColor: AMBER } : undefined}
                aria-hidden
              />
              <span className="text-sm font-medium text-fjord">
                {dict.hero.liveSnapshotBanner
                  .replace("{total}", String(totalSaunas))
                  .replace("{people}", String(liveSnapshot.peopleCount))}
              </span>
            </div>

            {/* Shared station reading — each half shown only when present. */}
            {hasWeather && (
              <div className="inline-flex items-center gap-2.5 rounded-full border border-warm-border bg-ivory/70 px-4 py-2 text-sm font-medium text-steam">
                {airTemperature !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5" aria-hidden />
                    {dict.liveStats.air.replace("{t}", airTemperature.toFixed(1))}
                  </span>
                )}
                {waterTemperature !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Waves className="h-3.5 w-3.5" aria-hidden />
                    {dict.liveStats.water.replace("{t}", waterTemperature.toFixed(1))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Jump straight to the sauna list (anchor lives in MapScreen). */}
          <a
            href="#saunas"
            className="mt-1 inline-flex w-full items-center justify-center rounded-full border-2 border-fjord px-5 py-2 text-sm font-semibold text-fjord transition hover:bg-fjord hover:text-ivory sm:w-auto sm:self-start"
          >
            {t.viewSaunas}
          </a>
        </div>

        {/* Illustration sits directly on the banner — its fills read the
            same theme tokens as the rest of the strip, so it inverts with
            the dark toggle. Smaller on mobile, scaling up with the
            breakpoints. */}
        <SaunaLakeIllustration className="block h-20 w-auto shrink-0 self-end sm:h-28 sm:self-center lg:h-36" />
      </div>
    </div>
  );
}
