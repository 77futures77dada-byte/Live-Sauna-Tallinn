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
    return <p className="text-sm text-zinc-400">{dict.location.noIceReports}</p>;
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
      />
      🧊 {conditionLabel[report.condition]} · {formatAge(report.createdAt, dict.time)}
    </p>
  );
}
