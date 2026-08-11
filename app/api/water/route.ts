import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const MIN_TEMPERATURE = -5;
const MAX_TEMPERATURE = 40;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (await isUserBanned(supabase, user.id)) {
    return NextResponse.json({ error: "Your account is banned from posting" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const locationId = body?.location_id;
  const temperature = body?.temperature;

  if (
    typeof locationId !== "string" ||
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    temperature < MIN_TEMPERATURE ||
    temperature > MAX_TEMPERATURE
  ) {
    return NextResponse.json(
      { error: `location_id (string) and temperature (${MIN_TEMPERATURE}-${MAX_TEMPERATURE} number) are required` },
      { status: 400 },
    );
  }

  const { limited, retryAfterSeconds } = await checkReportRateLimit(
    supabase,
    "water_reports",
    user.id,
    locationId,
  );
  if (limited) {
    return NextResponse.json(
      { error: `You can only report once every 5 minutes for this location. Try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("water_reports")
    .insert({ location_id: locationId, user_id: user.id, temperature, source: "user" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
