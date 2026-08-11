"use client";

import L from "leaflet";
import { Marker } from "react-leaflet";
import { freshnessColor, getFreshness } from "@/lib/freshness";
import { locationTypeIcon } from "@/lib/location-types";
import type { LatestOccupancy } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

function buildIcon(location: Location, occupancy: LatestOccupancy | undefined) {
  const level = getFreshness(occupancy?.createdAt ?? null);
  const color = freshnessColor[level];
  const glyph = locationTypeIcon[location.type];

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
