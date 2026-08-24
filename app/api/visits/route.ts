import { NextResponse } from "next/server";
import { findFulfillableBooking, fulfillBooking } from "@/lib/bookings";
import { CHECKIN_RADIUS_METERS, haversineMeters } from "@/lib/geo";
import { isUserBanned } from "@/lib/moderation";
import { getOpenVisit } from "@/lib/visits";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

// POST /api/visits — starts a check-in ("I'm here"). One open visit per
// user at a time (docs/ARCHITECTURE.md Phase 3 section 1) — checked here
// at the API layer, same convention as the Phase 2 report rate limit.
//
// Multipart form: location_id, latitude, longitude (the browser's
// geolocation at the moment of check-in), file (a photo taken on the
// spot). Both are mandatory — this is the on-site presence check the
// whole app depends on, so there's no JSON-only fallback that skips them.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (await isUserBanned(supabase, user.id)) {
    return NextResponse.json({ error: "Your account is banned from checking in" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const locationId = form?.get("location_id");
  const latitudeRaw = form?.get("latitude");
  const longitudeRaw = form?.get("longitude");
  const file = form?.get("file");

  if (typeof locationId !== "string") {
    return NextResponse.json({ error: "location_id (string) is required" }, { status: 400 });
  }

  const latitude = typeof latitudeRaw === "string" ? Number(latitudeRaw) : NaN;
  const longitude = typeof longitudeRaw === "string" ? Number(longitudeRaw) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "Your location is required to check in", code: "location_required" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A photo is required to check in", code: "photo_required" },
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
    .select("id, latitude, longitude")
    .eq("id", locationId)
    .maybeSingle();

  if (locationError || !location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const distance = haversineMeters(latitude, longitude, location.latitude, location.longitude);
  if (distance > CHECKIN_RADIUS_METERS) {
    return NextResponse.json(
      { error: "You don't appear to be at this location", code: "too_far" },
      { status: 403 },
    );
  }

  const openVisit = await getOpenVisit(supabase, user.id);
  if (openVisit) {
    return NextResponse.json(
      {
        error: "You already have an active visit. Finish it before starting a new one.",
        openVisit,
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("visits")
    .insert({ location_id: locationId, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to start visit" }, { status: 500 });
  }

  const path = `${user.id}/${data.id}/before.${extension}`;
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from("visit-photos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    await supabase.from("visits").delete().eq("id", data.id);
    return NextResponse.json({ error: "Failed to upload check-in photo" }, { status: 500 });
  }

  const { error: photoError } = await supabase.from("photos").insert({
    user_id: user.id,
    location_id: locationId,
    visit_id: data.id,
    type: "before",
    storage_url: path,
  });

  if (photoError) {
    await service.storage.from("visit-photos").remove([path]);
    await supabase.from("visits").delete().eq("id", data.id);
    return NextResponse.json({ error: "Failed to save check-in photo" }, { status: 500 });
  }

  // This check-in is the "QR confirmation" a booking needs to actually
  // hold a place — see docs/ARCHITECTURE.md section 9.5. Best-effort: a
  // failure here shouldn't fail the check-in itself, since the visit
  // already exists.
  let fulfilledBookingId: string | null = null;
  try {
    const booking = await findFulfillableBooking(supabase, user.id, locationId);
    if (booking) {
      await fulfillBooking(supabase, booking.id, data.id);
      fulfilledBookingId = booking.id;
    }
  } catch (bookingError) {
    console.error("POST /api/visits: booking fulfillment failed", bookingError);
  }

  return NextResponse.json({ ...data, fulfilled_booking_id: fulfilledBookingId }, { status: 201 });
}
