import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

// profiles_select_all is a public RLS policy (see 0002_rls.sql), so this
// works fine through the normal RLS-scoped client — no service role
// needed just to check the flag.
export async function isAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_admin ?? false;
}
