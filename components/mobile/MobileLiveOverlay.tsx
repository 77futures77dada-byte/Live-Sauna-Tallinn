"use client";

import { Search } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { LocationListCard } from "@/components/sidebar/LocationListCard";
import { LocationListEmptyState } from "@/components/sidebar/LocationListEmptyState";
import { useLocationFilter } from "@/components/sidebar/useLocationFilter";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// Collapsed height fits the handle, the "LIVE NOW" label, and roughly one
// and a half LocationListCards (per the brief's "1-2 cards" peek) —
// anything past that is simply clipped by overflow-hidden, not sliced in
// JS, so it degrades gracefully regardless of card content length.
const PEEK_HEIGHT = 220;
const EXPANDED_RATIO = 0.75;
const DRAG_THRESHOLD = 6;

export function MobileLiveOverlay({
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

  const [expanded, setExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const draggedRef = useRef(false);

  function expandedPx(): number {
    return Math.round(window.innerHeight * EXPANDED_RATIO);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedRef.current = false;
    dragState.current = { startY: event.clientY, startHeight: expanded ? expandedPx() : PEEK_HEIGHT };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    if (Math.abs(delta) > DRAG_THRESHOLD) draggedRef.current = true;
    const next = Math.min(expandedPx(), Math.max(PEEK_HEIGHT, dragState.current.startHeight + delta));
    setDragHeight(next);
  }

  function handlePointerUp() {
    if (!dragState.current) return;
    if (draggedRef.current) {
      const current = dragHeight ?? dragState.current.startHeight;
      setExpanded(current > (expandedPx() + PEEK_HEIGHT) / 2);
    }
    setDragHeight(null);
    dragState.current = null;
  }

  function handleHandleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setExpanded((prev) => !prev);
  }

  const sheetHeight = dragHeight ?? (expanded ? expandedPx() : PEEK_HEIGHT);

  return (
    <>
      {/*
        Floating search + filters — desktop uses Sidebar instead.
        pointer-events-none on this wrapper (auto again on the actual pill
        and chips) so a marker that happens to sit in the gaps around them
        at a given pan/zoom is still tappable — the search bar and chips
        are the only genuinely opaque hit targets here, not the whole
        strip, which is what actually caused the Phase 2 header bug this
        phase set out to fix in the first place.
      */}
      <div className="pointer-events-none fixed top-16 right-3 left-3 z-[1120] lg:hidden">
        <div className="relative pointer-events-auto">
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
            className="w-full rounded-full border border-warm-border bg-white py-2.5 pr-3 pl-9 text-sm text-fjord shadow-md placeholder:text-steam focus:border-ember focus:outline-none"
          />
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`pointer-events-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                filter === key ? "bg-ember text-white" : "border border-warm-border bg-white text-steam"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/*
        Bottom sheet — desktop uses Sidebar instead. z-[1150] sits between
        the assistant FAB (1100) and the LocationCard detail sheet (1200):
        when expanded it's tall enough to cover the FAB's fixed position
        outright (no separate "hide the FAB" wiring needed), and it yields
        to the detail card the same way the FAB already does. The FAB's own
        bottom offset (see AssistantSheet) clears this sheet's *collapsed*
        peek height so the two don't overlap in the resting state either.
      */}
      <div
        style={{ height: sheetHeight }}
        className={`fixed inset-x-0 bottom-0 z-[1150] flex flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-2xl lg:hidden ${
          dragHeight === null ? "transition-[height] duration-200 ease-out" : ""
        }`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleHandleClick}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={dict.sidebar.liveNow}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((prev) => !prev);
            }
          }}
          className="flex shrink-0 touch-none flex-col items-center gap-2 pt-2.5 pb-1.5"
        >
          <span className="h-1.5 w-10 rounded-full bg-warm-border" aria-hidden />
          <span className="text-xs font-semibold tracking-wide text-steam uppercase">
            {dict.sidebar.liveNow}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
      </div>
    </>
  );
}
