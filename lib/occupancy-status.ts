import { getFreshness } from "./freshness";
import type { FreshnessLevel } from "./freshness";
import type { LatestOccupancy, LatestWater } from "./reports";

// Derived purely for the "LIVE NOW" location list — not a stored field.
// "unknown" covers both no report and a stale one (freshness "low"/
// "unknown"), so a 40-minute-old headcount never gets colored as if it
// were current.
export type OccupancyStatus = "quiet" | "active" | "busy" | "unknown";

// Traffic-light functional colors, kept saturated on purpose even under
// the otherwise-monochrome rebrand (see app/globals.css) — this is data
// (how busy a place is), not brand decoration. "active" specifically uses
// the warm "steam" amber (#f2b84b, distinct from BookingPanel's cooler
// caution token) — a deliberate point of warmth against the rest of the
// monochrome/cold-teal palette, not a generic caution color.
export const occupancyStatusColor: Record<OccupancyStatus, string> = {
  quiet: "#22c55e",
  active: "#f2b84b",
  busy: "#ef4444",
  unknown: "#6b7280",
};

export function getOccupancyStatus(
  freshness: FreshnessLevel,
  peopleCount: number | undefined,
  capacity: number | null,
): OccupancyStatus {
  if (peopleCount === undefined || (freshness !== "high" && freshness !== "medium")) {
    return "unknown";
  }
  if (peopleCount === 0) return "quiet";

  if (capacity) {
    const ratio = peopleCount / capacity;
    if (ratio < 0.4) return "quiet";
    if (ratio < 0.8) return "active";
    return "busy";
  }

  if (peopleCount <= 3) return "quiet";
  if (peopleCount <= 8) return "active";
  return "busy";
}

// Whether a sauna has a fresh crowdsourced signal of its own — a recent
// headcount or a recent water-temperature report. Deliberately excludes
// the shared Ilmateenistus station reading (which is ambient weather, not
// per-sauna, and is surfaced separately in the LiveStatsBar): LocationList
// uses this to decide whether to show per-card states or a single shared
// "no live data yet" banner above the column.
export function hasCrowdLiveData(
  occupancy: LatestOccupancy | undefined,
  water: LatestWater | undefined,
): boolean {
  const occupancyFresh =
    occupancy !== undefined &&
    ["high", "medium"].includes(getFreshness(occupancy.createdAt));
  const waterFresh = water !== undefined && getFreshness(water.createdAt) !== "unknown";
  return occupancyFresh || waterFresh;
}

export interface LiveSnapshot {
  activeLocations: number;
  peopleCount: number;
}

// Same "live" bar as the LIVE NOW list (see components/locator/LocationList):
// only high/medium freshness reports count, so a stale headcount never
// inflates the hero's snapshot line.
export function getLiveSnapshot(occupancy: Map<string, LatestOccupancy>): LiveSnapshot {
  let activeLocations = 0;
  let peopleCount = 0;

  for (const report of occupancy.values()) {
    const freshness = getFreshness(report.createdAt);
    if (freshness === "high" || freshness === "medium") {
      activeLocations += 1;
      peopleCount += report.peopleCount;
    }
  }

  return { activeLocations, peopleCount };
}
