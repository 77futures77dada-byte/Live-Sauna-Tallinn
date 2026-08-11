import { formatAge, freshnessColor, getFreshness } from "@/lib/freshness";
import type { LatestIce } from "@/lib/reports";

const conditionLabel: Record<LatestIce["condition"], string> = {
  none: "No ice",
  partial: "Partial ice",
  frozen: "Frozen",
};

export function IceStatus({ report }: { report?: LatestIce }) {
  const level = getFreshness(report?.createdAt ?? null);

  if (!report || level === "unknown") {
    return <p className="text-sm text-zinc-400">No recent ice reports.</p>;
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: freshnessColor[level] }}
      />
      🧊 {conditionLabel[report.condition]} · {formatAge(report.createdAt)}
    </p>
  );
}
