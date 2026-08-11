"use client";

import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import { freshnessColor, freshnessIconColor, getFreshness } from "@/lib/freshness";
import { locationTypeIconComponent } from "@/lib/location-types";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// Leaflet's divIcon takes a raw HTML string, outside React's render tree,
// so the type glyph is rendered to static markup once per icon build
// rather than mounted as a component.
function buildIcon(location: Location, occupancy: LatestOccupancy | undefined) {
  const level = getFreshness(occupancy?.createdAt ?? null);
  const color = freshnessColor[level];
  const Icon = locationTypeIconComponent[location.type];
  const glyph = renderToStaticMarkup(
    <Icon color={freshnessIconColor[level]} size={18} strokeWidth={2.25} aria-hidden />,
  );

  return L.divIcon({
    className: "",
    html: `<span class="sauna-live-marker__dot" style="background:${color}">${glyph}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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
