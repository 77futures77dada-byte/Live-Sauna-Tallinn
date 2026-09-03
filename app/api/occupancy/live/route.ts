import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenVisitCountsByLocation } from "@/lib/visits";

// GET /api/occupancy/live — the verified "here right now" headcount per
// location, aggregated from open (checked-in, not yet finished) visits.
// This is what MapScreen polls so a check-in shows up for *other* people's
// devices too: visits rows are RLS-locked to their own owner (0002_rls.sql),
// and Supabase Realtime enforces that same RLS on postgres_changes, so a
// client-side subscription to the visits table would never deliver another
// user's check-in event. Polling this route (which aggregates server-side
// with the service role) is the only way that live signal reaches anyone
// else — it returns per-location counts only, never which user.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const counts = await getOpenVisitCountsByLocation();
  return NextResponse.json(
    [...counts.entries()].map(([location_id, people_count]) => ({ location_id, people_count })),
  );
}
