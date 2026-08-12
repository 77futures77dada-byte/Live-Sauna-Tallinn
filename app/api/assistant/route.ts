import { NextResponse } from "next/server";
import {
  extractIntent,
  formulateAnswer,
  isGeminiConfigured,
  type LocationSnapshot,
} from "@/lib/gemini";
import { getLocale } from "@/lib/get-locale";
import { getDictionary } from "@/lib/i18n";
import { getLatestIceByLocation, getLatestOccupancyByLocation, getLatestWaterByLocation } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { getStationObservation } from "@/lib/weather";
import { stationBySlug } from "@/lib/weather-stations";

const MAX_QUERY_LENGTH = 500;
const ICE_RANK: Record<string, number> = { none: 0, partial: 1, frozen: 2 };

// Best-effort per-IP throttle for this unauthenticated, Gemini-backed
// endpoint — in-memory only (resets per serverless instance), which is
// an acceptable MVP safeguard against runaway API cost rather than a
// strict guarantee. Same 5-minute-report spirit as lib/rate-limit.ts,
// just keyed by IP instead of user+location since there's no auth here.
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX = 8;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function minutesAgo(iso: string, now: number): number {
  return Math.round((now - new Date(iso).getTime()) / 60_000);
}

// POST /api/assistant — see docs/ARCHITECTURE.md section 7. Query →
// Gemini extracts intent (structured JSON) → real Supabase/weather data
// is assembled here → Gemini narrates it in the visitor's language,
// strictly grounded in that data. Read-only: never writes reports or
// bookings.
export async function POST(request: Request) {
  const locale = await getLocale();
  const dict = getDictionary(locale).assistant;

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: dict.notConfigured }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: dict.rateLimited }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const latitude = typeof body?.latitude === "number" ? body.latitude : null;
  const longitude = typeof body?.longitude === "number" ? body.longitude : null;

  if (!query || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: dict.invalidQuery }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: locations }, occupancy, water, ice] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    getLatestOccupancyByLocation(supabase),
    getLatestWaterByLocation(supabase),
    getLatestIceByLocation(supabase),
  ]);

  const stationNames = [...new Set(Object.values(stationBySlug))];
  const stationEntries = await Promise.all(
    stationNames.map(
      async (name) => [name, await getStationObservation(name).catch(() => null)] as const,
    ),
  );
  const stationObservations = new Map(
    stationEntries.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null),
  );

  let intent;
  try {
    intent = await extractIntent(query);
  } catch (error) {
    console.error("POST /api/assistant intent extraction failed", error);
    return NextResponse.json({ error: dict.genericError }, { status: 502 });
  }

  if (intent.needsUserLocation && (latitude === null || longitude === null)) {
    return NextResponse.json({ answer: dict.needsLocation, location: null });
  }

  const now = Date.now();
  const snapshot: LocationSnapshot[] = (locations ?? [])
    .filter((loc) => intent.locationType === "any" || loc.type === intent.locationType)
    .map((loc) => {
      const occ = occupancy.get(loc.id);
      const report = water.get(loc.id);
      const station = stationObservations.get(stationBySlug[loc.slug] ?? "");
      const iceReport = ice.get(loc.id);

      const waterTempC: LocationSnapshot["waterTempC"] = report
        ? { value: report.temperature, source: "report", minutesAgo: minutesAgo(report.createdAt, now) }
        : station?.waterTemperature != null
          ? {
              value: station.waterTemperature,
              source: "station",
              minutesAgo: minutesAgo(station.observedAt, now),
            }
          : null;

      return {
        id: loc.id,
        slug: loc.slug,
        name: loc.name,
        type: loc.type,
        occupancy: occ
          ? { peopleCount: occ.peopleCount, minutesAgo: minutesAgo(occ.createdAt, now) }
          : null,
        waterTempC,
        ice: iceReport
          ? { condition: iceReport.condition, minutesAgo: minutesAgo(iceReport.createdAt, now) }
          : null,
        distanceKm:
          latitude !== null && longitude !== null
            ? Math.round(
                haversineKm({ lat: latitude, lon: longitude }, { lat: loc.latitude, lon: loc.longitude }) * 10,
              ) / 10
            : null,
      };
    });

  let ranked = snapshot;
  let topMatch: LocationSnapshot | null = null;

  if (intent.metric !== "general") {
    const valueOf = (entry: LocationSnapshot): number | null => {
      switch (intent.metric) {
        case "occupancy":
          return entry.occupancy?.peopleCount ?? null;
        case "water_temp":
          return entry.waterTempC?.value ?? null;
        case "ice":
          return entry.ice ? ICE_RANK[entry.ice.condition] : null;
        case "distance":
          return entry.distanceKm;
        default:
          return null;
      }
    };

    ranked = snapshot
      .filter((entry) => valueOf(entry) !== null)
      .sort((a, b) => {
        const diff = (valueOf(a) as number) - (valueOf(b) as number);
        return intent.order === "asc" ? diff : -diff;
      });

    topMatch = ranked[0] ?? null;
  }

  try {
    const answer = await formulateAnswer({
      locale,
      query,
      intent,
      snapshot: intent.metric === "general" ? snapshot : ranked.slice(0, 7),
      topMatch,
    });

    return NextResponse.json({
      answer,
      location: topMatch ? { slug: topMatch.slug, name: topMatch.name } : null,
    });
  } catch (error) {
    console.error("POST /api/assistant answer formulation failed", error);
    return NextResponse.json({ error: dict.genericError }, { status: 502 });
  }
}
