import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export async function isUserBanned(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_banned ?? false;
}
