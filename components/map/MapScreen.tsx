"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { LocationCard } from "@/components/location/LocationCard";
import { LocationList } from "@/components/locator/LocationList";
import { LocatorHeroBanner } from "@/components/locator/LocatorHeroBanner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { OpenVisit } from "@/lib/visits";
import type { Locale } from "@/lib/i18n";
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
    // fixed inset-0 rather than this component's usual flex-1 slot below
    // AppHeader — the splash is meant to cover the whole viewport,
    // AppHeader's bar included (see HeroLanding's file comment), and
    // AppHeader stays mounted underneath rather than being conditionally
    // rendered from the page component, so no state there is lost.
    return (
      <div className="fixed inset-0 z-50">
        <HeroLanding locale={locale} onEnter={() => setShowHero(false)} userId={userId} />
      </div>
    );
  }

  function handleSelect(location: Location) {
    setSelected(location);
  }

  // All three pilot saunas sit at the same point on Lake Harku — the
  // locator map just needs one representative location for its shared
  // coordinates, not one marker per sauna (see MapView).
  const site = locations[0] ?? null;

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-ivory">
      <LocatorHeroBanner locale={locale} liveSnapshot={getLiveSnapshot(occupancy)} />

      <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* 3fr/2fr reads as ~60/40 — map on the left gets the bulk of the
            width, the three cards sit in a column that's dense, not
            stretched full-width with empty space either side of it. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
          {site && (
            <Suspense
              fallback={
                <div className="h-64 w-full animate-pulse rounded-3xl bg-ivory-shade sm:h-80 lg:h-[560px]" />
              }
            >
              <div className="h-64 w-full overflow-hidden rounded-3xl border border-warm-border shadow-md sm:h-80 lg:h-[560px]">
                <MapView site={site} />
              </div>
            </Suspense>
          )}

          <LocationList
            locations={locations}
            occupancy={occupancy}
            selectedId={selected?.id ?? null}
            locale={locale}
            onSelect={handleSelect}
          />
        </div>
      </div>

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
