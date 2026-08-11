import { NextResponse } from "next/server";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const VALID_CONDITIONS = ["none", "partial", "frozen"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const locationId = body?.location_id;
  const condition = body?.condition;

  if (
    typeof locationId !== "string" ||
    !VALID_CONDITIONS.includes(condition)
  ) {
    return NextResponse.json(
      { error: `location_id (string) and condition (${VALID_CONDITIONS.join("/")}) are required` },
      { status: 400 },
    );
  }

  const { limited, retryAfterSeconds } = await checkReportRateLimit(
    supabase,
    "ice_reports",
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
    .from("ice_reports")
    .insert({ location_id: locationId, user_id: user.id, condition })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
