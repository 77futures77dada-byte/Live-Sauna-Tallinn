"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { LocationCard } from "@/components/location/LocationCard";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { OpenVisit } from "@/lib/visits";

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

// How often to force a re-render so freshness (high/medium/low/unknown)
// keeps decaying on screen even when no new report arrives — see
// lib/freshness.ts.
const FRESHNESS_TICK_MS = 60_000;

export function MapScreen({
  locations,
  initialOccupancy,
  initialWater,
  initialIce,
  userId,
  initialOpenVisit,
}: {
  locations: Location[];
  initialOccupancy: [string, LatestOccupancy][];
  initialWater: [string, LatestWater][];
  initialIce: [string, LatestIce][];
  userId: string | null;
  initialOpenVisit: OpenVisit | null;
}) {
  const [selected, setSelected] = useState<Location | null>(null);
  const [occupancy, setOccupancy] = useState(() => new Map(initialOccupancy));
  const [water, setWater] = useState(() => new Map(initialWater));
  const [ice, setIce] = useState(() => new Map(initialIce));
  const [openVisit, setOpenVisit] = useState(initialOpenVisit);
  const [, setTick] = useState(0);

  const openVisitLocationName = openVisit
    ? (locations.find((l) => l.id === openVisit.locationId)?.name ?? null)
    : null;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("live-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "occupancy_reports" },
        (payload: RealtimePostgresInsertPayload<{
          location_id: string;
          people_count: number;
          created_at: string;
        }>) => {
          const row = payload.new;
          setOccupancy((prev) => {
            const next = new Map(prev);
            next.set(row.location_id, {
              locationId: row.location_id,
              peopleCount: row.people_count,
              createdAt: row.created_at,
            });
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_reports" },
        (payload: RealtimePostgresInsertPayload<{
          location_id: string;
          temperature: number;
          created_at: string;
        }>) => {
          const row = payload.new;
          setWater((prev) => {
            const next = new Map(prev);
            next.set(row.location_id, {
              locationId: row.location_id,
              temperature: row.temperature,
              createdAt: row.created_at,
            });
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ice_reports" },
        (payload: RealtimePostgresInsertPayload<{
          location_id: string;
          condition: LatestIce["condition"];
          created_at: string;
        }>) => {
          const row = payload.new;
          setIce((prev) => {
            const next = new Map(prev);
            next.set(row.location_id, {
              locationId: row.location_id,
              condition: row.condition,
              createdAt: row.created_at,
            });
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), FRESHNESS_TICK_MS);
    return () => clearInterval(id);
  }, []);

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
          openVisit={openVisit}
          openVisitLocationName={openVisitLocationName}
          onVisitStarted={setOpenVisit}
          onVisitFinished={() => setOpenVisit(null)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
