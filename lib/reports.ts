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
