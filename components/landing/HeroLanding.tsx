"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { formatAge } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";
import type { StationObservation } from "@/lib/weather";

// Pirita has both an air and a water sensor (lib/weather-stations.ts), so
// it's the one location that can carry this strip on its own before
// login, with no location selected yet.
const CONDITIONS_SLUG = "pirita";
const CONDITIONS_NAME = "Pirita";
const POLL_MS = 60_000;

type WeatherState =
  | { status: "loading" }
  | { status: "ready"; observation: StationObservation }
  | { status: "error" };

// Shown in place of the flat "Loading map…" text (see MapScreen) — the
// first thing anyone sees, logged in or not. Deliberately one live
// element (the conditions strip) rather than decorative motion —
// docs request for this screen was "don't overload it".
export function HeroLanding({
  locale,
  onEnter,
  liveSnapshot,
  userId,
}: {
  locale: Locale;
  onEnter: () => void;
  liveSnapshot: LiveSnapshot;
  userId: string | null;
}) {
  const dict = getDictionary(locale);
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch(`/api/weather?slug=${CONDITIONS_SLUG}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((observation: StationObservation) => {
          if (!cancelled) setWeather({ status: "ready", observation });
        })
        .catch(() => {
          if (!cancelled) {
            setWeather((prev) => (prev.status === "ready" ? prev : { status: "error" }));
          }
        });
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-ivory px-6 py-12 text-center text-fjord">
      <HeroBackground />
      <div className="relative z-10 flex flex-col items-center">
        {/* Group 1-3: headline, live snapshot, primary CTA — kept tight so
            they read as one block (docs request: sharpen the hierarchy so
            these three are the first thing anyone registers). */}
        <p className="text-xs font-medium tracking-[0.2em] text-steam uppercase">
          {dict.hero.eyebrow}
        </p>
        <h1
          className="mt-2 max-w-md text-4xl leading-[1.05] font-medium text-fjord sm:text-5xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {dict.hero.headline}
        </h1>

        <div
          className="mt-5 flex items-center gap-5 rounded-2xl border border-warm-border bg-white px-6 py-4 shadow-sm"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          aria-label={
            liveSnapshot.activeLocations > 0
              ? dict.hero.liveSnapshotActive
                  .replace("{locations}", String(liveSnapshot.activeLocations))
                  .replace("{people}", String(liveSnapshot.peopleCount))
              : dict.hero.liveSnapshotEmpty
          }
        >
          {liveSnapshot.activeLocations > 0 ? (
            <>
              <span className="flex flex-col items-center leading-none">
                <span className="text-3xl font-semibold text-ember">
                  {liveSnapshot.activeLocations}
                </span>
                <span className="mt-1 text-[10px] text-steam">
                  {dict.hero.liveSnapshotSpotsLabel}
                </span>
              </span>
              <span className="h-8 w-px bg-warm-border" aria-hidden />
              <span className="flex flex-col items-center leading-none">
                <span className="text-3xl font-semibold text-frost">
                  {liveSnapshot.peopleCount}
                </span>
                <span className="mt-1 text-[10px] text-steam">
                  {dict.hero.liveSnapshotPeopleLabel}
                </span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-steam">
              <Users className="h-4 w-4 text-frost" aria-hidden />
              {dict.hero.liveSnapshotEmpty}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="mt-6 rounded-full bg-ember px-10 py-4 text-base font-semibold text-white shadow-lg shadow-ember/25 transition hover:brightness-110"
        >
          {dict.hero.viewMap}
        </button>

        {/* Group 4-5: description and login — deliberately quieter, with
            more air separating them from the primary block above. */}
        <p className="mt-12 max-w-sm text-xs text-steam">{dict.hero.subtitle}</p>

        <div
          className="mt-4 flex items-center gap-4 rounded-xl border border-warm-border bg-ivory-shade/50 px-4 py-2.5"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-steam">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-frost" />
            {CONDITIONS_NAME}
          </span>

          {weather.status === "ready" && (
            <>
              {weather.observation.airTemperature !== null && (
                <span className="flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-fjord">
                    {weather.observation.airTemperature.toFixed(1)}°
                  </span>
                  <span className="mt-0.5 text-[9px] text-steam">{dict.hero.air}</span>
                </span>
              )}
              {weather.observation.waterTemperature !== null && (
                <span className="flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-fjord">
                    {weather.observation.waterTemperature.toFixed(1)}°
                  </span>
                  <span className="mt-0.5 text-[9px] text-steam">{dict.hero.water}</span>
                </span>
              )}
              <span className="text-[9px] text-steam">
                {formatAge(weather.observation.observedAt, dict.time)}
              </span>
            </>
          )}
          {weather.status === "loading" && (
            <span className="text-[11px] text-steam">{dict.hero.conditionsLoading}</span>
          )}
          {weather.status === "error" && (
            <span className="text-[11px] text-steam">{dict.hero.conditionsError}</span>
          )}
        </div>

        {!userId && (
          <Link
            href="/login"
            className="mt-4 text-xs font-medium text-steam underline-offset-2 transition hover:text-fjord hover:underline"
          >
            {dict.hero.login}
          </Link>
        )}
      </div>
    </div>
  );
}
