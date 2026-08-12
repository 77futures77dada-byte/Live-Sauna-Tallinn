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

// The map marker's type glyph sits on top of freshnessColor — a single
// stroke color doesn't read on both the bright green/gold fills and the
// pale gray ones, so pick light-on-dark or dark-on-light per level.
export const freshnessIconColor: Record<FreshnessLevel, string> = {
  high: "#EAF3F5",
  medium: "#0E2233",
  low: "#0E2233",
  unknown: "#0E2233",
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

export type TimeDictionary = {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  hoursMinutesAgo: string;
};

export function formatAge(timestamp: string, dict: TimeDictionary): string {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000),
  );
  if (minutes < 1) return dict.justNow;
  if (minutes < 60) return dict.minutesAgo.replace("{n}", String(minutes));

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0
    ? dict.hoursAgo.replace("{n}", String(hours))
    : dict.hoursMinutesAgo.replace("{h}", String(hours)).replace("{m}", String(remainder));
}
