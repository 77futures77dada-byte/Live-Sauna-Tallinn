import { freshnessColor, type FreshnessLevel } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";

// The count is only shown for high/medium/low freshness — per
// docs/ARCHITECTURE.md section 5, "unknown" never shows a number, only
// that there's no recent data.
export function OccupancyBadge({
  level,
  count,
  locale,
}: {
  level: FreshnessLevel;
  count?: number;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const label =
    level !== "unknown" && count !== undefined
      ? `${count} ${dict.location.peopleUnit} · ${dict.freshness[level]}`
      : dict.freshness[level];

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
