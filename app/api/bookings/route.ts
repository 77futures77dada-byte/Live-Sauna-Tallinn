import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { isHourAligned, getBookedCountsForSlots, getUserBookingsForLocation } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";

// GET /api/bookings?location_id=<uuid> — the caller's own bookings for one
// location (lazily expired to 'no_show' first — see lib/bookings.ts).
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

  const bookings = await getUserBookingsForLocation(supabase, user.id, locationId);
  return NextResponse.json(bookings);
}

// POST /api/bookings — JSON body: location_id, start_time (ISO,
// hour-aligned), people_count.
//
// No payment in MVP, so a booking is confirmed the moment it's created — see
// docs/ARCHITECTURE.md section 9.5. There's no verification photo at this
// step: presence is confirmed later, on site, by the check-in flow's own
// geolocation + before-photo requirement (and again by the after-photo at
// visit finish) — a booking made remotely, ahead of the visit, can't
// produce an "on site" photo anyway.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (await isUserBanned(supabase, user.id)) {
    return NextResponse.json({ error: "Your account is banned from booking" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const locationId = body?.location_id;
  const startTimeRaw = body?.start_time;
  const peopleCountRaw = body?.people_count;

  if (
    typeof locationId !== "string" ||
    typeof startTimeRaw !== "string" ||
    (typeof peopleCountRaw !== "string" && typeof peopleCountRaw !== "number")
  ) {
    return NextResponse.json(
      { error: "location_id, start_time, and people_count are required" },
      { status: 400 },
    );
  }

  const peopleCount = Number(peopleCountRaw);
  if (!Number.isInteger(peopleCount) || peopleCount < 1) {
    return NextResponse.json({ error: "people_count must be a positive integer" }, { status: 400 });
  }

  const startTime = new Date(startTimeRaw);
  if (Number.isNaN(startTime.getTime()) || !isHourAligned(startTime)) {
    return NextResponse.json(
      { error: "start_time must be a valid, hour-aligned ISO timestamp" },
      { status: 400 },
    );
  }
  const endTime = new Date(startTime.getTime() + 60 * 60_000);
  if (endTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: "start_time's hour has already ended" }, { status: 400 });
  }

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, capacity, booking_enabled")
    .eq("id", locationId)
    .maybeSingle();

  if (locationError || !location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  if (!location.booking_enabled) {
    return NextResponse.json({ error: "Booking is not enabled for this location" }, { status: 400 });
  }
  if (location.capacity !== null && peopleCount > location.capacity) {
    return NextResponse.json(
      { error: `people_count exceeds this location's capacity (${location.capacity})` },
      { status: 400 },
    );
  }

  // Enforced here, not just in the form: two people booking the same hour
  // from two different devices must not both succeed past capacity. Sums
  // every user's confirmed/fulfilled bookings for this exact slot — see
  // getBookedCountsForSlots for why this needs the service client instead
  // of the RLS-scoped one above.
  if (location.capacity !== null) {
    const booked = await getBookedCountsForSlots(locationId, startTime);
    const alreadyBooked = booked.get(startTime.toISOString()) ?? 0;
    if (alreadyBooked + peopleCount > location.capacity) {
      const remaining = Math.max(0, location.capacity - alreadyBooked);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Only ${remaining} of ${location.capacity} spots left in that hour`
              : "That time slot is fully booked",
        },
        { status: 409 },
      );
    }
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      location_id: locationId,
      user_id: user.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      people_count: peopleCount,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  return NextResponse.json(booking, { status: 201 });
}
