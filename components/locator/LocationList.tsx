"use client";

import { useEffect, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function LocationList({
  locations,
  occupancy,
  water,
  selectedId,
  locale,
  onSelect,
}: {
  locations: Location[];
  occupancy: Map<string, LatestOccupancy>;
  water: Map<string, LatestWater>;
  selectedId: string | null;
  locale: Locale;
  onSelect: (location: Location) => void;
}) {
  const dict = getDictionary(locale);
  const [airTemperature, setAirTemperature] = useState<number | null>(null);

  // All three pilot saunas sit at the same point on Lake Harku and share
  // one weather station (lib/weather-stations.ts), so one fetch — using
  // any one location's slug — covers every card here instead of one
  // request per card for what would be an identical reading.
  const representativeSlug = locations[0]?.slug;

  useEffect(() => {
    if (!representativeSlug) return;
    let cancelled = false;

    fetch(`/api/weather?slug=${representativeSlug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((observation: { airTemperature: number | null }) => {
        if (!cancelled) setAirTemperature(observation.airTemperature);
      })
      .catch(() => {
        // No station data — cards just fall back to occupancy/water, same
        // "nothing invented" rule as everywhere else weather is shown.
      });

    return () => {
      cancelled = true;
    };
  }, [representativeSlug]);

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
      <div className="flex flex-col gap-2.5">
        {ordered.map((location, index) => (
          <LocationListCard
            key={location.id}
            location={location}
            occupancy={occupancy.get(location.id)}
            water={water.get(location.id)}
            airTemperature={airTemperature}
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
