import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { createServiceClient } from "./supabase/service";

export interface OpenQueueEntry {
  id: string;
  locationId: string;
  joinedAt: string;
}

// Per-location live queue numbers, as shown on the dashboard and the
// detail card. `estimatedWaitMinutes` is null whenever there isn't enough
// finished-visit history to estimate honestly (see getQueueLiveByLocation)
// — the UI then shows "N groups ahead" with no minutes rather than a
// made-up figure.
export interface QueueLive {
  groupsAhead: number;
  estimatedWaitMinutes: number | null;
}

// A group that joined the queue and then neither checked in nor left is
// closed after this long. The official session is up to 3h, but nobody
// waits in a queue for 3h — 90min is a generous ceiling on "still
// actually waiting". Mirrors VISIT_MAX_AGE_MS in lib/visits.ts.
const QUEUE_MAX_AGE_MS = 90 * 60_000;

// Ignore visit rows whose duration is nonsense (clock skew, a visit left
// open until auto-close at 4h) when averaging — see getQueueLiveByLocation.
const MAX_PLAUSIBLE_VISIT_MINUTES = 3 * 60;
const WAIT_HISTORY_DAYS = 14;
const MIN_SAMPLES_FOR_ESTIMATE = 5;

// A queue entry that's never resolved stays left_at IS NULL forever and
// would keep inflating the public "groups ahead" count for everyone. No
// worker exists — same lazy pattern as expireStaleVisits / expireStale
// Bookings: close the caller's own stale entries right before they're
// read. The update satisfies queue_entries_update_own_while_active (owner,
// still active).
export async function expireStaleQueueEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - QUEUE_MAX_AGE_MS).toISOString();
  const { error } = await supabase
    .from("queue_entries")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("left_at", null)
    .lt("joined_at", cutoff);

  // Best-effort: runs on the hot path of every queue read. A failure here
  // (e.g. migration 0012 not yet applied) must not take down the page.
  if (error) console.error("expireStaleQueueEntries failed", error);
}

// The caller's current place in a queue, if any — one active entry per
// user at a time, same rule as getOpenVisit. Expires the caller's stale
// entries first, so a forgotten one doesn't block them from re-joining.
export async function getOpenQueueEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OpenQueueEntry | null> {
  await expireStaleQueueEntries(supabase, userId);

  const { data, error } = await supabase
    .from("queue_entries")
    .select("id, location_id, joined_at")
    .eq("user_id", userId)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Deliberately non-throwing, unlike getOpenVisit: this sits on the map
  // page's SSR path (getMapPageData) and the queue feature ships ahead of
  // its migration (0012) being applied — a missing table must degrade to
  // "not in a queue", not 500 the dashboard.
  if (error) {
    console.error("getOpenQueueEntry failed", error);
    return null;
  }
  if (!data) return null;

  return { id: data.id, locationId: data.location_id, joinedAt: data.joined_at };
}

// How many groups joined a location's queue before `joinedAt` and are
// still active — the caller's own "N groups ahead of you". Needs the
// service client: queue_entries is RLS-locked to its owner, so the caller
// can't see anyone else's row to count them. Returns a count only.
export async function getGroupsAheadOf(locationId: string, joinedAt: string): Promise<number> {
  const service = createServiceClient();
  const { count, error } = await service
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .is("left_at", null)
    .lt("joined_at", joinedAt);

  if (error) {
    console.error("getGroupsAheadOf failed", error);
    return 0;
  }
  return count ?? 0;
}

// Closes the caller's active queue entry at a location once they check in
// there — the queue did its job. Best-effort, called from POST /api/visits
// the same way a check-in fulfils a booking (findFulfillableBooking /
// fulfillBooking). Uses the RLS client: it's the caller's own row.
export async function closeQueueEntryOnCheckIn(
  supabase: SupabaseClient<Database>,
  userId: string,
  locationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("queue_entries")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .is("left_at", null);

  if (error) console.error("closeQueueEntryOnCheckIn failed", error);
}

// The public per-location queue numbers. Aggregated with the service role
// (queue_entries is owner-only under RLS, so a location's queue length is
// otherwise invisible to everyone but the people in it) and returned
// without any user attribution — a location -> {groupsAhead, wait} map,
// only for locations that currently have someone waiting.
//
// The wait estimate is a heuristic, not a promise: groups ahead times the
// mean duration of *finished* visits at that location over the last two
// weeks. A sauna serves one group at a time (first-come, first-served), so
// that product is the rough time until a slot frees up. If there are
// fewer than MIN_SAMPLES_FOR_ESTIMATE finished visits to average, the
// estimate is null and the UI shows the group count with no minutes —
// never a default number.
export async function getQueueLiveByLocation(): Promise<Map<string, QueueLive>> {
  const service = createServiceClient();

  const [{ data: entries, error: entriesError }, { data: visits, error: visitsError }] =
    await Promise.all([
      service.from("queue_entries").select("location_id").is("left_at", null),
      service
        .from("visits")
        .select("location_id, started_at, finished_at")
        .not("finished_at", "is", null)
        .gte("started_at", new Date(Date.now() - WAIT_HISTORY_DAYS * 24 * 60 * 60_000).toISOString()),
    ]);

  if (entriesError) {
    console.error("getQueueLiveByLocation: queue_entries read failed", entriesError);
    return new Map();
  }

  const groups = new Map<string, number>();
  for (const row of entries ?? []) {
    groups.set(row.location_id, (groups.get(row.location_id) ?? 0) + 1);
  }

  // Non-fatal: without visit history we just can't estimate minutes.
  const durations = new Map<string, number[]>();
  if (visitsError) {
    console.error("getQueueLiveByLocation: visits read failed", visitsError);
  } else {
    for (const row of visits ?? []) {
      if (!row.finished_at) continue;
      const minutes =
        (new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()) / 60_000;
      if (minutes > 0 && minutes <= MAX_PLAUSIBLE_VISIT_MINUTES) {
        const list = durations.get(row.location_id);
        if (list) list.push(minutes);
        else durations.set(row.location_id, [minutes]);
      }
    }
  }

  const result = new Map<string, QueueLive>();
  for (const [locationId, groupsAhead] of groups) {
    const sample = durations.get(locationId) ?? [];
    let estimatedWaitMinutes: number | null = null;
    if (groupsAhead > 0 && sample.length >= MIN_SAMPLES_FOR_ESTIMATE) {
      const avg = sample.reduce((sum, n) => sum + n, 0) / sample.length;
      // Round to the nearest 5 min so it reads as the estimate it is.
      estimatedWaitMinutes = Math.max(5, Math.round((groupsAhead * avg) / 5) * 5);
    }
    result.set(locationId, { groupsAhead, estimatedWaitMinutes });
  }
  return result;
}
