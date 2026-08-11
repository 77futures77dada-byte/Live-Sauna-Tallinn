import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/locations — update one location's editable fields.
// locations_admin_write (0002_rls.sql) already restricts writes to
// is_admin() at the RLS layer; this check just gives a clean 403 instead
// of a murky RLS-denial error.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;

  if (typeof id !== "string") {
    return NextResponse.json({ error: "id (string) is required" }, { status: 400 });
  }

  const name = body?.name;
  const description = body?.description;
  const capacityRaw = body?.capacity;
  const openingHoursRaw = body?.opening_hours;
  const bookingEnabled = body?.booking_enabled;
  const isFree = body?.is_free;

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name (non-empty string) is required" }, { status: 400 });
  }
  if (typeof bookingEnabled !== "boolean" || typeof isFree !== "boolean") {
    return NextResponse.json(
      { error: "booking_enabled and is_free (booleans) are required" },
      { status: 400 },
    );
  }

  let capacity: number | null = null;
  if (capacityRaw !== null && capacityRaw !== undefined && capacityRaw !== "") {
    const parsed = Number(capacityRaw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json({ error: "capacity must be a non-negative integer or empty" }, { status: 400 });
    }
    capacity = parsed;
  }

  let openingHours: Record<string, string> | null = null;
  if (typeof openingHoursRaw === "string" && openingHoursRaw.trim() !== "") {
    try {
      const parsed = JSON.parse(openingHoursRaw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed) ||
        Object.values(parsed).some((v) => typeof v !== "string")
      ) {
        throw new Error("not a flat string map");
      }
      openingHours = parsed;
    } catch {
      return NextResponse.json(
        { error: 'opening_hours must be valid JSON like {"mon":"07:00-21:00"} or empty' },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("locations")
    .update({
      name: name.trim(),
      description: typeof description === "string" && description.trim() !== "" ? description.trim() : null,
      capacity,
      opening_hours: openingHours,
      booking_enabled: bookingEnabled,
      is_free: isFree,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }

  return NextResponse.json(data);
}
