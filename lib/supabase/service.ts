import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only client using the service role key — bypasses RLS entirely.
// Never import this into a Client Component. Used where authorization is
// checked in application code instead of Postgres RLS (e.g. Storage: the
// visit-photos bucket has no client-facing policies at all, so every
// upload/signed-URL request goes through a Route Handler that checks
// ownership itself before touching Storage — see app/api/photos).
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
