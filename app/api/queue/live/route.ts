import { NextResponse } from "next/server";
import { getQueueLiveByLocation } from "@/lib/queue";

// GET /api/queue/live — public per-location queue numbers, polled by the
// dashboard (MapScreen). Deliberately unauthenticated: the client's mockup
// (screen 4) is explicit that viewing the queue needs no account — an
// account is only needed to join it or to report occupancy. Contrast
// /api/occupancy/live, which is auth-gated.
//
// Aggregated server-side with the service role; returns per-location
// counts and a wait estimate only, never who is in a queue. `estimated_
// wait_minutes` is null when there isn't enough finished-visit history to
// estimate honestly (see lib/queue.ts).
export async function GET() {
  const counts = await getQueueLiveByLocation();
  return NextResponse.json(
    [...counts.entries()].map(([location_id, live]) => ({
      location_id,
      groups_ahead: live.groupsAhead,
      estimated_wait_minutes: live.estimatedWaitMinutes,
    })),
  );
}
