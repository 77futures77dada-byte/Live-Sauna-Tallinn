"use client";

import L from "leaflet";
import { Marker } from "react-leaflet";
import { freshnessColor } from "@/lib/freshness";
import { locationTypeIcon } from "@/lib/location-types";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

function buildIcon(location: Location) {
  // Every marker is "unknown" freshness until Phase 2 wires up live
  // occupancy reports — see lib/freshness.ts.
  const color = freshnessColor.unknown;
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
  onSelect,
}: {
  location: Location;
  onSelect: (location: Location) => void;
}) {
  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={buildIcon(location)}
      eventHandlers={{ click: () => onSelect(location) }}
    />
  );
}
