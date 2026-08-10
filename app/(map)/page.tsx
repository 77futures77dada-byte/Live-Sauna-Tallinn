import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, getDictionary } from "@/lib/i18n";

// Phase 0 placeholder for the main screen. The map itself (Leaflet/OSM,
// location markers, freshness-colored occupancy) lands in Phase 1 — see
// docs/ARCHITECTURE.md.
export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dict = getDictionary(defaultLocale);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">{dict.app.name}</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        Phase 0 skeleton is running. The map and live sauna data arrive in
        Phase 1.
      </p>
      {user ? (
        <p className="text-sm text-zinc-500">Signed in as {user.email}</p>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          {dict.auth.login}
        </Link>
      )}
    </main>
  );
}
