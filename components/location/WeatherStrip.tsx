import type { StationObservation } from "@/lib/weather";

const windDirectionCompass = (degrees: number) => {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(degrees / 45) % 8];
};

// Official Ilmateenistus station reading — air, wind, and (when the
// station has a water sensor, e.g. Pirita) water temperature. This is
// distinct from the crowdsourced water_reports shown by WaterTempStat.
export function WeatherStrip({ observation }: { observation: StationObservation }) {
  const hasAir = observation.airTemperature !== null;
  const hasWind = observation.windSpeed !== null;
  const hasWater = observation.waterTemperature !== null;

  if (!hasAir && !hasWind && !hasWater) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
      {hasAir && (
        <span>🌡️ {observation.airTemperature!.toFixed(1)}°C air</span>
      )}
      {hasWind && (
        <span>
          💨 {observation.windSpeed!.toFixed(1)} m/s
          {observation.windDirection !== null &&
            ` ${windDirectionCompass(observation.windDirection)}`}
        </span>
      )}
      {hasWater && (
        <span>🌊 {observation.waterTemperature!.toFixed(1)}°C water (station)</span>
      )}
    </div>
  );
}
