const CACHE_TTL_MS = 45 * 60 * 1000;

export interface DailyForecast {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  windSpeedMax: number;
}

let cache: { key: string; fetchedAt: number; days: DailyForecast[] } | null = null;

// Open-Meteo — free, no API key, no billing (see docs/ARCHITECTURE.md).
// All three Harku pilot saunas share one point on the lake (same as
// lib/weather-stations.ts), so callers pass that one representative
// lat/lon and every card reads the same cached response.
async function fetchForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    "weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max",
  );
  url.searchParams.set("timezone", "Europe/Tallinn");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`);
  }

  const data = await response.json();
  const daily = data.daily;
  const days: DailyForecast[] = daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: daily.weathercode[i],
    temperatureMax: daily.temperature_2m_max[i],
    temperatureMin: daily.temperature_2m_min[i],
    windSpeedMax: daily.windspeed_10m_max[i],
  }));

  return days;
}

export async function getForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const now = Date.now();
  if (cache && cache.key === key && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.days;
  }

  const days = await fetchForecast(latitude, longitude);
  cache = { key, fetchedAt: now, days };
  return days;
}
