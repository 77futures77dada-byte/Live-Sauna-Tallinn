"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { LocationMarker } from "./LocationMarker";
import type { Database } from "@/lib/supabase/types";
import type { LatestOccupancy } from "@/lib/reports";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// Tallinn city center — a reasonable default view over all 7 seeded
// locations without needing to fit-bounds them.
const TALLINN_CENTER: [number, number] = [59.437, 24.7536];
const FOCUS_ZOOM = 15;

// MapContainer's center/zoom only apply on first mount (react-leaflet
// treats the map as uncontrolled after that) — panning to a location
// selected from the sidebar or a marker click after the map is already up
// needs an imperative flyTo via the map instance, which only useMap()
// (called from inside MapContainer) can reach.
function FlyToOnSelect({ target }: { target: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) map.flyTo(target, FOCUS_ZOOM);
  }, [map, target]);

  return null;
}

export default function MapView({
  locations,
  occupancy,
  onSelect,
  center,
  zoom,
  focusTarget,
}: {
  locations: Location[];
  occupancy: Map<string, LatestOccupancy>;
  onSelect: (location: Location) => void;
  center?: [number, number];
  zoom?: number;
  focusTarget?: [number, number] | null;
}) {
  return (
    <MapContainer
      center={center ?? TALLINN_CENTER}
      zoom={zoom ?? 11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      {locations.map((location) => (
        <LocationMarker
          key={location.id}
          location={location}
          occupancy={occupancy.get(location.id)}
          onSelect={onSelect}
        />
      ))}
      {focusTarget !== undefined && <FlyToOnSelect target={focusTarget} />}
    </MapContainer>
  );
}
