// Shared freshness vocabulary for occupancy display (map marker color,
// OccupancyBadge). The TTL calculation that turns a report timestamp into
// one of these levels (0-15min = high, 15-30 = medium, 30-60 = low, 60+ =
// unknown — see docs/ARCHITECTURE.md section 5) arrives in Phase 2 once
// occupancy_reports actually has rows; every location is "unknown" until
// then.

export type FreshnessLevel = "high" | "medium" | "low" | "unknown";

export const freshnessColor: Record<FreshnessLevel, string> = {
  high: "#22c55e",
  medium: "#eab308",
  low: "#94a3b8",
  unknown: "#d4d4d8",
};

export const freshnessLabel: Record<FreshnessLevel, string> = {
  high: "Live",
  medium: "Recent",
  low: "Stale",
  unknown: "No live data",
};
