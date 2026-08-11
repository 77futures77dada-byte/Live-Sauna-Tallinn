"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocationCard } from "@/components/location/LocationCard";
import type { Database } from "@/lib/supabase/types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// react-leaflet touches `window`/`document` at module-eval time, so it
// can't be server-rendered — see docs/app/guides/lazy-loading in the
// bundled Next.js docs ("ssr: false is not allowed in Server Components").
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
      Loading map…
    </div>
  ),
});

export function MapScreen({
  locations,
  initialOccupancy,
  initialWater,
  initialIce,
  userId,
}: {
  locations: Location[];
  initialOccupancy: [string, LatestOccupancy][];
  initialWater: [string, LatestWater][];
  initialIce: [string, LatestIce][];
  userId: string | null;
}) {
  const [selected, setSelected] = useState<Location | null>(null);
  const [occupancy] = useState(() => new Map(initialOccupancy));
  const [water] = useState(() => new Map(initialWater));
  const [ice] = useState(() => new Map(initialIce));

  return (
    <div className="relative min-h-0 w-full flex-1">
      <MapView locations={locations} occupancy={occupancy} onSelect={setSelected} />
      {selected && (
        <LocationCard
          key={selected.id}
          location={selected}
          userId={userId}
          occupancy={occupancy.get(selected.id)}
          water={water.get(selected.id)}
          ice={ice.get(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
