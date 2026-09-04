import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { getGroupsAheadOf, getOpenQueueEntry } from "@/lib/queue";
import { createClient } from "@/lib/supabase/server";

// GET /api/queue — the caller's own place in a queue, if any, plus how
// many groups are ahead of them. Guests can't be in a queue, so this
// returns { entry: null } for them rather than 401 (the dashboard calls
// it unconditionally and shouldn't log an error for logged-out visitors).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ entry: null });
  }

  const entry = await getOpenQueueEntry(supabase, user.id);
  if (!entry) {
    return NextResponse.json({ entry: null });
  }

  const groupsAhead = await getGroupsAheadOf(entry.locationId, entry.joinedAt);
  return NextResponse.json({
    entry: {
      id: entry.id,
      location_id: entry.locationId,
      joined_at: entry.joinedAt,
      groups_ahead: groupsAhead,
    },
  });
}

// POST /api/queue — join a location's queue. JSON body: { location_id }.
// A light, authenticated action — no photo, no geolocation (that's the
// check-in, which is a different, stronger signal). One active entry per
// user at a time, same rule as an open visit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (await isUserBanned(supabase, user.id)) {
    return NextResponse.json({ error: "Your account is banned" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const locationId = body?.location_id;
  if (typeof locationId !== "string") {
    return NextResponse.json({ error: "location_id is required" }, { status: 400 });
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .maybeSingle();
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Expires stale entries first (inside getOpenQueueEntry), so a forgotten
  // one from yesterday doesn't wrongly block a new join.
  const existing = await getOpenQueueEntry(supabase, user.id);
  if (existing) {
    if (existing.locationId === locationId) {
      // Already queued here — idempotent, just hand the entry back.
      return NextResponse.json(
        { id: existing.id, location_id: existing.locationId, joined_at: existing.joinedAt },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "You're already in a queue at another sauna", openQueueEntry: existing },
      { status: 409 },
    );
  }

  const { data: entry, error } = await supabase
    .from("queue_entries")
    .insert({ location_id: locationId, user_id: user.id })
    .select("id, location_id, joined_at")
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: "Failed to join the queue" }, { status: 500 });
  }

  return NextResponse.json(entry, { status: 201 });
}

// DELETE /api/queue — leave whatever queue the caller is in. Sets left_at
// on their active entry; the RLS update policy scopes this to their own
// still-active row.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("queue_entries")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("left_at", null);

  if (error) {
    return NextResponse.json({ error: "Failed to leave the queue" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
