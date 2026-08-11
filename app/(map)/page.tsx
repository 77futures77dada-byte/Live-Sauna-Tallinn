import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, getDictionary } from "@/lib/i18n";
import {
  getLatestIceByLocation,
  getLatestOccupancyByLocation,
  getLatestWaterByLocation,
} from "@/lib/reports";

export default async function MapPage() {
  const supabase = await createClient();

  const [{ data: locations }, { data: { user } }, occupancy, water, ice] =
    await Promise.all([
      supabase.from("locations").select("*").order("name"),
      supabase.auth.getUser(),
      getLatestOccupancyByLocation(supabase),
      getLatestWaterByLocation(supabase),
      getLatestIceByLocation(supabase),
    ]);

  const dict = getDictionary(defaultLocale);

  return (
    <div className="flex h-screen flex-col">
      <header className="z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-base font-semibold">{dict.app.name}</h1>
        {user ? (
          <span className="text-sm text-zinc-500">{user.email}</span>
        ) : (
          <Link href="/login" className="text-sm font-medium underline">
            {dict.auth.login}
          </Link>
        )}
      </header>
      <MapScreen
        locations={locations ?? []}
        initialOccupancy={[...occupancy.entries()]}
        initialWater={[...water.entries()]}
        initialIce={[...ice.entries()]}
        userId={user?.id ?? null}
      />
    </div>
  );
}
