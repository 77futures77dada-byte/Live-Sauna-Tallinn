import { occupancyStatusColor, type OccupancyStatus } from "@/lib/occupancy-status";
import { getDictionary, type Locale } from "@/lib/i18n";

// Same quiet/active/busy/unknown law as the marker and the sidebar card —
// a location is never a different color in three different places. The
// count is only ever shown alongside a live (non-"unknown") status.
export function OccupancyBadge({
  status,
  count,
  locale,
}: {
  status: OccupancyStatus;
  count?: number;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const color = occupancyStatusColor[status];
  const statusLabel =
    status === "quiet"
      ? dict.sidebar.filterQuiet
      : status === "active"
        ? dict.sidebar.filterActive
        : status === "busy"
          ? dict.sidebar.filterBusy
          : dict.freshness.unknown;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {statusLabel}
      {status !== "unknown" && count !== undefined && (
        <span className="font-normal text-steam">
          · {count} {dict.location.peopleUnit}
        </span>
      )}
    </span>
  );
}
