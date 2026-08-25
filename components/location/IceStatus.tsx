import { Snowflake } from "lucide-react";
import { formatAge, freshnessColor, getFreshness } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestIce } from "@/lib/reports";

export function IceStatus({ report, locale }: { report?: LatestIce; locale: Locale }) {
  const dict = getDictionary(locale);
  const level = getFreshness(report?.createdAt ?? null);

  const conditionLabel: Record<LatestIce["condition"], string> = {
    none: dict.report.noIce,
    partial: dict.report.partialIce,
    frozen: dict.report.frozen,
  };

  if (!report || level === "unknown") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-steam">
        <Snowflake className="h-3.5 w-3.5 text-steam" aria-hidden />
        {dict.location.noIceReports}
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
      <Snowflake className="h-3.5 w-3.5 text-steam" aria-hidden />
      {conditionLabel[report.condition]} ·{" "}
      <span className="text-steam">{formatAge(report.createdAt, dict.time)}</span>
    </p>
  );
}
