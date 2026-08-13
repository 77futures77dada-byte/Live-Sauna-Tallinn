"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getFreshness, type FreshnessLevel } from "@/lib/freshness";
import { distanceKm } from "@/lib/geo";
import { getBrowserLocation } from "@/lib/geolocation";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getOccupancyStatus } from "@/lib/occupancy-status";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";
import { LocationListEmptyState } from "./LocationListEmptyState";

type Location = Database["public"]["Tables"]["locations"]["Row"];

type QuickFilter = "all" | "quiet" | "active" | "busy" | "winter_swimming";

// Freshest reports surface first regardless of the sidebar's live sort —
// an "Active" location reported 2 minutes ago is more useful to see than
// a "Busy" one reported 55 minutes ago.
const freshnessRank: Record<FreshnessLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

export function Sidebar({
  locations,
  occupancy,
  selectedId,
  locale,
  onSelect,
}: {
  locations: Location[];
  occupancy: Map<string, LatestOccupancy>;
  selectedId: string | null;
  locale: Locale;
  onSelect: (location: Location) => void;
}) {
  const dict = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    getBrowserLocation().then((coords) => {
      if (!cancelled) setUserLocation(coords);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filters: { key: QuickFilter; label: string }[] = [
    { key: "all", label: dict.sidebar.filterAll },
    { key: "quiet", label: dict.sidebar.filterQuiet },
    { key: "active", label: dict.sidebar.filterActive },
    { key: "busy", label: dict.sidebar.filterBusy },
    { key: "winter_swimming", label: dict.sidebar.filterWinterSwimming },
  ];

  function formatDistance(km: number): string {
    if (km < 1) {
      return dict.sidebar.distanceAwayMeters.replace("{n}", String(Math.round(km * 1000)));
    }
    return dict.sidebar.distanceAwayKm.replace("{n}", km.toFixed(1));
  }

  const entries = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    return locations
      .map((location) => {
        const locationOccupancy = occupancy.get(location.id);
        const freshness = getFreshness(locationOccupancy?.createdAt ?? null);
        const status = getOccupancyStatus(
          freshness,
          locationOccupancy?.peopleCount,
          location.capacity,
        );
        const distance = userLocation
          ? distanceKm(
              userLocation.latitude,
              userLocation.longitude,
              location.latitude,
              location.longitude,
            )
          : null;
        return { location, occupancy: locationOccupancy, freshness, status, distance };
      })
      .filter(({ location }) =>
        trimmedQuery ? location.name.toLowerCase().includes(trimmedQuery) : true,
      )
      .filter(({ location, status }) => {
        if (filter === "all") return true;
        if (filter === "winter_swimming") return location.type === "winter_swimming";
        return status === filter;
      })
      .sort((a, b) => {
        const freshnessDiff = freshnessRank[a.freshness] - freshnessRank[b.freshness];
        if (freshnessDiff !== 0) return freshnessDiff;
        const countDiff = (b.occupancy?.peopleCount ?? -1) - (a.occupancy?.peopleCount ?? -1);
        if (countDiff !== 0) return countDiff;
        return a.location.name.localeCompare(b.location.name);
      });
  }, [locations, occupancy, query, filter, userLocation]);

  return (
    <aside className="hidden h-full w-[380px] shrink-0 flex-col border-r border-warm-border bg-ivory lg:flex">
      <div className="shrink-0 space-y-3 border-b border-warm-border p-4">
        <h1 className="font-display text-2xl leading-tight text-fjord">{dict.app.name}</h1>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steam"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.sidebar.searchPlaceholder}
            aria-label={dict.sidebar.searchPlaceholder}
            className="w-full rounded-full border border-warm-border bg-white py-2 pr-3 pl-9 text-sm text-fjord placeholder:text-steam focus:border-ember focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === key
                  ? "bg-ember text-white"
                  : "border border-warm-border bg-white text-steam hover:border-steam/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-steam uppercase">
          {dict.sidebar.liveNow}
        </h2>

        {entries.length === 0 ? (
          <LocationListEmptyState locale={locale} />
        ) : (
          <div className="space-y-2.5">
            {entries.map(({ location, occupancy: locationOccupancy, distance }) => (
              <LocationListCard
                key={location.id}
                location={location}
                occupancy={locationOccupancy}
                distanceLabel={distance !== null ? formatDistance(distance) : null}
                selected={selectedId === location.id}
                locale={locale}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
