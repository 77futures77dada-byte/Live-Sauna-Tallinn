import { getDictionary, type Locale } from "@/lib/i18n";

// Compact one-line live snapshot between the hero banner and the map:
// "🔥 N saunas active · 👥 M people · 🌊 X°C water · 🌡️ Y°C air".
//
// The first two numbers come from getLiveSnapshot() (fresh occupancy
// reports only). Water/air are the shared Ilmateenistus station reading
// fetched once in MapScreen — each is shown only when the station
// actually has that value, never invented.
export function LiveStatsBar({
  activeSaunas,
  peopleCount,
  waterTemperature,
  airTemperature,
  locale,
}: {
  activeSaunas: number;
  peopleCount: number;
  waterTemperature: number | null;
  airTemperature: number | null;
  locale: Locale;
}) {
  const dict = getDictionary(locale).liveStats;

  const segments = [
    `🔥 ${dict.saunasActive.replace("{n}", String(activeSaunas))}`,
    `👥 ${dict.people.replace("{n}", String(peopleCount))}`,
  ];
  if (waterTemperature !== null) {
    segments.push(`🌊 ${dict.water.replace("{t}", waterTemperature.toFixed(1))}`);
  }
  if (airTemperature !== null) {
    segments.push(`🌡️ ${dict.air.replace("{t}", airTemperature.toFixed(1))}`);
  }

  return (
    <div className="border-b border-warm-border bg-ivory">
      <div className="mx-auto max-w-[1360px] px-4 py-2.5 sm:px-6 lg:px-8">
        <p className="text-sm text-steam">{segments.join(" · ")}</p>
      </div>
    </div>
  );
}
