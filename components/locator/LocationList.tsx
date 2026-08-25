"use client";

import { getFreshness, type FreshnessLevel } from "@/lib/freshness";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// Freshest reports float to the top — same rule the old sidebar's
// search/filter list used, minus the search and filtering: with just
// three identical saunas at one pilot site there's nothing left to search
// or filter by.
const freshnessRank: Record<FreshnessLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

export function LocationList({
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

  const entries = locations
    .map((location) => {
      const locationOccupancy = occupancy.get(location.id);
      const freshness = getFreshness(locationOccupancy?.createdAt ?? null);
      return { location, occupancy: locationOccupancy, freshness };
    })
    .sort((a, b) => {
      const freshnessDiff = freshnessRank[a.freshness] - freshnessRank[b.freshness];
      if (freshnessDiff !== 0) return freshnessDiff;
      const countDiff = (b.occupancy?.peopleCount ?? -1) - (a.occupancy?.peopleCount ?? -1);
      if (countDiff !== 0) return countDiff;
      return a.location.name.localeCompare(b.location.name);
    });

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide text-steam uppercase">
        {dict.sidebar.liveNow}
      </h2>
      <div className="space-y-2">
        {entries.map(({ location, occupancy: locationOccupancy }) => (
          <LocationListCard
            key={location.id}
            location={location}
            occupancy={locationOccupancy}
            selected={selectedId === location.id}
            locale={locale}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
