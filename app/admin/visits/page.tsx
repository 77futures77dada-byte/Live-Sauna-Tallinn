import { VisitsReportTable, type VisitReportRow } from "@/components/admin/VisitsReportTable";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const DAY_MS = 24 * 60 * 60_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Internal reporting view for the municipality: every check-in in a date
// range, with the user's email, location, timing, the before/after photos,
// the check-in coordinates persisted for audit (0010_visit_audit_and_expiry),
// and whether the visit was force-closed after the 4h grace window.
// English-only, like the rest of /admin.
export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  const today = new Date();
  const to = params.to && DATE_RE.test(params.to) ? params.to : isoDate(today);
  const from =
    params.from && DATE_RE.test(params.from)
      ? params.from
      : isoDate(new Date(today.getTime() - 30 * DAY_MS));

  const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString();
  // `to` is inclusive of the whole day, so the query bound is the start of
  // the next day.
  const toExclusiveIso = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS).toISOString();

  const supabase = await createClient();

  // Admin can read every visit via visits_select_own_or_admin (public.is_admin()).
  const [{ data: visits }, { data: locations }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, user_id, location_id, started_at, finished_at, auto_closed, latitude, longitude")
      .gte("started_at", fromIso)
      .lt("started_at", toExclusiveIso)
      .order("started_at", { ascending: false }),
    supabase.from("locations").select("id, name"),
  ]);

  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const visitRows = visits ?? [];
  const visitIds = visitRows.map((v) => v.id);

  // Email lives on auth.users, not profiles — needs the service role.
  const service = createServiceClient();
  const emailByUserId = new Map<string, string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }
    if (data.users.length < 1000) break;
  }

  // before/after photos for these visits, signed for viewing — same
  // pattern as app/admin/reports/page.tsx.
  const signedUrlByPath = new Map<string, string>();
  const photosByVisit = new Map<string, { before: string | null; after: string | null }>();
  if (visitIds.length > 0) {
    const { data: photos } = await supabase
      .from("photos")
      .select("visit_id, type, storage_url")
      .in("visit_id", visitIds)
      .in("type", ["before", "after"]);

    const paths = (photos ?? []).map((p) => p.storage_url);
    if (paths.length > 0) {
      const { data: signed } = await service.storage.from("visit-photos").createSignedUrls(paths, 3600);
      for (const s of signed ?? []) {
        if (s.signedUrl && s.path) signedUrlByPath.set(s.path, s.signedUrl);
      }
    }

    for (const p of photos ?? []) {
      if (!p.visit_id) continue;
      const entry = photosByVisit.get(p.visit_id) ?? { before: null, after: null };
      const url = signedUrlByPath.get(p.storage_url) ?? null;
      if (p.type === "before") entry.before = url;
      else if (p.type === "after") entry.after = url;
      photosByVisit.set(p.visit_id, entry);
    }
  }

  const rows: VisitReportRow[] = visitRows.map((v) => {
    const photos = photosByVisit.get(v.id) ?? { before: null, after: null };
    return {
      id: v.id,
      email: v.user_id ? (emailByUserId.get(v.user_id) ?? "unknown / deleted") : "deleted user",
      locationName: locationById.get(v.location_id) ?? "Unknown",
      startedAt: v.started_at,
      finishedAt: v.finished_at,
      autoClosed: v.auto_closed,
      latitude: v.latitude,
      longitude: v.longitude,
      beforeUrl: photos.before,
      afterUrl: photos.after,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Visits</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Check-in log for internal reporting. {rows.length} visit{rows.length === 1 ? "" : "s"} from {from} to {to}.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-transparent"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Apply
        </button>
      </form>

      <VisitsReportTable rows={rows} />
    </div>
  );
}
