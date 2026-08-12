"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAge } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
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
}: {
  locale: Locale;
  onEnter: () => void;
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
    <div className="flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-[#0E2233] px-6 py-12 text-center text-[#EAF3F5]">
      <p className="text-xs font-medium tracking-[0.2em] text-[#7C93A0] uppercase">
        {dict.hero.eyebrow}
      </p>
      <h1
        className="mt-3 max-w-md text-4xl leading-tight font-medium sm:text-5xl"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {dict.hero.headline}
      </h1>
      <p className="mt-4 max-w-sm text-sm text-[#7C93A0]">{dict.hero.subtitle}</p>

      <div
        className="mt-8 flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
        style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#7C93A0]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3FA9D6]" />
          {CONDITIONS_NAME}
        </span>

        {weather.status === "ready" && (
          <>
            {weather.observation.airTemperature !== null && (
              <span className="flex flex-col items-start leading-none">
                <span className="text-2xl font-semibold text-[#E8632C]">
                  {weather.observation.airTemperature.toFixed(1)}°
                </span>
                <span className="mt-1 text-[10px] text-[#7C93A0]">{dict.hero.air}</span>
              </span>
            )}
            {weather.observation.waterTemperature !== null && (
              <span className="flex flex-col items-start leading-none">
                <span className="text-2xl font-semibold text-[#3FA9D6]">
                  {weather.observation.waterTemperature.toFixed(1)}°
                </span>
                <span className="mt-1 text-[10px] text-[#7C93A0]">{dict.hero.water}</span>
              </span>
            )}
            <span className="text-[10px] text-[#7C93A0]">
              {formatAge(weather.observation.observedAt)}
            </span>
          </>
        )}
        {weather.status === "loading" && (
          <span className="text-xs text-[#7C93A0]">{dict.hero.conditionsLoading}</span>
        )}
        {weather.status === "error" && (
          <span className="text-xs text-[#7C93A0]">{dict.hero.conditionsError}</span>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEnter}
          className="rounded-full bg-[#E8632C] px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {dict.hero.viewMap}
        </button>
        <Link
          href="/login"
          className="rounded-full border border-[#3FA9D6]/40 px-6 py-2.5 text-sm font-medium text-[#EAF3F5] transition hover:bg-white/5"
        >
          {dict.hero.login}
        </Link>
      </div>
    </div>
  );
}
