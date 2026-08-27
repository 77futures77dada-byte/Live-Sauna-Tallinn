import { MapPin, Thermometer, Waves } from "lucide-react";
import { getFreshness } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getOccupancyStatus, occupancyStatusColor } from "@/lib/occupancy-status";
import type { LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function LocationListCard({
  location,
  occupancy,
  water,
  airTemperature,
  number,
  selected,
  locale,
  onSelect,
  dashWhenEmpty = false,
}: {
  location: Location;
  occupancy?: LatestOccupancy;
  water?: LatestWater;
  airTemperature: number | null;
  number: number;
  selected: boolean;
  locale: Locale;
  onSelect: (location: Location) => void;
  // Set by LocationList when not one sauna has a fresh crowdsourced
  // reading: a single shared banner above the column explains that once,
  // and each card collapses to a bare "—" instead of repeating the long
  // "no live data" status line three times down the column.
  dashWhenEmpty?: boolean;
}) {
  const dict = getDictionary(locale);
  const freshness = getFreshness(occupancy?.createdAt ?? null);
  const status = getOccupancyStatus(freshness, occupancy?.peopleCount, location.capacity);
  const statusColor = occupancyStatusColor[status];

  const statusLabel =
    status === "quiet"
      ? dict.occupancyStatus.quiet
      : status === "active"
        ? dict.occupancyStatus.active
        : status === "busy"
          ? dict.occupancyStatus.busy
          : dict.freshness.unknown;

  // Each stat is independently gated on its own freshness/availability —
  // occupancy having no fresh report doesn't hide a water reading that
  // does, or the shared station's air reading (which carries no per-report
  // freshness of its own, same convention as WeatherStrip).
  const showPeopleCount = status !== "unknown" && occupancy;
  const showWater = water && getFreshness(water.createdAt) !== "unknown";
  const showAir = airTemperature !== null;
  const hasAnything = Boolean(showPeopleCount || showWater || showAir);

  const capacityLabel =
    location.capacity !== null
      ? dict.location.capacityShort.replace("{n}", String(location.capacity))
      : null;

  const rightSide = dashWhenEmpty ? (
    <span className="shrink-0 text-sm text-steam" aria-label={dict.freshness.unknown}>
      —
    </span>
  ) : !hasAnything ? (
    <span className="shrink-0 text-xs text-steam">{dict.location.noDataShort}</span>
  ) : status === "unknown" ? (
    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-steam">
      <MapPin className="h-3 w-3" strokeWidth={2.25} aria-hidden />
      {statusLabel}
    </span>
  ) : (
    <span
      className="flex shrink-0 items-center gap-1.5 text-xs font-medium"
      style={{ color: statusColor }}
    >
      {/* Solid dot plus a soft halo (box-shadow, not Tailwind's `ring`
          utility — its color is a CSS var this component doesn't control)
          so status reads as a real indicator, not a flat gray bullet. */}
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor, boxShadow: `0 0 0 3px ${statusColor}26` }}
        aria-hidden
      />
      {statusLabel}
    </span>
  );

  return (
    // A <div>, not a <button>, because the always-visible booking CTA below
    // is its own button — two nested <button>s isn't valid HTML, so the
    // name/status block and the CTA are siblings, each independently
    // clickable but both opening the same detail sheet (LocationCard).
    <div
      className={`w-full animate-[card-enter_200ms_ease-out] rounded-2xl border p-3 transition sm:p-3.5 ${
        selected
          ? "border-fjord bg-fjord/5 shadow-md ring-1 ring-fjord/30"
          : "border-warm-border bg-white shadow-sm hover:border-steam/40 hover:shadow-md"
      }`}
    >
      <button type="button" onClick={() => onSelect(location)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fjord font-display text-base font-semibold text-ivory">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-fjord">{location.name}</p>
              {capacityLabel && <p className="text-[11px] text-steam">{capacityLabel}</p>}
            </div>
            {rightSide}
          </div>

          {hasAnything && !dashWhenEmpty && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              {showPeopleCount && (
                <span className="flex items-baseline gap-1 leading-none">
                  <span className="text-xl font-bold text-fjord">{occupancy.peopleCount}</span>
                  <span className="text-[11px] text-steam">{dict.location.peopleUnit}</span>
                </span>
              )}
              {showWater && (
                <span className="flex items-center gap-1 text-xs text-steam">
                  <Waves className="h-3 w-3" aria-hidden />
                  {water.temperature.toFixed(1)}°C {dict.location.waterShort}
                </span>
              )}
              {showAir && (
                <span className="flex items-center gap-1 text-xs text-steam">
                  <Thermometer className="h-3 w-3" aria-hidden />
                  {airTemperature!.toFixed(1)}°C {dict.location.weatherAir}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {location.booking_enabled && (
        <button
          type="button"
          onClick={() => onSelect(location)}
          className="mt-2.5 w-full rounded-full border-2 border-fjord px-3 py-1.5 text-xs font-semibold text-fjord transition hover:bg-fjord hover:text-ivory sm:w-auto"
        >
          {dict.booking.bookSlotButton}
        </button>
      )}
    </div>
  );
}
