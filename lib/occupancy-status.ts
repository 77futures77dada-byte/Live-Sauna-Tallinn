import type { FreshnessLevel } from "./freshness";

// Derived purely for the sidebar's "LIVE NOW" list — not a stored field.
// "unknown" covers both no report and a stale one (freshness "low"/
// "unknown"), so a 40-minute-old headcount never gets colored as if it
// were current.
export type OccupancyStatus = "quiet" | "active" | "busy" | "unknown";

export const occupancyStatusColor: Record<OccupancyStatus, string> = {
  quiet: "#22c55e",
  active: "#e8632c",
  busy: "#ef4444",
  unknown: "#7c93a0",
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
