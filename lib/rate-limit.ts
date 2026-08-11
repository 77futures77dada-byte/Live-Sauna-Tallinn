import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

const RATE_LIMIT_MS = 5 * 60_000;

type ReportTable = "occupancy_reports" | "water_reports" | "ice_reports";

// Checked at the API layer (not the DB) per docs/ARCHITECTURE.md section 4:
// one report per user per location every 5 minutes, based on that user's
// own last report for that location.
export async function checkReportRateLimit(
  supabase: SupabaseClient<Database>,
  table: ReportTable,
  userId: string,
  locationId: string,
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { limited: false };

  const elapsedMs = Date.now() - new Date(data.created_at).getTime();
  if (elapsedMs >= RATE_LIMIT_MS) return { limited: false };

  return {
    limited: true,
    retryAfterSeconds: Math.ceil((RATE_LIMIT_MS - elapsedMs) / 1000),
  };
}
