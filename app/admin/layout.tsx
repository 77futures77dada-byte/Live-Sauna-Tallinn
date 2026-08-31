import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// Server-side gate for the whole /admin tree — checked here, not just
// hidden in the UI, per docs/ARCHITECTURE.md Phase 4a section 3.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await isAdmin(supabase, user.id);
  if (!admin) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-zinc-100 pb-3 text-sm dark:border-zinc-800">
        <Link href="/admin/locations" className="hover:underline">
          Locations
        </Link>
        <Link href="/admin/reports" className="hover:underline">
          Reports &amp; Photos
        </Link>
        <Link href="/admin/visits" className="hover:underline">
          Visits
        </Link>
        <Link href="/admin/users" className="hover:underline">
          Users
        </Link>
        <Link href="/" className="ml-auto text-zinc-400 hover:underline">
          ← Map
        </Link>
      </nav>
      {children}
    </div>
  );
}
