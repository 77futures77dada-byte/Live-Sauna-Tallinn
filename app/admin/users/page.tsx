import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Read-only per docs/ARCHITECTURE.md Phase 4a section 3 ("базовая
// таблица") — the ban action lives on /admin/reports, in context of the
// reports that prompted it. Email comes from auth.users via the admin
// API (service role) since profiles doesn't store it and regular
// clients can't read auth.users at all.
export default async function AdminUsersPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "—"]));

  return (
    <div>
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="pb-2 pr-3">Username</th>
              <th className="pb-2 pr-3">Email</th>
              <th className="pb-2 pr-3">Reputation</th>
              <th className="pb-2 pr-3">Banned</th>
              <th className="pb-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => (
              <tr key={profile.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3">{profile.username}</td>
                <td className="py-2 pr-3 text-zinc-500">{emailById.get(profile.id) ?? "—"}</td>
                <td className="py-2 pr-3">{profile.reputation}</td>
                <td className="py-2 pr-3">{profile.is_banned ? "Yes" : "—"}</td>
                <td className="py-2">{profile.is_admin ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
