import { freshnessColor, freshnessLabel, type FreshnessLevel } from "@/lib/freshness";

// The count is only shown for high/medium/low freshness — per
// docs/ARCHITECTURE.md section 5, "unknown" never shows a number, only
// that there's no recent data.
export function OccupancyBadge({
  level,
  count,
}: {
  level: FreshnessLevel;
  count?: number;
}) {
  const label =
    level !== "unknown" && count !== undefined
      ? `${count} people · ${freshnessLabel[level]}`
      : freshnessLabel[level];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200"
      style={{ backgroundColor: `${freshnessColor[level]}33` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
      />
      {label}
    </span>
  );
}
