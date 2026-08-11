import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import {
  getLatestIceByLocation,
  getLatestOccupancyByLocation,
  getLatestWaterByLocation,
} from "./reports";
import { getOpenVisit } from "./visits";

// Shared by app/(map)/page.tsx and app/location/[slug]/page.tsx — both
// render the same MapScreen, just with a different initial focus.
export async function getMapPageData(supabase: SupabaseClient<Database>, user: User | null) {
  const [{ data: locations }, occupancy, water, ice] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    getLatestOccupancyByLocation(supabase),
    getLatestWaterByLocation(supabase),
    getLatestIceByLocation(supabase),
  ]);

  const openVisit = user ? await getOpenVisit(supabase, user.id) : null;

  return {
    locations: locations ?? [],
    occupancy,
    water,
    ice,
    openVisit,
  };
}
