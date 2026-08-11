import { freshnessColor, freshnessLabel, type FreshnessLevel } from "@/lib/freshness";

export function OccupancyBadge({ level }: { level: FreshnessLevel }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200"
      style={{ backgroundColor: `${freshnessColor[level]}33` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
      />
      {freshnessLabel[level]}
    </span>
  );
}
