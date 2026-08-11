"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { LocationMarker } from "./LocationMarker";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// Tallinn city center — a reasonable default view over all 7 seeded
// locations without needing to fit-bounds them.
const TALLINN_CENTER: [number, number] = [59.437, 24.7536];

export default function MapView({
  locations,
  onSelect,
}: {
  locations: Location[];
  onSelect: (location: Location) => void;
}) {
  return (
    <MapContainer
      center={TALLINN_CENTER}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((location) => (
        <LocationMarker key={location.id} location={location} onSelect={onSelect} />
      ))}
    </MapContainer>
  );
}
