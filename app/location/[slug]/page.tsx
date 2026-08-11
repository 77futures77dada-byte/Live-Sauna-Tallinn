import { notFound } from "next/navigation";
import { AppHeader } from "@/components/nav/AppHeader";
import { MapScreen } from "@/components/map/MapScreen";
import { createClient } from "@/lib/supabase/server";
import { getMapPageData } from "@/lib/map-data";
import { isAdmin } from "@/lib/admin";

// Deep-link target for QR codes (scripts/generate-qr.ts) — same map/card
// UI as the main screen, just centered on and pre-opened to one location.
// Logged-in visitors land with the card already showing "I'm here", one
// tap away — no need to find the marker themselves.
export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ locations, occupancy, water, ice, openVisit }, admin] = await Promise.all([
    getMapPageData(supabase, user),
    user ? isAdmin(supabase, user.id) : Promise.resolve(false),
  ]);

  const location = locations.find((l) => l.slug === slug);
  if (!location) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader userEmail={user?.email ?? null} isAdmin={admin} />
      <MapScreen
        locations={locations}
        initialOccupancy={[...occupancy.entries()]}
        initialWater={[...water.entries()]}
        initialIce={[...ice.entries()]}
        userId={user?.id ?? null}
        initialOpenVisit={openVisit}
        focusLocationId={location.id}
      />
    </div>
  );
}
