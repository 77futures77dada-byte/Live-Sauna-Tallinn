import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/admin/users/ban — {user_id, banned: boolean}.
//
// profiles only grants the authenticated role column privileges on
// username/avatar_url (0002_rls.sql), and there's no RLS policy letting
// an admin UPDATE another user's row at all — both were scoped for the
// owner-editable fields from Phase 0, before is_banned existed. Rather
// than widen either for one column, this goes through the service-role
// client like the other admin-only mutations that fall outside what RLS
// currently allows (see app/api/admin/photos/moderate).
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
  const targetUserId = body?.user_id;
  const banned = body?.banned;

  if (typeof targetUserId !== "string" || typeof banned !== "boolean") {
    return NextResponse.json(
      { error: "user_id (string) and banned (boolean) are required" },
      { status: 400 },
    );
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "You can't ban yourself" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ is_banned: banned }).eq("id", targetUserId);

  if (error) {
    return NextResponse.json({ error: "Failed to update ban status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
