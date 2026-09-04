"use client";

import { getDictionary, type Locale } from "@/lib/i18n";
import { hasCrowdLiveData } from "@/lib/occupancy-status";
import type { QueueLive } from "@/lib/queue";
import type { LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function LocationList({
  locations,
  occupancy,
  water,
  queue,
  airTemperature,
  selectedId,
  locale,
  onSelect,
}: {
  locations: Location[];
  occupancy: Map<string, LatestOccupancy>;
  water: Map<string, LatestWater>;
  queue: Map<string, QueueLive>;
  // Shared Ilmateenistus station reading, fetched once in MapScreen — the
  // three pilot saunas sit at the same point on Lake Harku and share one
  // station (lib/weather-stations.ts), so it's the same number on every
  // card. null when the station has nothing in the current feed.
  airTemperature: number | null;
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

  // If not one sauna has a fresh crowdsourced reading, a single banner
  // above the column says so once — instead of every card repeating the
  // same "no live data" line. As soon as any sauna has a report, each card
  // carries its own state again. The shared station's air temperature
  // (shown on the cards and in the locator banner) doesn't count here — it's
  // ambient weather, not a per-sauna signal.
  const noneHaveLiveData = ordered.every(
    (location) => !hasCrowdLiveData(occupancy.get(location.id), water.get(location.id)),
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-fjord">{dict.sidebar.liveNow}</h2>

      {noneHaveLiveData && (
        <div className="rounded-2xl border border-warm-border bg-ivory p-3.5 shadow-sm">
          <p className="font-display text-sm font-semibold text-fjord">
            {dict.location.noDataBannerTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-steam">
            {dict.location.noDataBannerBody}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {ordered.map((location, index) => (
          <LocationListCard
            key={location.id}
            location={location}
            occupancy={occupancy.get(location.id)}
            water={water.get(location.id)}
            queue={queue.get(location.id)}
            airTemperature={airTemperature}
            number={index + 1}
            selected={selectedId === location.id}
            locale={locale}
            onSelect={onSelect}
            dashWhenEmpty={noneHaveLiveData}
          />
        ))}
      </div>
    </div>
  );
}
