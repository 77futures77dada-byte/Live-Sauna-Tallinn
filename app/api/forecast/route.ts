import { NextResponse } from "next/server";
import { getForecast } from "@/lib/forecast";

// GET /api/forecast?lat=<>&lon=<> — proxies Open-Meteo (lib/forecast.ts
// caches it for 45 minutes) for the given point. See app/api/weather for
// the equivalent Ilmateenistus station reading.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const days = await getForecast(lat, lon);
    return NextResponse.json({ days });
  } catch (error) {
    console.error("GET /api/forecast failed", error);
    return NextResponse.json({ error: "Forecast unavailable" }, { status: 502 });
  }
}
