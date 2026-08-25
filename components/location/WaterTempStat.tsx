import { Waves } from "lucide-react";
import { formatAge, freshnessColor, getFreshness } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestWater } from "@/lib/reports";

// Crowdsourced water_reports — distinct from the official station reading
// shown by WeatherStrip. No placeholder value when there's no recent
// report; per docs/ARCHITECTURE.md section 5, "unknown" shows no number.
// The Waves icon is a fixed neutral gray (no more thematic "water blue"
// under the monochrome rebrand) — the small dot alongside it is the one
// that tracks report freshness.
export function WaterTempStat({ report, locale }: { report?: LatestWater; locale: Locale }) {
  const dict = getDictionary(locale);
  const level = getFreshness(report?.createdAt ?? null);

  if (!report || level === "unknown") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-steam">
        <Waves className="h-3.5 w-3.5 text-steam" aria-hidden />
        {dict.location.noWaterReports}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-fjord">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
        aria-hidden
      />
      <Waves className="h-3.5 w-3.5 text-steam" aria-hidden />
      {report.temperature.toFixed(1)}°C {dict.location.waterReported} ·{" "}
      <span className="text-steam">{formatAge(report.createdAt, dict.time)}</span>
    </p>
  );
}
