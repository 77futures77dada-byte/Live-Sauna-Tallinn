import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

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
