import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/get-locale";
import { bcp47Locale, getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getReputationSummary } from "@/lib/reputation";
import { signOutAction } from "@/lib/actions/sign-out";

export default async function ProfilePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const crowdLevelLabel: Record<string, string> = {
    low: dict.visit.crowdLow,
    medium: dict.visit.crowdMedium,
    high: dict.visit.crowdHigh,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [summary, { data: visits }, { data: locations }, { data: photos }] = await Promise.all([
    getReputationSummary(supabase, user.id),
    supabase
      .from("visits")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase.from("locations").select("id, name, slug"),
    supabase.from("photos").select("*").eq("user_id", user.id),
  ]);

  const locationById = new Map((locations ?? []).map((l) => [l.id, l]));

  const photoPaths = (photos ?? []).map((p) => p.storage_url);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const service = createServiceClient();
    const { data: signed } = await service.storage
      .from("visit-photos")
      .createSignedUrls(photoPaths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) {
        signedUrlByPath.set(s.path, s.signedUrl);
      }
    }
  }

  const photosByVisit = new Map<string, typeof photos>();
  for (const photo of photos ?? []) {
    if (!photo.visit_id) continue;
    const existing = photosByVisit.get(photo.visit_id) ?? [];
    existing.push(photo);
    photosByVisit.set(photo.visit_id, existing);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        {dict.profile.backToMap}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{dict.profile.title}</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {dict.auth.logout}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-100 p-5 dark:border-zinc-800">
        <p className="text-3xl font-semibold">{summary.reputation}</p>
        <p className="text-sm text-zinc-500">{dict.profile.reputation}</p>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold">{summary.reportsCount}</p>
            <p className="text-xs text-zinc-500">{dict.profile.reports}</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{summary.completedVisits}</p>
            <p className="text-xs text-zinc-500">{dict.profile.visits}</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{summary.photosCount}</p>
            <p className="text-xs text-zinc-500">{dict.profile.photos}</p>
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">{dict.profile.myVisits}</h2>

      {!visits || visits.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">{dict.profile.noVisits}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visits.map((visit) => {
            const location = locationById.get(visit.location_id);
            const visitPhotos = photosByVisit.get(visit.id) ?? [];

            return (
              <li
                key={visit.id}
                className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {location?.name ?? dict.profile.unknownLocation}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(visit.started_at).toLocaleString(bcp47Locale[locale], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {visit.finished_at === null ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                      {dict.profile.inProgress}
                    </span>
                  ) : visit.auto_closed ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                      {dict.profile.autoClosed}
                    </span>
                  ) : (
                    visit.rating !== null && (
                      <span className="text-sm text-zinc-500">
                        {"★".repeat(visit.rating)}
                        {"☆".repeat(5 - visit.rating)}
                      </span>
                    )
                  )}
                </div>

                {visit.crowd_level && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {crowdLevelLabel[visit.crowd_level] ?? visit.crowd_level}
                  </p>
                )}

                {visitPhotos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {visitPhotos.map((photo) => {
                      const url = signedUrlByPath.get(photo.storage_url);
                      if (!url) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire, not worth Next/Image's remote-pattern config for private per-user photos
                        <img
                          key={photo.id}
                          src={url}
                          alt={
                            photo.type === "before"
                              ? dict.profile.beforePhotoAlt
                              : dict.profile.afterPhotoAlt
                          }
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
