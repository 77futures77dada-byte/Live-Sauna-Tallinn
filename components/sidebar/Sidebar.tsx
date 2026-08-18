"use client";

import { Search } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import { LocationListCard } from "./LocationListCard";
import { LocationListEmptyState } from "./LocationListEmptyState";
import { useLocationFilter } from "./useLocationFilter";

type Location = Database["public"]["Tables"]["locations"]["Row"];

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
  const { query, setQuery, filter, setFilter, filters, entries, formatDistance } = useLocationFilter({
    locations,
    occupancy,
    locale,
  });

  return (
    <aside className="hidden h-full w-[380px] shrink-0 flex-col border-r border-warm-border bg-ivory lg:flex">
      <div className="shrink-0 space-y-3 border-b border-warm-border p-4">
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight text-fjord">
          {dict.app.name}
        </h1>

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
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
          <div className="space-y-2">
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
