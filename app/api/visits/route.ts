import { NextResponse } from "next/server";
import { isUserBanned } from "@/lib/moderation";
import { getOpenVisit } from "@/lib/visits";
import { createClient } from "@/lib/supabase/server";

// POST /api/visits — starts a check-in ("I'm here"). One open visit per
// user at a time (docs/ARCHITECTURE.md Phase 3 section 1) — checked here
// at the API layer, same convention as the Phase 2 report rate limit.
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

  const body = await request.json().catch(() => null);
  const locationId = body?.location_id;

  if (typeof locationId !== "string") {
    return NextResponse.json({ error: "location_id (string) is required" }, { status: 400 });
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

  return NextResponse.json(data, { status: 201 });
}
