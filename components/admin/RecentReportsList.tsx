"use client";

import { useState } from "react";
import en from "@/i18n/en.json";
import { formatAge } from "@/lib/freshness";

// Admin panel is an internal English-only tool (not run through the
// visitor-facing locale switcher) — formatAge still needs a
// TimeDictionary, so it's given the English one directly.
const englishTime = en.time;

export interface ReportRow {
  id: string;
  kind: "occupancy" | "water" | "ice";
  value: string;
  locationName: string;
  userId: string;
  username: string;
  isBanned: boolean;
  createdAt: string;
}

const kindLabel: Record<ReportRow["kind"], string> = {
  occupancy: "Occupancy",
  water: "Water",
  ice: "Ice",
};

export function RecentReportsList({ reports }: { reports: ReportRow[] }) {
  const [banned, setBanned] = useState(() => new Set(reports.filter((r) => r.isBanned).map((r) => r.userId)));
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function toggleBan(userId: string) {
    const isBanned = banned.has(userId);
    setBusyUserId(userId);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, banned: !isBanned }),
      });
      if (res.ok) {
        setBanned((prev) => {
          const next = new Set(prev);
          if (isBanned) next.delete(userId);
          else next.add(userId);
          return next;
        });
      }
    } finally {
      setBusyUserId(null);
    }
  }

  if (reports.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">No reports yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="pb-2 pr-3">Type</th>
            <th className="pb-2 pr-3">Location</th>
            <th className="pb-2 pr-3">Value</th>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3">When</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const isBanned = report.userId ? banned.has(report.userId) : false;
            return (
              <tr key={`${report.kind}-${report.id}`} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3">{kindLabel[report.kind]}</td>
                <td className="py-2 pr-3">{report.locationName}</td>
                <td className="py-2 pr-3">{report.value}</td>
                <td className="py-2 pr-3">
                  {report.username}
                  {isBanned && (
                    <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-200">
                      banned
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-zinc-500">
                  {formatAge(report.createdAt, englishTime)}
                </td>
                <td className="py-2">
                  {report.userId && (
                    <button
                      type="button"
                      disabled={busyUserId === report.userId}
                      onClick={() => toggleBan(report.userId)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                    >
                      {isBanned ? "Unban" : "Ban"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
