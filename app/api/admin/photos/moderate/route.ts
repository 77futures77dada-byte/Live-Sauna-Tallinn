import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_ACTIONS = ["approve", "reject"] as const;

// POST /api/admin/photos/moderate — {photo_id, action: 'approve'|'reject'}.
// No separate "rejected" state exists on photos (just moderated
// boolean), so reject means delete — both the row and the Storage object,
// since a rejected photo shouldn't linger in the private bucket either.
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
  const photoId = body?.photo_id;
  const action = body?.action;

  if (typeof photoId !== "string" || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `photo_id (string) and action (${VALID_ACTIONS.join("/")}) are required` },
      { status: 400 },
    );
  }

  if (action === "approve") {
    const { error } = await supabase.from("photos").update({ moderated: true }).eq("id", photoId);
    if (error) {
      return NextResponse.json({ error: "Failed to approve photo" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // reject: delete both the Storage object and the row. RLS only has a
  // "delete own" policy on photos (no admin-delete policy — see
  // 0002_rls.sql), so this needs the service-role client, not the authed
  // one used everywhere else in this route.
  const service = createServiceClient();
  const { data: photo } = await service.from("photos").select("storage_url").eq("id", photoId).maybeSingle();

  if (photo?.storage_url) {
    await service.storage.from("visit-photos").remove([photo.storage_url]);
  }

  const { error } = await service.from("photos").delete().eq("id", photoId);
  if (error) {
    return NextResponse.json({ error: "Failed to reject photo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
