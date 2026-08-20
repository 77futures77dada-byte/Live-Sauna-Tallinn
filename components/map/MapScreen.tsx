"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { LocationCard } from "@/components/location/LocationCard";
import { MobileLiveOverlay } from "@/components/mobile/MobileLiveOverlay";
import { LocationListSkeleton } from "@/components/sidebar/LocationListSkeleton";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { OpenVisit } from "@/lib/visits";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLiveSnapshot } from "@/lib/occupancy-status";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// react-leaflet touches `window`/`document` at module-eval time, so it
// can't be server-rendered — see docs/app/guides/lazy-loading in the
// bundled Next.js docs ("ssr: false is not allowed in Server Components").
// next/dynamic is a composite of React.lazy() + Suspense (same doc) — the
// loading fallback is a plain <Suspense> below instead of the `loading`
// option here, since that option can't see the current locale prop.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

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
  focusLocationId,
  locale,
}: {
  locations: Location[];
  initialOccupancy: [string, LatestOccupancy][];
  initialWater: [string, LatestWater][];
  initialIce: [string, LatestIce][];
  userId: string | null;
  initialOpenVisit: OpenVisit | null;
  focusLocationId?: string;
  locale: Locale;
}) {
  const focusLocation = focusLocationId
    ? (locations.find((l) => l.id === focusLocationId) ?? null)
    : null;

  const [selected, setSelected] = useState<Location | null>(focusLocation);
  // Set by handleSelect below, from either the sidebar or a marker click —
  // MapContainer's own center/zoom only apply on first mount, so panning
  // to an already-mounted map needs this imperative target instead (see
  // MapView's FlyToOnSelect).
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  // QR deep links (focusLocationId set) skip the hero — someone who
  // scanned the on-site code wants the check-in flow, not a landing
  // screen.
  const [showHero, setShowHero] = useState(!focusLocationId);
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

  if (showHero) {
    return (
      <div className="relative min-h-0 w-full flex-1">
        <HeroLanding
          locale={locale}
          onEnter={() => setShowHero(false)}
          liveSnapshot={getLiveSnapshot(occupancy)}
          userId={userId}
        />
      </div>
    );
  }

  const dict = getDictionary(locale);

  // Shared by sidebar cards and map markers alike (Phase 2) — either path
  // both opens the detail card and flies the map to the location.
  function handleSelect(location: Location) {
    setSelected(location);
    setFocusTarget([location.latitude, location.longitude]);
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1">
      <Suspense
        fallback={
          <div className="flex h-full w-full">
            <div className="hidden w-[380px] shrink-0 border-r border-warm-border bg-ivory p-4 lg:block">
              <LocationListSkeleton />
            </div>
            <div className="flex flex-1 animate-pulse items-center justify-center bg-[#f2efe9] text-sm text-steam">
              {dict.map.loading}
            </div>
          </div>
        }
      >
        <Sidebar
          locations={locations}
          occupancy={occupancy}
          selectedId={selected?.id ?? null}
          locale={locale}
          onSelect={handleSelect}
        />
        <MobileLiveOverlay
          locations={locations}
          occupancy={occupancy}
          selectedId={selected?.id ?? null}
          locale={locale}
          onSelect={handleSelect}
        />
        <div className="relative min-h-0 flex-1">
          <MapView
            locations={locations}
            occupancy={occupancy}
            onSelect={handleSelect}
            center={focusLocation ? [focusLocation.latitude, focusLocation.longitude] : undefined}
            zoom={focusLocation ? 15 : undefined}
            focusTarget={focusTarget}
          />
        </div>
      </Suspense>
      {selected && (
        <LocationCard
          key={selected.id}
          location={selected}
          userId={userId}
          locale={locale}
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
