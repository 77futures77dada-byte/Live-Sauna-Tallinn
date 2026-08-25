import Image from "next/image";
import { Users } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";

// Compact brand banner above the map+cards dashboard — distinct from
// HeroLanding (the full-screen pre-entry landing page): this is a strip,
// always visible once someone's past that landing screen, giving the
// single-site pilot the same visual weight a whole-city map used to carry
// on its own. Reuses hero.* copy (eyebrow, live-snapshot strings) rather
// than inventing a parallel set just for this banner.
export function LocatorHeroBanner({
  locale,
  liveSnapshot,
}: {
  locale: Locale;
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

        <div
          className="mt-4 inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm"
          aria-label={
            liveSnapshot.activeLocations > 0
              ? dict.hero.liveSnapshotActive
                  .replace("{locations}", String(liveSnapshot.activeLocations))
                  .replace("{people}", String(liveSnapshot.peopleCount))
              : dict.hero.liveSnapshotEmpty
          }
        >
          {liveSnapshot.activeLocations > 0 ? (
            <>
              <span className="text-sm text-white">
                <span className="font-semibold">{liveSnapshot.activeLocations}</span>{" "}
                <span className="text-white/70">{dict.hero.liveSnapshotSpotsLabel}</span>
              </span>
              <span className="h-3 w-px bg-white/25" aria-hidden />
              <span className="text-sm text-white">
                <span className="font-semibold">{liveSnapshot.peopleCount}</span>{" "}
                <span className="text-white/70">{dict.hero.liveSnapshotPeopleLabel}</span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-white/85">
              <Users className="h-4 w-4" aria-hidden />
              {dict.hero.liveSnapshotEmpty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
