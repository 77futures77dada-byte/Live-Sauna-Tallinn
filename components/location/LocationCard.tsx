"use client";

import { Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { BeforeAfterPhoto } from "@/components/visit/BeforeAfterPhoto";
import { CheckInButton } from "@/components/visit/CheckInButton";
import { VisitSummaryForm } from "@/components/visit/VisitSummaryForm";
import { formatAge, getFreshness } from "@/lib/freshness";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";
import { locationTypeIconComponent } from "@/lib/location-types";
import { getOccupancyStatus } from "@/lib/occupancy-status";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import type { OpenVisit } from "@/lib/visits";
import type { StationObservation } from "@/lib/weather";
import { IceStatus } from "./IceStatus";
import { LocationTypeBanner } from "./LocationTypeBanner";
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

const tagClass =
  "inline-flex items-center gap-1 rounded-full border border-warm-border bg-ivory px-2.5 py-1 text-xs text-steam";

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
  const [closing, setClosing] = useState(false);

  // Delays the actual onClose call so the exit animation below has time to
  // play instead of the card just vanishing — same pattern as
  // AssistantSheet's panel, same duration.
  function requestClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 180);
  }

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
  const freshness = getFreshness(occupancy?.createdAt ?? null);
  const occupancyStatus = getOccupancyStatus(freshness, occupancy?.peopleCount, location.capacity);
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
        onClick={requestClose}
        className={`fixed inset-0 z-[1200] bg-black/30 lg:bg-transparent ${
          closing ? "animate-[backdrop-exit_180ms_ease-in_forwards]" : "animate-[backdrop-enter_200ms_ease-out]"
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[1201] flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl
                   lg:inset-x-auto lg:right-4 lg:top-20 lg:bottom-auto lg:max-h-[75vh] lg:w-96 lg:rounded-2xl ${
                     closing ? "animate-[panel-exit_180ms_ease-in_forwards]" : "animate-[panel-enter_220ms_ease-out]"
                   }`}
      >
        {/*
          No location photo gallery exists in this app — the `photos` table
          only holds per-visit before/after and booking-verification shots,
          not curated location photography — so this is always the generic
          per-type stock photo (see LocationTypeBanner), never a photo of
          this specific location.
        */}
        <div className="relative h-32 shrink-0">
          <LocationTypeBanner type={location.type} className="h-full w-full" />
          <button
            type="button"
            onClick={requestClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-fjord/40 text-white backdrop-blur-sm transition hover:bg-fjord/60"
            aria-label={dict.location.close}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight text-fjord">
            {location.name}
          </h2>

          <div className="mt-1.5">
            <OccupancyBadge status={occupancyStatus} count={occupancy?.peopleCount} locale={locale} />
            <p className="mt-0.5 text-xs text-steam">
              {occupancy && freshness !== "unknown"
                ? `${dict.location.updatedPrefix} ${formatAge(occupancy.createdAt, dict.time)}`
                : dict.location.noOccupancy}
            </p>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className={tagClass}>
              <TypeIcon className="h-3 w-3" aria-hidden />
              {dict.locationType[location.type]}
            </span>
            <span className={tagClass}>{location.is_free ? dict.location.free : dict.location.paid}</span>
            {location.capacity !== null && (
              <span className={tagClass}>
                <Users className="h-3 w-3" aria-hidden />
                {dict.location.capacity}: {location.capacity}
              </span>
            )}
          </div>

          {location.description && (
            <p className="mt-2.5 text-sm text-steam">{location.description}</p>
          )}

          {openingHours && (
            <div className="mt-3 text-sm">
              <h3 className="font-semibold text-fjord">{dict.location.openingHours}</h3>
              <ul className="mt-1 space-y-0.5 text-steam">
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

          <div className="mt-3 space-y-1.5">
            <WaterTempStat report={water} locale={locale} />
            <IceStatus report={ice} locale={locale} />
          </div>

          <div className="mt-3 space-y-2 border-t border-warm-border pt-3">
            {weather.status === "loading" && (
              <p className="text-sm text-steam">{dict.location.loadingWeather}</p>
            )}
            {weather.status === "error" && (
              <p className="text-sm text-steam">{dict.location.weatherUnavailable}</p>
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
                <div className="mt-4 space-y-1.5 border-t border-warm-border pt-4">
                  <p className="text-sm font-medium text-fjord">
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
                      className="w-full rounded-lg bg-ember px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
                    >
                      {dict.location.finishVisit}
                    </button>
                  )}
                </div>
              ) : openVisit ? (
                <p className="mt-4 border-t border-warm-border pt-4 text-sm text-steam">
                  {dict.location.activeElsewhere}{" "}
                  <strong className="text-fjord">
                    {openVisitLocationName ?? dict.location.otherLocation}
                  </strong>{" "}
                  — {dict.location.activeElsewhereSuffix}
                </p>
              ) : (
                <CheckInButton locationId={location.id} locale={locale} onStarted={onVisitStarted} />
              )}

              <ReportButtons locationId={location.id} locale={locale} />
            </>
          ) : (
            <p className="mt-4 border-t border-warm-border pt-4 text-sm text-steam">
              <Link href="/login" className="text-ember underline">
                {dict.auth.login}
              </Link>{" "}
              {dict.location.loginToReport}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
