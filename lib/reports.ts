import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, IceCondition } from "./supabase/types";

// Anything older than this is "unknown" freshness anyway (see
// lib/freshness.ts), so there's no reason to fetch it.
const RECENT_WINDOW_MINUTES = 60;

function recentCutoffIso() {
  return new Date(Date.now() - RECENT_WINDOW_MINUTES * 60_000).toISOString();
}

export interface LatestOccupancy {
  locationId: string;
  peopleCount: number;
  createdAt: string;
}

export interface LatestWater {
  locationId: string;
  temperature: number;
  createdAt: string;
}

export interface LatestIce {
  locationId: string;
  condition: IceCondition;
  createdAt: string;
}

async function getLatestByLocation<Row extends { location_id: string; created_at: string }>(
  supabase: SupabaseClient<Database>,
  table: "occupancy_reports" | "water_reports" | "ice_reports",
  columns: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .gte("created_at", recentCutoffIso())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

function toLatestMap<Row extends { location_id: string; created_at: string }, T>(
  rows: Row[],
  map: (row: Row) => T,
): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (!latest.has(row.location_id)) {
      latest.set(row.location_id, map(row));
    }
  }
  return latest;
}

export async function getLatestOccupancyByLocation(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, LatestOccupancy>> {
  const rows = await getLatestByLocation<{
    location_id: string;
    people_count: number;
    created_at: string;
  }>(supabase, "occupancy_reports", "location_id, people_count, created_at");

  return toLatestMap(rows, (row) => ({
    locationId: row.location_id,
    peopleCount: row.people_count,
    createdAt: row.created_at,
  }));
}

export async function getLatestWaterByLocation(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, LatestWater>> {
  const rows = await getLatestByLocation<{
    location_id: string;
    temperature: number;
    created_at: string;
  }>(supabase, "water_reports", "location_id, temperature, created_at");

  return toLatestMap(rows, (row) => ({
    locationId: row.location_id,
    temperature: row.temperature,
    createdAt: row.created_at,
  }));
}

// Folds a location's real, geofence-and-photo-verified "checked in right
// now" headcount (lib/visits.ts's getOpenVisitCountsByLocation) into the
// crowdsourced occupancy_reports numbers above. A verified count is ground
// truth, not a self-report — but its absence isn't proof nobody's there
// (plenty of visitors won't check in through the app), so this only ever
// raises the shown number, never lowers or replaces a manual report:
// peopleCount is the max of the two, and the timestamp is bumped to "now"
// only when the verified count is the new maximum (>= the prior count) —
// not merely when it's above zero — so a manual report that stays larger
// keeps its own, older timestamp and freshness reflects that live signal
// only when it genuinely moved the number. Callers must pass a fresh,
// unmerged `reported` map
// each time (see MapScreen) — merging the previous merge's *output* back
// in would let a stale verified count ratchet the displayed number up
// forever, since max() can never come back down once inflated.
export function mergeVerifiedPresence(
  reported: Map<string, LatestOccupancy>,
  verifiedCounts: Map<string, number>,
): Map<string, LatestOccupancy> {
  const merged = new Map(reported);
  const now = new Date().toISOString();

  for (const [locationId, verifiedCount] of verifiedCounts) {
    if (verifiedCount <= 0) continue;
    const existing = merged.get(locationId);
    const priorCount = existing?.peopleCount ?? 0;
    merged.set(locationId, {
      locationId,
      peopleCount: Math.max(priorCount, verifiedCount),
      createdAt: verifiedCount >= priorCount ? now : (existing?.createdAt ?? now),
    });
  }

  return merged;
}

export async function getLatestIceByLocation(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, LatestIce>> {
  const rows = await getLatestByLocation<{
    location_id: string;
    condition: IceCondition;
    created_at: string;
  }>(supabase, "ice_reports", "location_id, condition, created_at");

  return toLatestMap(rows, (row) => ({
    locationId: row.location_id,
    condition: row.condition,
    createdAt: row.created_at,
  }));
}
