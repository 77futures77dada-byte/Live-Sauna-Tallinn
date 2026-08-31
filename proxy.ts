import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request so server components
// always see a valid (non-expired) session. Required because proxy.ts runs
// before any Server Component and cookies set there can't be re-read by them.
export async function proxy(request: NextRequest) {
  // Demo mode toggle: ?demo=1 turns on the permanent "DEMO / TESTANDMED"
  // banner and ?demo=0 turns it off, persisted in a cookie so it survives
  // navigation. Done before the first NextResponse.next({ request }) below
  // so this same render already sees it (lib/demo.ts reads the cookie).
  // Intended for a separate preview deploy — never silent on production.
  const demoParam = request.nextUrl.searchParams.get("demo");
  const demoOff = demoParam === "0" || demoParam === "false";
  if (demoParam !== null) {
    if (demoOff) request.cookies.delete("demo");
    else request.cookies.set("demo", "1");
  }

  let response = NextResponse.next({ request });

  if (demoParam !== null) {
    if (demoOff) response.cookies.set("demo", "", { path: "/", maxAge: 0 });
    else response.cookies.set("demo", "1", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // NextResponse.next() above starts a fresh cookie jar — re-apply
          // the demo cookie so it isn't dropped when Supabase rotates the
          // session on the same request.
          if (demoParam !== null) {
            if (demoOff) response.cookies.set("demo", "", { path: "/", maxAge: 0 });
            else response.cookies.set("demo", "1", { path: "/", maxAge: 60 * 60 * 24 * 30 });
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
