"use client";

import { useEffect, useMemo, useState } from "react";
import { getFreshness, type FreshnessLevel } from "@/lib/freshness";
import { distanceKm } from "@/lib/geo";
import { getBrowserLocation } from "@/lib/geolocation";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getOccupancyStatus } from "@/lib/occupancy-status";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export type QuickFilter = "all" | "quiet" | "active" | "busy" | "winter_swimming";

// Freshest reports surface first regardless of the live sort — an
// "Active" location reported 2 minutes ago is more useful to see than a
// "Busy" one reported 55 minutes ago.
const freshnessRank: Record<FreshnessLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

// Search + quick-filter + distance-sort logic shared by the desktop
// Sidebar and the mobile MobileLiveOverlay — same data, same rules,
// different chrome around it.
export function useLocationFilter({
  locations,
  occupancy,
  locale,
}: {
  locations: Location[];
  occupancy: Map<string, LatestOccupancy>;
  locale: Locale;
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

  return { query, setQuery, filter, setFilter, filters, entries, formatDistance };
}
