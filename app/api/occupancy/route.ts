import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const MAX_PEOPLE_COUNT = 500;

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
  const peopleCount = body?.people_count;

  if (
    typeof locationId !== "string" ||
    !Number.isInteger(peopleCount) ||
    peopleCount < 0 ||
    peopleCount > MAX_PEOPLE_COUNT
  ) {
    return NextResponse.json(
      { error: "location_id (string) and people_count (0-500 integer) are required" },
      { status: 400 },
    );
  }

  const { limited, retryAfterSeconds } = await checkReportRateLimit(
    supabase,
    "occupancy_reports",
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
    .from("occupancy_reports")
    .insert({ location_id: locationId, user_id: user.id, people_count: peopleCount })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
