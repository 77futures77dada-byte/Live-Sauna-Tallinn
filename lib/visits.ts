import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export interface OpenVisit {
  id: string;
  locationId: string;
  startedAt: string;
}

// Only one open (finished_at is null) visit per user at a time — see
// docs/ARCHITECTURE.md Phase 3 section 1. Used both to render the right
// state on LocationCard and to block starting a second visit in
// app/api/visits.
export async function getOpenVisit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OpenVisit | null> {
  const { data, error } = await supabase
    .from("visits")
    .select("id, location_id, started_at")
    .eq("user_id", userId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    locationId: data.location_id,
    startedAt: data.started_at,
  };
}
