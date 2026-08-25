"use client";

import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import { getFreshness } from "@/lib/freshness";
import { locationTypeIconComponent } from "@/lib/location-types";
import { getOccupancyStatus, occupancyStatusColor } from "@/lib/occupancy-status";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

const MARKER_SIZE = 36;

// Leaflet's divIcon takes a raw HTML string, outside React's render tree —
// same occupancy-status law as the sidebar (quiet/active/busy/unknown, see
// lib/occupancy-status.ts) so a marker, its sidebar card, and the detail
// card never disagree about what color a location is. A headcount only
// ever appears for a live (high/medium freshness) report; anything staler
// falls back to the plain type glyph instead of a number that looks
// current but isn't.
function buildIcon(location: Location, occupancy: LatestOccupancy | undefined) {
  const freshness = getFreshness(occupancy?.createdAt ?? null);
  const status = getOccupancyStatus(freshness, occupancy?.peopleCount, location.capacity);
  const color = occupancyStatusColor[status];
  const live = status !== "unknown";

  const Icon = locationTypeIconComponent[location.type];
  const content = live
    ? `<span class="sauna-marker__count" style="color:${color}">${occupancy!.peopleCount}</span>`
    : renderToStaticMarkup(<Icon color="#111111" size={16} strokeWidth={2.25} aria-hidden />);

  const dotClass = live ? "sauna-marker__dot sauna-marker__dot--pulse" : "sauna-marker__dot";

  return L.divIcon({
    className: "",
    html: `<span class="sauna-marker">${content}<span class="${dotClass}" style="background:${color}"></span></span>`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
  });
}

export function LocationMarker({
  location,
  occupancy,
  onSelect,
}: {
  location: Location;
  occupancy: LatestOccupancy | undefined;
  onSelect: (location: Location) => void;
}) {
  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={buildIcon(location, occupancy)}
      eventHandlers={{ click: () => onSelect(location) }}
    />
  );
}
