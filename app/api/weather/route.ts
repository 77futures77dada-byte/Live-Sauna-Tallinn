import { NextResponse } from "next/server";
import { getStationObservation } from "@/lib/weather";
import { stationBySlug } from "@/lib/weather-stations";

// GET /api/weather?slug=<location-slug> — proxies the Ilmateenistus feed
// (lib/weather.ts caches it for 10 minutes) for the station mapped to that
// location. See lib/weather-stations.ts for the slug -> station mapping.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const stationName = slug ? stationBySlug[slug] : undefined;

  if (!stationName) {
    return NextResponse.json({ error: "Unknown location slug" }, { status: 404 });
  }

  try {
    const observation = await getStationObservation(stationName);
    if (!observation) {
      return NextResponse.json(
        { error: "Station not present in the current feed" },
        { status: 502 },
      );
    }
    return NextResponse.json({ slug, ...observation });
  } catch (error) {
    console.error("GET /api/weather failed", error);
    return NextResponse.json({ error: "Weather feed unavailable" }, { status: 502 });
  }
}
