import { XMLParser } from "fast-xml-parser";

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface StationObservation {
  name: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  airTemperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterTemperature: number | null;
}

let cache: { fetchedAt: number; stations: Map<string, StationObservation> } | null =
  null;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchObservations(): Promise<Map<string, StationObservation>> {
  const feedUrl = process.env.ILMATEENISTUS_API_URL;
  if (!feedUrl) {
    throw new Error("ILMATEENISTUS_API_URL is not set");
  }

  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "sauna-live/0.1 (+https://github.com/77futures77dada-byte/Live-Sauna-Tallinn)" },
  });
  if (!response.ok) {
    throw new Error(`Ilmateenistus feed responded with ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const root = doc.observations;

  const observedAt = root?.["@_timestamp"]
    ? new Date(Number(root["@_timestamp"]) * 1000).toISOString()
    : new Date().toISOString();

  const rawStations: unknown[] = Array.isArray(root?.station)
    ? root.station
    : root?.station
      ? [root.station]
      : [];

  const stations = new Map<string, StationObservation>();
  for (const raw of rawStations) {
    const station = raw as Record<string, unknown>;
    const name = typeof station.name === "string" ? station.name.trim() : "";
    if (!name) continue;

    stations.set(name, {
      name,
      latitude: toNumberOrNull(station.latitude) ?? 0,
      longitude: toNumberOrNull(station.longitude) ?? 0,
      observedAt,
      airTemperature: toNumberOrNull(station.airtemperature),
      windSpeed: toNumberOrNull(station.windspeed),
      windDirection: toNumberOrNull(station.winddirection),
      waterTemperature: toNumberOrNull(station.watertemperature),
    });
  }

  return stations;
}

async function getObservations(): Promise<Map<string, StationObservation>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.stations;
  }

  const stations = await fetchObservations();
  cache = { fetchedAt: now, stations };
  return stations;
}

export async function getStationObservation(
  stationName: string,
): Promise<StationObservation | null> {
  const stations = await getObservations();
  return stations.get(stationName) ?? null;
}
