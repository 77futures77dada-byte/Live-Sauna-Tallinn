// Shared freshness vocabulary for occupancy display (map marker color,
// OccupancyBadge, water/ice report stats) — see docs/ARCHITECTURE.md
// section 5.

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

// 0-15min = high, 15-30 = medium, 30-60 = low, 60+ = unknown. A null
// timestamp (no report yet) is unknown. Negative ages (clock skew) are
// clamped to "just happened" rather than treated as unknown.
export function getFreshness(timestamp: string | null): FreshnessLevel {
  if (!timestamp) return "unknown";

  const ageMinutes = (Date.now() - new Date(timestamp).getTime()) / 60_000;
  if (ageMinutes <= 15) return "high";
  if (ageMinutes <= 30) return "medium";
  if (ageMinutes <= 60) return "low";
  return "unknown";
}

export function formatAge(timestamp: string): string {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr ago` : `${hours} hr ${remainder} min ago`;
}
