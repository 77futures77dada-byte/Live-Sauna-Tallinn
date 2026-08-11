"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocationCard } from "@/components/location/LocationCard";
import type { Database } from "@/lib/supabase/types";

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

export function MapScreen({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<Location | null>(null);

  return (
    <div className="relative min-h-0 w-full flex-1">
      <MapView locations={locations} onSelect={setSelected} />
      {selected && (
        <LocationCard
          key={selected.id}
          location={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
