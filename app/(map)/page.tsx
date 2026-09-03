import { AppHeader } from "@/components/nav/AppHeader";
import { MapScreen } from "@/components/map/MapScreen";
import { createClient } from "@/lib/supabase/server";
import { getMapPageData } from "@/lib/map-data";
import { isAdmin } from "@/lib/admin";
import { getLocale } from "@/lib/get-locale";
import { isGeminiConfigured } from "@/lib/gemini";

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ locations, occupancy, water, ice, openVisit, verifiedPresence }, admin, locale] =
    await Promise.all([
      getMapPageData(supabase, user),
      user ? isAdmin(supabase, user.id) : Promise.resolve(false),
      getLocale(),
    ]);

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        userEmail={user?.email ?? null}
        isAdmin={admin}
        locale={locale}
        assistantEnabled={isGeminiConfigured()}
      />
      <MapScreen
        locations={locations}
        initialOccupancy={[...occupancy.entries()]}
        initialWater={[...water.entries()]}
        initialIce={[...ice.entries()]}
        initialVerifiedPresence={[...verifiedPresence.entries()]}
        userId={user?.id ?? null}
        initialOpenVisit={openVisit}
        locale={locale}
      />
    </div>
  );
}
