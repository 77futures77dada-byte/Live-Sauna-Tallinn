import { PhotoModerationList, type PendingPhoto } from "@/components/admin/PhotoModerationList";
import { RecentReportsList, type ReportRow } from "@/components/admin/RecentReportsList";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const REPORTS_PER_TYPE = 20;
const REPORTS_SHOWN = 30;

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [
    { data: pendingPhotos },
    { data: occupancyReports },
    { data: waterReports },
    { data: iceReports },
    { data: locations },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("photos").select("*").eq("moderated", false).order("created_at", { ascending: false }),
    supabase
      .from("occupancy_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(REPORTS_PER_TYPE),
    supabase.from("water_reports").select("*").order("created_at", { ascending: false }).limit(REPORTS_PER_TYPE),
    supabase.from("ice_reports").select("*").order("created_at", { ascending: false }).limit(REPORTS_PER_TYPE),
    supabase.from("locations").select("id, name"),
    supabase.from("profiles").select("id, username, is_banned"),
  ]);

  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const photoPaths = (pendingPhotos ?? []).map((p) => p.storage_url);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const service = createServiceClient();
    const { data: signed } = await service.storage
      .from("visit-photos")
      .createSignedUrls(photoPaths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrlByPath.set(s.path, s.signedUrl);
    }
  }

  const photos: PendingPhoto[] = (pendingPhotos ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    createdAt: p.created_at,
    locationName: locationById.get(p.location_id) ?? "Unknown",
    username: profileById.get(p.user_id)?.username ?? "Unknown",
    url: signedUrlByPath.get(p.storage_url) ?? null,
  }));

  const reports: ReportRow[] = [
    ...(occupancyReports ?? []).map((r) => ({
      id: r.id,
      kind: "occupancy" as const,
      value: `${r.people_count} people`,
      locationName: locationById.get(r.location_id) ?? "Unknown",
      userId: r.user_id ?? "",
      username: r.user_id ? (profileById.get(r.user_id)?.username ?? "Unknown") : "deleted user",
      isBanned: r.user_id ? (profileById.get(r.user_id)?.is_banned ?? false) : false,
      createdAt: r.created_at,
    })),
    ...(waterReports ?? []).map((r) => ({
      id: r.id,
      kind: "water" as const,
      value: `${r.temperature}°C`,
      locationName: locationById.get(r.location_id) ?? "Unknown",
      userId: r.user_id ?? "",
      username: r.user_id ? (profileById.get(r.user_id)?.username ?? "Unknown") : "sensor",
      isBanned: r.user_id ? (profileById.get(r.user_id)?.is_banned ?? false) : false,
      createdAt: r.created_at,
    })),
    ...(iceReports ?? []).map((r) => ({
      id: r.id,
      kind: "ice" as const,
      value: r.condition,
      locationName: locationById.get(r.location_id) ?? "Unknown",
      userId: r.user_id ?? "",
      username: r.user_id ? (profileById.get(r.user_id)?.username ?? "Unknown") : "deleted user",
      isBanned: r.user_id ? (profileById.get(r.user_id)?.is_banned ?? false) : false,
      createdAt: r.created_at,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, REPORTS_SHOWN);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Photo moderation</h1>
        <PhotoModerationList photos={photos} />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Recent reports</h2>
        <RecentReportsList reports={reports} />
      </div>
    </div>
  );
}
