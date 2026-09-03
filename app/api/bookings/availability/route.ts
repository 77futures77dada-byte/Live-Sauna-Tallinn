import { NextResponse } from "next/server";
import { getBookedCountsForSlots } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";

// GET /api/bookings/availability?location_id=<uuid> — how many people are
// already booked into each upcoming hour, summed across every user. Unlike
// GET /api/bookings (the caller's own bookings, for their own history
// list), this is the aggregate the booking form needs to show — and the
// server needs to enforce — "this slot is already full", without exposing
// whose bookings they are.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  if (!locationId) {
    return NextResponse.json({ error: "location_id is required" }, { status: 400 });
  }

  const counts = await getBookedCountsForSlots(locationId);
  return NextResponse.json(
    [...counts.entries()].map(([start_time, booked_people_count]) => ({ start_time, booked_people_count })),
  );
}
