import { MapPin } from "lucide-react";
import { formatAge, getFreshness } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import { locationTypeIconComponent } from "@/lib/location-types";
import { getOccupancyStatus, occupancyStatusColor } from "@/lib/occupancy-status";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function LocationListCard({
  location,
  occupancy,
  selected,
  locale,
  onSelect,
}: {
  location: Location;
  occupancy?: LatestOccupancy;
  selected: boolean;
  locale: Locale;
  onSelect: (location: Location) => void;
}) {
  const dict = getDictionary(locale);
  const TypeIcon = locationTypeIconComponent[location.type];
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
    <button
      type="button"
      onClick={() => onSelect(location)}
      className={`w-full animate-[card-enter_200ms_ease-out] rounded-xl border p-2.5 text-left transition ${
        selected
          ? "border-ember bg-ember/5 ring-1 ring-ember/30"
          : "border-transparent bg-ivory-shade hover:border-warm-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fjord/5 text-fjord">
            <TypeIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fjord">{location.name}</p>
            <p className="truncate text-xs text-steam">{dict.locationType[location.type]}</p>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        {status === "unknown" ? (
          <MapPin
            className="h-3 w-3 shrink-0"
            style={{ color: statusColor }}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden
          />
        )}
        <span className="font-medium" style={{ color: statusColor }}>
          {statusLabel}
        </span>
        {showPeopleCount && (
          <span className="text-steam">
            · {occupancy.peopleCount} {dict.location.peopleUnit}
          </span>
        )}
        {showUpdated && (
          <span className="text-[11px] text-steam/80">
            · {formatAge(occupancy.createdAt, dict.time)}
          </span>
        )}
      </div>
    </button>
  );
}
