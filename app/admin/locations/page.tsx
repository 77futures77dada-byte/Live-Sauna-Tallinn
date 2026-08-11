import { LocationsAdminTable } from "@/components/admin/LocationsAdminTable";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLocationsPage() {
  const supabase = await createClient();
  const { data: locations } = await supabase.from("locations").select("*").order("name");

  return (
    <div>
      <h1 className="text-xl font-semibold">Locations</h1>
      <LocationsAdminTable locations={locations ?? []} />
    </div>
  );
}
