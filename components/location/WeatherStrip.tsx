import type { StationObservation } from "@/lib/weather";

const windDirectionCompass = (degrees: number) => {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(degrees / 45) % 8];
};

export function WeatherStrip({ observation }: { observation: StationObservation }) {
  const hasAir = observation.airTemperature !== null;
  const hasWind = observation.windSpeed !== null;

  if (!hasAir && !hasWind) return null;

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
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
    </div>
  );
}
