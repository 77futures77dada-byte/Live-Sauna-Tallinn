import { formatAge, freshnessColor, getFreshness } from "@/lib/freshness";
import type { LatestWater } from "@/lib/reports";

// Crowdsourced water_reports — distinct from the official station reading
// shown by WeatherStrip. No placeholder value when there's no recent
// report; per docs/ARCHITECTURE.md section 5, "unknown" shows no number.
export function WaterTempStat({ report }: { report?: LatestWater }) {
  const level = getFreshness(report?.createdAt ?? null);

  if (!report || level === "unknown") {
    return <p className="text-sm text-zinc-400">No recent water temperature reports.</p>;
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
      />
      🌊 {report.temperature.toFixed(1)}°C reported · {formatAge(report.createdAt)}
    </p>
  );
}
