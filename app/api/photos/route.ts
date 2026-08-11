import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_TYPES = ["before", "after"] as const;
const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

// POST /api/photos — multipart form: file, visit_id, type ('before'|'after').
//
// The visit-photos bucket has no Storage RLS policies at all (private,
// default-deny for anon/authenticated — verified against the live
// project), so authorization happens entirely here: check the caller
// owns visit_id via the normal RLS-scoped client, then use the
// service-role client only for the actual Storage write. See
// lib/supabase/service.ts.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const visitId = form?.get("visit_id");
  const type = form?.get("type");

  if (
    !(file instanceof File) ||
    typeof visitId !== "string" ||
    typeof type !== "string" ||
    !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])
  ) {
    return NextResponse.json(
      { error: "file, visit_id (string), and type (before/after) are required" },
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

  // Ownership check via the RLS-scoped client — visits_select_own_or_admin
  // means this returns null for a visit that isn't the caller's.
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, location_id, user_id")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (visitError || !visit) {
    return NextResponse.json({ error: "Visit not found or not yours" }, { status: 404 });
  }

  const path = `${user.id}/${visitId}/${type}.${extension}`;
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from("visit-photos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }

  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      location_id: visit.location_id,
      visit_id: visitId,
      type: type as "before" | "after",
      storage_url: path,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to save photo record" }, { status: 500 });
  }

  return NextResponse.json(photo, { status: 201 });
}
