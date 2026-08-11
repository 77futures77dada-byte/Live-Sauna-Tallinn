import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_CROWD_LEVELS = ["low", "medium", "high"] as const;

// POST /api/visits/finish — closes the caller's own open visit with a
// rating + crowd level. RLS (0002_rls.sql, visits_update_own_while_open)
// already restricts updates to the owner while finished_at is null; the
// user_id/finished_at filters here just let us tell "not found" from
// "not yours" apart for a clearer response.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const visitId = body?.visit_id;
  const rating = body?.rating;
  const crowdLevel = body?.crowd_level;

  if (
    typeof visitId !== "string" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !VALID_CROWD_LEVELS.includes(crowdLevel)
  ) {
    return NextResponse.json(
      {
        error: `visit_id (string), rating (1-5 integer), and crowd_level (${VALID_CROWD_LEVELS.join("/")}) are required`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("visits")
    .update({ finished_at: new Date().toISOString(), rating, crowd_level: crowdLevel })
    .eq("id", visitId)
    .eq("user_id", user.id)
    .is("finished_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Visit not found, not yours, or already finished" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
