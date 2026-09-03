import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { createServiceClient } from "./supabase/service";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const HOUR_MS = 60 * 60_000;

// Bookings are hour-aligned slots — see docs/ARCHITECTURE.md section 9.5.
// "On the hour" keeps the QR check-in match (findFulfillableBooking) a
// simple range check instead of needing fuzzy time windows.
export function isHourAligned(date: Date): boolean {
  return date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

// Upcoming hour-aligned slots for the booking form's picker, starting at
// the current hour (so a visitor can book "now" and check in immediately —
// findFulfillableBooking only requires the check-in to land before the
// slot's end_time, which the current hour still satisfies).
export function nextHourSlots(count: number, from: Date = new Date()): Date[] {
  const first = new Date(from);
  first.setUTCMinutes(0, 0, 0);

  return Array.from({ length: count }, (_, i) => new Date(first.getTime() + i * HOUR_MS));
}

// Indexed to match Date#getDay() (0 = Sunday). opening_hours values are the
// venue's local wall-clock time, e.g. {"mon": "07:00-21:00"} — same
// convention LocationCard uses to display them.
const openingHoursWeekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function isWithinOpeningHours(date: Date, openingHours: Record<string, string> | null): boolean {
  if (!openingHours) return true;
  const range = openingHours[openingHoursWeekdayKeys[date.getDay()]];
  if (!range) return false;

  const [start, end] = range.split("-");
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutesOfDay = date.getHours() * 60 + date.getMinutes();

  return minutesOfDay >= startHour * 60 + startMinute && minutesOfDay < endHour * 60 + endMinute;
}

// Upcoming hour-aligned slots for the booking form's picker, restricted to a
// location's opening_hours when known. null means no known schedule (e.g.
// Harku's public saunas, seeded without one — see
// supabase/migrations/0003_seed_locations.sql) and is treated as always
// open, matching the previous unfiltered behavior. Looks up to two weeks
// ahead for `count` open slots; if opening_hours is too narrow to find any
// within that window, falls back to unfiltered hours rather than leaving
// the picker empty.
export function nextOpenHourSlots(
  count: number,
  openingHours: Record<string, string> | null,
  from: Date = new Date(),
): Date[] {
  if (!openingHours) return nextHourSlots(count, from);

  const first = new Date(from);
  first.setUTCMinutes(0, 0, 0);

  const open: Date[] = [];
  const maxLookaheadHours = 24 * 14;
  for (let i = 0; open.length < count && i < maxLookaheadHours; i++) {
    const slot = new Date(first.getTime() + i * HOUR_MS);
    if (isWithinOpeningHours(slot, openingHours)) open.push(slot);
  }

  return open.length > 0 ? open : nextHourSlots(count, from);
}

// A booking that was never checked into by the time its hour ended is a
// no-show. No worker needed for MVP (docs/ARCHITECTURE.md section 9.5) —
// this just flips any of the caller's own stale 'confirmed' rows to
// 'no_show' right before they're read, via the normal RLS-scoped client
// (bookings_update_own_or_admin already permits it).
async function expireStaleBookings(
  supabase: SupabaseClient<Database>,
  userId: string,
  locationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .eq("status", "confirmed")
    .lt("end_time", new Date().toISOString());

  if (error) throw error;
}

// Used by GET /api/bookings — the caller's own bookings for one location,
// most recent first, with stale ones already corrected to 'no_show'.
export async function getUserBookingsForLocation(
  supabase: SupabaseClient<Database>,
  userId: string,
  locationId: string,
): Promise<Booking[]> {
  await expireStaleBookings(supabase, userId, locationId);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .order("start_time", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data ?? [];
}

// Called from app/api/visits (QR check-in). A booking only counts as
// fulfilled if the check-in happens inside its booked hour — see
// docs/ARCHITECTURE.md section 9.5.
export async function findFulfillableBooking(
  supabase: SupabaseClient<Database>,
  userId: string,
  locationId: string,
  now: Date = new Date(),
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .eq("status", "confirmed")
    .lte("start_time", now.toISOString())
    .gt("end_time", now.toISOString())
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fulfillBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  visitId: string,
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "fulfilled", visit_id: visitId })
    .eq("id", bookingId);

  if (error) throw error;
}

// How many people are already booked into each upcoming hour-aligned slot
// at a location, summed across *every* user — not just the caller. bookings
// is locked to "select own or admin" by RLS (0002_rls.sql) for good reason
// (a booking's people_count next to a start_time plus who's browsing could
// out someone's schedule), so this uses the service client to aggregate
// server-side and returns only start_time -> booked_people_count, never
// which user holds a given slot. Used both by the availability endpoint
// (so the booking form can show/gray out full slots) and by POST
// /api/bookings (so the server itself enforces capacity, not just the UI).
export async function getBookedCountsForSlots(
  locationId: string,
  from: Date = new Date(),
): Promise<Map<string, number>> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("bookings")
    .select("start_time, people_count")
    .eq("location_id", locationId)
    .in("status", ["confirmed", "fulfilled"])
    .gte("end_time", from.toISOString());

  if (error) {
    console.error("getBookedCountsForSlots failed", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = new Date(row.start_time).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + row.people_count);
  }
  return counts;
}
