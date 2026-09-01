export const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof weekdays)[number];

export type OpeningHoursDisplay =
  | { type: "everyday"; hours: string }
  | { type: "days"; entries: { day: Weekday; hours: string }[] };

// Collapses a 7-day opening_hours map into a single "everyday" line when
// every day carries the same hours, so a sauna open 12:00-22:00 daily
// doesn't repeat itself seven times in the UI.
export function summarizeOpeningHours(
  openingHours: Record<string, string> | null,
): OpeningHoursDisplay | null {
  if (!openingHours) return null;

  const entries = weekdays
    .filter((day) => day in openingHours)
    .map((day) => ({ day, hours: openingHours[day] }));

  if (entries.length === 0) return null;

  if (entries.length === weekdays.length && entries.every((entry) => entry.hours === entries[0].hours)) {
    return { type: "everyday", hours: entries[0].hours };
  }

  return { type: "days", entries };
}
