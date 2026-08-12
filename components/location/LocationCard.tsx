"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { BeforeAfterPhoto } from "@/components/visit/BeforeAfterPhoto";
import { CheckInButton } from "@/components/visit/CheckInButton";
import { VisitSummaryForm } from "@/components/visit/VisitSummaryForm";
import { formatAge, getFreshness } from "@/lib/freshness";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";
import { locationTypeIconComponent } from "@/lib/location-types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import type { OpenVisit } from "@/lib/visits";
import type { StationObservation } from "@/lib/weather";
import { IceStatus } from "./IceStatus";
import { OccupancyBadge } from "./OccupancyBadge";
import { ReportButtons } from "./ReportButtons";
import { WaterTempStat } from "./WaterTempStat";
import { WeatherStrip } from "./WeatherStrip";

type Location = Database["public"]["Tables"]["locations"]["Row"];

type WeatherState =
  | { status: "loading" }
  | { status: "ready"; observation: StationObservation }
  | { status: "error" };

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function LocationCard({
  location,
  userId,
  locale,
  occupancy,
  water,
  ice,
  openVisit,
  openVisitLocationName,
  onVisitStarted,
  onVisitFinished,
  onClose,
}: {
  location: Location;
  userId: string | null;
  locale: Locale;
  occupancy?: LatestOccupancy;
  water?: LatestWater;
  ice?: LatestIce;
  openVisit: OpenVisit | null;
  openVisitLocationName: string | null;
  onVisitStarted: (visit: OpenVisit) => void;
  onVisitFinished: () => void;
  onClose: () => void;
}) {
  const dict = getDictionary(locale);
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [showFinishForm, setShowFinishForm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/weather?slug=${location.slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((observation: StationObservation) => {
        if (!cancelled) setWeather({ status: "ready", observation });
      })
      .catch(() => {
        if (!cancelled) setWeather({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [location.slug]);

  const openingHours = location.opening_hours;
  const occupancyLevel = getFreshness(occupancy?.createdAt ?? null);
  const TypeIcon = locationTypeIconComponent[location.type];

  return (
    <>
      {/*
        Leaflet's own panes/controls (.leaflet-pane, .leaflet-top) carry
        z-index up to 1000, and .leaflet-container never establishes its
        own stacking context (position: relative with no z-index), so
        those values compare directly against ours at the document root.
        z-40/z-50 lost that comparison and rendered invisibly underneath
        the map — see the 2026-08-11 bug report. Needs to clear 1000.
      */}
      <button
        type="button"
        aria-label={dict.location.close}
        onClick={onClose}
        className="fixed inset-0 z-[1200] bg-black/30 sm:bg-transparent"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[1201] max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900
                   sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-96 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{location.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-zinc-500">
              <TypeIcon className="h-4 w-4 shrink-0" aria-hidden />
              {dict.locationType[location.type]}
              {location.is_free ? ` · ${dict.location.free}` : ` · ${dict.location.paid}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label={dict.location.close}
          >
            ✕
          </button>
        </div>

        {location.description && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {location.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {location.capacity !== null && (
            <span className="text-sm text-zinc-500">
              👥 {dict.location.capacity}: {location.capacity}
            </span>
          )}
          <OccupancyBadge level={occupancyLevel} count={occupancy?.peopleCount} locale={locale} />
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {occupancy && occupancyLevel !== "unknown"
            ? `${dict.location.updatedPrefix} ${formatAge(occupancy.createdAt, dict.time)}`
            : dict.location.noOccupancy}
        </p>

        {openingHours && (
          <div className="mt-4 text-sm">
            <h3 className="font-medium text-zinc-700 dark:text-zinc-200">
              {dict.location.openingHours}
            </h3>
            <ul className="mt-1 space-y-0.5 text-zinc-500">
              {weekdays
                .filter((day) => day in openingHours)
                .map((day) => (
                  <li key={day}>
                    {dict.location.weekdays[day]}: {openingHours[day]}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <WaterTempStat report={water} locale={locale} />
          <IceStatus report={ice} locale={locale} />
        </div>

        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {weather.status === "loading" && (
            <p className="text-sm text-zinc-400">{dict.location.loadingWeather}</p>
          )}
          {weather.status === "error" && (
            <p className="text-sm text-zinc-400">{dict.location.weatherUnavailable}</p>
          )}
          {weather.status === "ready" && (
            <WeatherStrip observation={weather.observation} locale={locale} />
          )}
        </div>

        {userId ? (
          <>
            {location.booking_enabled && (
              <BookingPanel
                locationId={location.id}
                capacity={location.capacity}
                locale={locale}
                refreshToken={openVisit?.locationId === location.id ? openVisit.id : null}
              />
            )}

            {openVisit?.locationId === location.id ? (
              <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {dict.location.youAreHere} 🔥 — {dict.location.startedAt}{" "}
                  {new Date(openVisit.startedAt).toLocaleTimeString(bcp47Locale[locale], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <BeforeAfterPhoto visitId={openVisit.id} type="before" locale={locale} />
                {showFinishForm ? (
                  <>
                    <BeforeAfterPhoto visitId={openVisit.id} type="after" locale={locale} />
                    <VisitSummaryForm
                      visitId={openVisit.id}
                      locale={locale}
                      onFinished={() => {
                        setShowFinishForm(false);
                        onVisitFinished();
                      }}
                      onCancel={() => setShowFinishForm(false)}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFinishForm(true)}
                    className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {dict.location.finishVisit}
                  </button>
                )}
              </div>
            ) : openVisit ? (
              <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
                {dict.location.activeElsewhere}{" "}
                <strong>{openVisitLocationName ?? dict.location.otherLocation}</strong> —{" "}
                {dict.location.activeElsewhereSuffix}
              </p>
            ) : (
              <CheckInButton locationId={location.id} locale={locale} onStarted={onVisitStarted} />
            )}

            <ReportButtons locationId={location.id} locale={locale} />
          </>
        ) : (
          <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
            <Link href="/login" className="underline">
              {dict.auth.login}
            </Link>{" "}
            {dict.location.loginToReport}
          </p>
        )}
      </div>
    </>
  );
}
