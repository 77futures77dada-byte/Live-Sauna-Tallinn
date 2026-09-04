import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import {
  getLatestIceByLocation,
  getLatestOccupancyByLocation,
  getLatestWaterByLocation,
} from "./reports";
import { getOpenVisit, getOpenVisitCountsByLocation } from "./visits";
import { getOpenQueueEntry, getQueueLiveByLocation } from "./queue";

// Shared by app/(map)/page.tsx and app/location/[slug]/page.tsx — both
// render the same MapScreen, just with a different initial focus.
//
// `occupancy` here is the raw crowdsourced map, and `verifiedPresence` is
// the raw verified-checked-in-count map — deliberately returned separately,
// unmerged. MapScreen folds them together for display via
// mergeVerifiedPresence, but keeps both raw sources in state so later
// updates (a new manual report, a poll of live check-ins) each replace
// only their own source rather than compounding on top of an
// already-merged number. See mergeVerifiedPresence's comment for why that
// matters.
export async function getMapPageData(supabase: SupabaseClient<Database>, user: User | null) {
  const [{ data: locations }, occupancy, water, ice, verifiedPresence, queue] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    getLatestOccupancyByLocation(supabase),
    getLatestWaterByLocation(supabase),
    getLatestIceByLocation(supabase),
    getOpenVisitCountsByLocation(),
    getQueueLiveByLocation(),
  ]);

  // The viewer's own queue place / open visit — both need the RLS client
  // and a user, both null for guests (who can still see the aggregate
  // `queue` numbers above).
  const [openVisit, openQueueEntry] = user
    ? await Promise.all([getOpenVisit(supabase, user.id), getOpenQueueEntry(supabase, user.id)])
    : [null, null];

  return {
    locations: locations ?? [],
    occupancy,
    water,
    ice,
    openVisit,
    verifiedPresence,
    queue,
    openQueueEntry,
  };
}
