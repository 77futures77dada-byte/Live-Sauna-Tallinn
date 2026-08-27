"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { LocationMarker } from "./LocationMarker";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// All three Harku pilot saunas share one point on the lake (see
// 0009_harku_pilot.sql), so this is a "you are here" locator, not a map to
// browse — the view is locked on that point and every gesture that would
// let it pan or zoom elsewhere is disabled. `site` just needs to be any
// one of the three locations, purely for its shared coordinates; the
// marker itself carries no occupancy status (undefined below), since it
// doesn't represent one specific sauna.
const FIXED_ZOOM = 15;

export default function MapView({ site }: { site: Location }) {
  return (
    <MapContainer
      center={[site.latitude, site.longitude]}
      zoom={FIXED_ZOOM}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      className="h-full w-full"
    >
      {/* Standard OpenStreetMap tiles — key-free and reliable. CARTO's
          anonymous Voyager/Positron endpoint started stamping an "API KEY
          REQUIRED" watermark on tiles; a styled CARTO basemap via a real
          (free) API key is a later pass. OSM's standard style maxes out at
          zoom 19. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains="abc"
        maxZoom={19}
      />
      <LocationMarker location={site} occupancy={undefined} onSelect={() => {}} />
    </MapContainer>
  );
}
