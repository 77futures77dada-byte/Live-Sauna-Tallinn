import type { StationObservation } from "@/lib/weather";

// Renders nothing when the mapped station doesn't report water
// temperature (e.g. an inland/airport station) — no placeholder value,
// per docs/ARCHITECTURE.md section 9.3.
export function WaterTempStat({ observation }: { observation: StationObservation }) {
  if (observation.waterTemperature === null) return null;

  return (
    <div className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
      🌊 Water temperature: <strong>{observation.waterTemperature.toFixed(1)}°C</strong>
    </div>
  );
}
