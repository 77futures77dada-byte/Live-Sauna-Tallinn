import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export interface ReputationSummary {
  reportsCount: number;
  completedVisits: number;
  photosCount: number;
  reputation: number;
}

// Deliberately simple for MVP (docs/ARCHITECTURE.md Phase 3 section 3):
// computed on read from the existing tables rather than maintained as
// denormalized counters on profiles, so there's nothing to keep in sync.
// reputation = confirmed_reports for now — no other-user confirmation
// mechanic exists yet (that's Phase 4/5 if it's needed at all), so every
// report counts.
export async function getReputationSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ReputationSummary> {
  const [occupancy, water, ice, visits, photos] = await Promise.all([
    supabase
      .from("occupancy_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("water_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("ice_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .not("rating", "is", null),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const reportsCount = (occupancy.count ?? 0) + (water.count ?? 0) + (ice.count ?? 0);
  const completedVisits = visits.count ?? 0;
  const photosCount = photos.count ?? 0;

  return {
    reportsCount,
    completedVisits,
    photosCount,
    reputation: reportsCount * 1 + completedVisits * 2 + photosCount * 1,
  };
}
