import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";

// The one deliberate warm touch against the monochrome dashboard chrome —
// same accent as ForecastStrip's today column and the "active" occupancy
// status (see lib/occupancy-status.ts), duplicated locally rather than
// centralized since each usage independently earned it.
const AMBER = "#f2b84b";

// Compact brand banner above the map+cards dashboard — distinct from
// HeroLanding (the full-screen pre-entry landing page): this is a strip,
// always visible once someone's past that landing screen, giving the
// single-site pilot the same visual weight a whole-city map used to carry
// on its own. Reuses hero.eyebrow rather than inventing a parallel string
// just for this banner.
//
// No photo — the stock sauna.webp shot used here previously was too soft
// to hold up at banner size, and a second attempt at photography wasn't
// worth it for one strip. Flat monochrome + the amber live accent instead,
// matching the rest of the dashboard chrome (app/globals.css).
export function LocatorHeroBanner({
  locale,
  totalSaunas,
  liveSnapshot,
}: {
  locale: Locale;
  totalSaunas: number;
  liveSnapshot: LiveSnapshot;
}) {
  const dict = getDictionary(locale);

  return (
    <div className="relative overflow-hidden border-b border-warm-border bg-ivory-shade">
      {/* Thin concentric ripples, decoration only — a nod to the lake
          without needing a photo. Purely linework in the border tone so it
          reads as texture, not content, in either theme. */}
      <svg
        className="pointer-events-none absolute top-1/2 right-[-40px] hidden h-[220px] w-[220px] -translate-y-1/2 text-warm-border sm:block"
        viewBox="0 0 220 220"
        fill="none"
        aria-hidden
      >
        <circle cx="110" cy="110" r="40" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="110" cy="110" r="72" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="110" cy="110" r="104" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative mx-auto flex max-w-[1360px] flex-col justify-center gap-3 px-4 py-8 sm:py-10 lg:px-8">
        <p className="text-xs font-medium tracking-[0.2em] text-steam uppercase">
          {dict.hero.eyebrow}
        </p>
        <h1 className="font-display text-4xl leading-none font-semibold text-fjord sm:text-5xl">
          Harku
        </h1>

        {/* Unconditional format ("3 saunas · N people right now") rather
            than the old active-locations-gated chip that swapped to a
            generic "be the first" message whenever nothing was reporting
            yet — the sauna count itself is worth showing even at 0
            people, and it's the one number here that never changes. */}
        <div
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2"
          style={{ backgroundColor: `${AMBER}1f`, borderColor: `${AMBER}59` }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
            style={{ backgroundColor: AMBER }}
            aria-hidden
          />
          <span className="text-sm font-medium text-fjord">
            {dict.hero.liveSnapshotBanner
              .replace("{total}", String(totalSaunas))
              .replace("{people}", String(liveSnapshot.peopleCount))}
          </span>
        </div>
      </div>
    </div>
  );
}
