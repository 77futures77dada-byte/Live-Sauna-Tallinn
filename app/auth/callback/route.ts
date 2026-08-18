import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the OAuth code Supabase redirects back with for a session
// cookie, then sends the user on to where they were headed. Email login
// uses OTP codes (verified client-side) rather than this route.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
