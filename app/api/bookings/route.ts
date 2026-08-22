import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { isHourAligned, getUserBookingsForLocation } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

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

// POST /api/bookings — multipart form: location_id, start_time (ISO,
// hour-aligned), people_count, file (verification photo).
//
// No payment in MVP, so a booking is confirmed the moment it's created —
// but only once a verification photo is attached, per
// docs/ARCHITECTURE.md section 9.5. The photo is validated *before* the
// booking row is inserted so a rejected upload never leaves a bare
// booking behind; a booking row is only deleted afterwards if the
// Storage write or photo insert itself fails (best-effort cleanup, same
// non-transactional style as app/api/photos).
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

  const form = await request.formData().catch(() => null);
  const locationId = form?.get("location_id");
  const startTimeRaw = form?.get("start_time");
  const peopleCountRaw = form?.get("people_count");
  const file = form?.get("file");

  if (
    typeof locationId !== "string" ||
    typeof startTimeRaw !== "string" ||
    typeof peopleCountRaw !== "string"
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

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A verification photo is required to confirm a booking" },
      { status: 400 },
    );
  }
  const extension = EXTENSION_BY_MIME[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is larger than 10MB" }, { status: 400 });
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

  const path = `${user.id}/booking/${booking.id}/verification.${extension}`;
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from("visit-photos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    await supabase.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json({ error: "Failed to upload verification photo" }, { status: 500 });
  }

  const { error: photoError } = await supabase.from("photos").insert({
    user_id: user.id,
    location_id: locationId,
    booking_id: booking.id,
    type: "booking_verification",
    storage_url: path,
  });

  if (photoError) {
    await service.storage.from("visit-photos").remove([path]);
    await supabase.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json({ error: "Failed to save verification photo" }, { status: 500 });
  }

  return NextResponse.json(booking, { status: 201 });
}
