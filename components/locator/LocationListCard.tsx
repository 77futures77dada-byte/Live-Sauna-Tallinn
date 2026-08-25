import { MapPin } from "lucide-react";
import { formatAge, getFreshness } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getOccupancyStatus, occupancyStatusColor } from "@/lib/occupancy-status";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function LocationListCard({
  location,
  occupancy,
  number,
  selected,
  locale,
  onSelect,
}: {
  location: Location;
  occupancy?: LatestOccupancy;
  number: number;
  selected: boolean;
  locale: Locale;
  onSelect: (location: Location) => void;
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

  // Freshness gates the headcount (only "Live"/"Recent" reports are shown
  // as a number — a "Stale" one degrades to the neutral status above,
  // never a number that looks current but isn't), independent of whether
  // an "Updated N min ago" line is worth showing at all.
  const showPeopleCount = status !== "unknown" && occupancy;
  const showUpdated = occupancy && freshness !== "unknown";

  return (
    // A <div>, not a <button>, because the always-visible booking CTA below
    // is its own button — two nested <button>s isn't valid HTML, so the
    // name/status block and the CTA are siblings, each independently
    // clickable but both opening the same detail sheet (LocationCard).
    <div
      className={`w-full animate-[card-enter_200ms_ease-out] rounded-2xl border p-4 transition sm:p-5 ${
        selected
          ? "border-ember bg-ember/5 shadow-md ring-1 ring-ember/30"
          : "border-warm-border bg-white shadow-sm hover:border-steam/40 hover:shadow-md"
      }`}
    >
      <button type="button" onClick={() => onSelect(location)} className="flex w-full items-start gap-3.5 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fjord font-display text-lg font-semibold text-ivory">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold text-fjord">{location.name}</p>
          <p className="text-xs text-steam">{dict.locationType[location.type]}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {status === "unknown" ? (
              <span className="flex items-center gap-1.5 font-medium text-steam">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                {statusLabel}
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium" style={{ color: statusColor }}>
                {/* Solid dot plus a soft halo (box-shadow, not Tailwind's
                    `ring` utility — its color is a CSS var this component
                    doesn't control) so status reads as a real indicator,
                    not a flat gray bullet. */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColor, boxShadow: `0 0 0 4px ${statusColor}26` }}
                  aria-hidden
                />
                {statusLabel}
              </span>
            )}
            {showPeopleCount && (
              <span className="text-steam">
                · {occupancy.peopleCount} {dict.location.peopleUnit}
              </span>
            )}
          </div>
          {showUpdated && (
            <p className="mt-0.5 text-[11px] text-steam/80">{formatAge(occupancy.createdAt, dict.time)}</p>
          )}
        </div>
      </button>

      {location.booking_enabled && (
        <button
          type="button"
          onClick={() => onSelect(location)}
          className="mt-3.5 w-full rounded-full bg-ember px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 sm:w-auto"
        >
          {dict.booking.bookSlotButton}
        </button>
      )}
    </div>
  );
}
