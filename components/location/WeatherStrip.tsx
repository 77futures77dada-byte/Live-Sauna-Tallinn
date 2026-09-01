import { Thermometer, Waves, Wind } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { StationObservation } from "@/lib/weather";

const windDirectionCompass = (degrees: number) => {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(degrees / 45) % 8];
};

// Official Ilmateenistus station reading — air, wind, and (when the
// station has a water sensor, e.g. Pirita) water temperature. This is
// distinct from the crowdsourced water_reports shown by WaterTempStat.
export function WeatherStrip({
  observation,
  locale,
}: {
  observation: StationObservation;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const hasAir = observation.airTemperature !== null;
  const hasWind = observation.windSpeed !== null;
  const hasWater = observation.waterTemperature !== null;

  if (!hasAir && !hasWind && !hasWater) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-fjord">
      {hasAir && (
        <span className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-fjord" aria-hidden />
          <span className="font-semibold">{observation.airTemperature!.toFixed(1)}°C</span>{" "}
          {dict.location.weatherAir}
        </span>
      )}
      {hasWind && (
        <span className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-steam" aria-hidden />
          <span className="font-semibold">{observation.windSpeed!.toFixed(1)} m/s</span>
          {observation.windDirection !== null &&
            ` ${windDirectionCompass(observation.windDirection)}`}
        </span>
      )}
      {hasWater && (
        <span className="flex items-center gap-1.5">
          <Waves className="h-3.5 w-3.5 text-steam" aria-hidden />
          <span className="font-semibold">{observation.waterTemperature!.toFixed(1)}°C</span>{" "}
          {dict.location.weatherStationWater}
        </span>
      )}
    </div>
  );
}
