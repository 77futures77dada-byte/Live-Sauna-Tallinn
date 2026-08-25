"use client";

import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";

type Location = Database["public"]["Tables"]["locations"]["Row"];

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

  // Fixed 1/2/3 order by slug, not a live-freshness sort — with a numbered
  // badge as each card's visual anchor, having the cards themselves
  // reshuffle as occupancy changes would fight that identity instead of
  // reinforcing it. Slug (harku-1/2/3) rather than name, since the sauna
  // names are still placeholders (see 0009_harku_pilot.sql) but the slugs
  // are the stable identity.
  const ordered = [...locations].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-fjord">{dict.sidebar.liveNow}</h2>
      <div className="flex flex-col gap-3">
        {ordered.map((location, index) => (
          <LocationListCard
            key={location.id}
            location={location}
            occupancy={occupancy.get(location.id)}
            number={index + 1}
            selected={selectedId === location.id}
            locale={locale}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
