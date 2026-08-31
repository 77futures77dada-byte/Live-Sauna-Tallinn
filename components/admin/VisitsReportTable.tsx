export interface VisitReportRow {
  id: string;
  email: string;
  locationName: string;
  startedAt: string;
  finishedAt: string | null;
  autoClosed: boolean;
  latitude: number | null;
  longitude: number | null;
  beforeUrl: string | null;
  afterUrl: string | null;
}

function durationLabel(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function coordLabel(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "—";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export function VisitsReportTable({ rows }: { rows: VisitReportRow[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-500">No visits in this date range.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3">Location</th>
            <th className="pb-2 pr-3">Started</th>
            <th className="pb-2 pr-3">Finished</th>
            <th className="pb-2 pr-3">Duration</th>
            <th className="pb-2 pr-3">Check-in coords</th>
            <th className="pb-2 pr-3">Photos</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-zinc-100 align-top dark:border-zinc-800">
              <td className="py-2 pr-3">{row.email}</td>
              <td className="py-2 pr-3">{row.locationName}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-zinc-500">
                {new Date(row.startedAt).toLocaleString("en-GB")}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap text-zinc-500">
                {row.finishedAt ? new Date(row.finishedAt).toLocaleString("en-GB") : "—"}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{durationLabel(row.startedAt, row.finishedAt)}</td>
              <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
                {coordLabel(row.latitude, row.longitude)}
              </td>
              <td className="py-2 pr-3">
                <div className="flex gap-2">
                  {row.beforeUrl ? (
                    <a href={row.beforeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      before
                    </a>
                  ) : (
                    <span className="text-zinc-400">before —</span>
                  )}
                  {row.afterUrl ? (
                    <a href={row.afterUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      after
                    </a>
                  ) : (
                    <span className="text-zinc-400">after —</span>
                  )}
                </div>
              </td>
              <td className="py-2">
                {row.finishedAt === null ? (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                    in progress
                  </span>
                ) : row.autoClosed ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                    auto-closed
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    finished
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
