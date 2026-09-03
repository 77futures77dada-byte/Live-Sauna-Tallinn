"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { LocationCard } from "@/components/location/LocationCard";
import { ForecastStrip } from "@/components/locator/ForecastStrip";
import { LocationList } from "@/components/locator/LocationList";
import { LocatorHeroBanner } from "@/components/locator/LocatorHeroBanner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { OpenVisit } from "@/lib/visits";
import type { Locale } from "@/lib/i18n";
import { getLiveSnapshot } from "@/lib/occupancy-status";
import { mergeVerifiedPresence } from "@/lib/reports";

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

// How often to poll /api/occupancy/live for other visitors' check-ins.
// Realtime can't carry this: visits is RLS-locked to its own owner
// (0002_rls.sql) and Supabase enforces that same RLS on postgres_changes,
// so a subscription here would never see another user's check-in event —
// polling the aggregate endpoint is the only way it reaches this screen.
const LIVE_PRESENCE_POLL_MS = 20_000;

export function MapScreen({
  locations,
  initialOccupancy,
  initialWater,
  initialIce,
  initialVerifiedPresence,
  userId,
  initialOpenVisit,
  focusLocationId,
  locale,
}: {
  locations: Location[];
  initialOccupancy: [string, LatestOccupancy][];
  initialWater: [string, LatestWater][];
  initialIce: [string, LatestIce][];
  initialVerifiedPresence: [string, number][];
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
  const [verifiedPresence, setVerifiedPresence] = useState(() => new Map(initialVerifiedPresence));
  const [water, setWater] = useState(() => new Map(initialWater));
  const [ice, setIce] = useState(() => new Map(initialIce));
  const [openVisit, setOpenVisit] = useState(initialOpenVisit);
  const [station, setStation] = useState<{
    airTemperature: number | null;
    waterTemperature: number | null;
  } | null>(null);
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

  // Polls verified check-ins (see LIVE_PRESENCE_POLL_MS above) and fully
  // replaces `verifiedPresence` each time, rather than merging onto its own
  // previous value — mergeVerifiedPresence only ever raises a count, so
  // folding a poll result into an already-merged map would let a stale
  // headcount ratchet upward forever and never reflect someone checking
  // out. displayOccupancy below does the (fresh, one-shot) merge instead.
  useEffect(() => {
    let cancelled = false;

    async function pollLivePresence() {
      try {
        const res = await fetch("/api/occupancy/live");
        if (!res.ok || cancelled) return;
        const rows: { location_id: string; people_count: number }[] = await res.json();
        if (cancelled) return;
        setVerifiedPresence(new Map(rows.map((row) => [row.location_id, row.people_count])));
      } catch {
        // Best-effort — the next poll retries; the map just falls back to
        // crowdsourced-only numbers until then.
      }
    }

    pollLivePresence();
    const id = setInterval(pollLivePresence, LIVE_PRESENCE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // The three pilot saunas share one Ilmateenistus station
  // (lib/weather-stations.ts), so one fetch — keyed off any location's
  // slug — covers the whole dashboard: the hero banner's water/air
  // figures and every card's air reading. No station data → those
  // figures just don't render, same "nothing invented" rule as elsewhere.
  const representativeSlug = locations[0]?.slug;
  useEffect(() => {
    if (!representativeSlug) return;
    let cancelled = false;

    fetch(`/api/weather?slug=${representativeSlug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((observation: { airTemperature: number | null; waterTemperature: number | null }) => {
        if (!cancelled) {
          setStation({
            airTemperature: observation.airTemperature,
            waterTemperature: observation.waterTemperature,
          });
        }
      })
      .catch(() => {
        // Station absent from the current feed — leave `station` null.
      });

    return () => {
      cancelled = true;
    };
  }, [representativeSlug]);

  // All three pilot saunas sit at the same point on Lake Harku — the
  // locator map just needs one representative location for its shared
  // coordinates, not one marker per sauna (see MapView).
  const site = locations[0] ?? null;
  // The number every occupancy display actually renders: crowdsourced
  // reports folded together with real, verified check-ins (see
  // mergeVerifiedPresence). Always derived fresh from the two raw sources
  // above, never from its own previous output.
  const displayOccupancy = useMemo(
    () => mergeVerifiedPresence(occupancy, verifiedPresence),
    [occupancy, verifiedPresence],
  );
  const liveSnapshot = getLiveSnapshot(displayOccupancy);

  if (showHero) {
    // fixed inset-0 rather than this component's usual flex-1 slot below
    // AppHeader — the splash is meant to cover the whole viewport,
    // AppHeader's bar included (see HeroLanding's file comment), and
    // AppHeader stays mounted underneath rather than being conditionally
    // rendered from the page component, so no state there is lost.
    return (
      <div className="fixed inset-0 z-50">
        <HeroLanding
          locale={locale}
          onEnter={() => setShowHero(false)}
          userId={userId}
          liveSnapshot={liveSnapshot}
          site={site}
        />
      </div>
    );
  }

  function handleSelect(location: Location) {
    setSelected(location);
  }

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-ivory">
      <LocatorHeroBanner
        locale={locale}
        totalSaunas={locations.length}
        liveSnapshot={liveSnapshot}
        airTemperature={station?.airTemperature ?? null}
        waterTemperature={station?.waterTemperature ?? null}
        backHref={focusLocationId ? "/" : undefined}
      />

      <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* 3fr/2fr reads as ~60/40 — map on the left gets the bulk of the
            width, the three cards sit in a column that's dense, not
            stretched full-width with empty space either side of it. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
          {site && (
            <Suspense
              fallback={
                <div className="h-64 w-full animate-pulse rounded-3xl border-4 border-fjord bg-ivory-shade sm:h-80 lg:h-[560px]" />
              }
            >
              {/* Deliberately heavy border — the map should read as a framed
                  panel, not just a rounded tile. --color-fjord is the same
                  token as the dashboard text/illustration, so it inverts
                  with the dark toggle. */}
              <div className="h-64 w-full overflow-hidden rounded-3xl border-4 border-fjord shadow-md sm:h-80 lg:h-[560px]">
                <MapView site={site} />
              </div>
            </Suspense>
          )}

          {/* Scroll target for the banner's "view saunas" CTA — offset so
              the list heading clears the sticky-ish chrome above it. */}
          <div id="saunas" className="scroll-mt-6 lg:scroll-mt-8">
            <LocationList
              locations={locations}
              occupancy={displayOccupancy}
              water={water}
              airTemperature={station?.airTemperature ?? null}
              selectedId={selected?.id ?? null}
              locale={locale}
              onSelect={handleSelect}
            />
          </div>
        </div>

        {site && (
          <ForecastStrip latitude={site.latitude} longitude={site.longitude} locale={locale} />
        )}
      </div>

      {selected && (
        <LocationCard
          key={selected.id}
          location={selected}
          userId={userId}
          locale={locale}
          occupancy={displayOccupancy.get(selected.id)}
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
