import Image from "next/image";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";

// Compact brand banner above the map+cards dashboard — distinct from
// HeroLanding (the full-screen pre-entry landing page): this is a strip,
// always visible once someone's past that landing screen, giving the
// single-site pilot the same visual weight a whole-city map used to carry
// on its own. Reuses hero.eyebrow rather than inventing a parallel string
// just for this banner.
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
    <div className="relative h-44 w-full overflow-hidden sm:h-52 lg:h-60">
      <Image
        src="/atmosphere/sauna.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
      {/* Dark wash fading left-to-right, not a flat scrim over the whole
          photo — keeps the text block on the left fully legible while
          leaving the photo readable as itself on the right. */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(90deg, rgba(17,17,17,0.88) 0%, rgba(17,17,17,0.62) 48%, rgba(17,17,17,0.18) 100%)",
        }}
      />
      <div className="relative mx-auto flex h-full max-w-[1360px] flex-col justify-center px-4 lg:px-8">
        <p className="text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
          {dict.hero.eyebrow}
        </p>
        <h1 className="mt-1 text-4xl leading-none font-semibold text-white sm:text-5xl">Harku</h1>

        {/* Unconditional format ("3 saunas · N people right now") rather
            than the old active-locations-gated chip that swapped to a
            generic "be the first" message whenever nothing was reporting
            yet — the sauna count itself is worth showing even at 0
            people, and it's the one number here that never changes. */}
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white" aria-hidden />
          <span className="text-sm font-medium text-white">
            {dict.hero.liveSnapshotBanner
              .replace("{total}", String(totalSaunas))
              .replace("{people}", String(liveSnapshot.peopleCount))}
          </span>
        </div>
      </div>
    </div>
  );
}
