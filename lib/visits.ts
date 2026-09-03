import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { createServiceClient } from "./supabase/service";

export interface OpenVisit {
  id: string;
  locationId: string;
  startedAt: string;
}

// Official maximum session is 3 hours (Haabersti rules); 4 gives an hour
// of grace before the app force-closes a visit the user forgot to finish.
const VISIT_MAX_AGE_MS = 4 * 60 * 60_000;

// A visit that's never finished manually stays finished_at IS NULL
// forever, and the "one open visit per user" rule (below) then blocks the
// user from checking in anywhere else indefinitely. No worker exists, so
// — same lazy pattern as expireStaleBookings in lib/bookings.ts — flip
// the caller's own stale open visits to closed right before they're read.
// finished_at + auto_closed satisfy the visits_update_own_while_open RLS
// policy (owner, still open). rating/crowd_level stay null, so an
// auto-closed visit never counts toward reputation (lib/reputation.ts).
export async function expireStaleVisits(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - VISIT_MAX_AGE_MS).toISOString();
  const { error } = await supabase
    .from("visits")
    .update({ finished_at: new Date().toISOString(), auto_closed: true })
    .eq("user_id", userId)
    .is("finished_at", null)
    .lt("started_at", cutoff);

  // Best-effort: this runs on the hot path of every open-visit read
  // (getOpenVisit, below). A failure here — e.g. migration 0010 not yet
  // applied — must not take down the map page; the stale visit just isn't
  // cleared this time around.
  if (error) console.error("expireStaleVisits failed", error);
}

// Only one open (finished_at is null) visit per user at a time — see
// docs/ARCHITECTURE.md Phase 3 section 1. Used both to render the right
// state on LocationCard and to block starting a second visit in
// app/api/visits.
export async function getOpenVisit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OpenVisit | null> {
  await expireStaleVisits(supabase, userId);

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

// The real, verified "here right now" headcount per location — one open
// (finished_at is null) visit row is one person confirmed on site by
// geolocation + photo, not a self-report. visits is locked to "select own
// or admin" by RLS (0002_rls.sql), so a location's live headcount would
// otherwise be invisible to everyone except the person currently checked
// in there — this uses the service client to aggregate across all users,
// but only ever returns a per-location count, never who's there. Filters
// out anything past VISIT_MAX_AGE_MS itself rather than relying on
// expireStaleVisits, which only runs lazily against the *reading* user's
// own rows and would otherwise let a forgotten open visit inflate this
// count indefinitely for everyone else.
export async function getOpenVisitCountsByLocation(): Promise<Map<string, number>> {
  const cutoff = new Date(Date.now() - VISIT_MAX_AGE_MS).toISOString();
  const service = createServiceClient();

  const { data, error } = await service
    .from("visits")
    .select("location_id")
    .is("finished_at", null)
    .gte("started_at", cutoff);

  if (error) {
    // Best-effort, same convention as expireStaleVisits above — a failure
    // here must not take down the map page, just means this poll/render
    // falls back to crowdsourced-only numbers.
    console.error("getOpenVisitCountsByLocation failed", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.location_id, (counts.get(row.location_id) ?? 0) + 1);
  }
  return counts;
}
