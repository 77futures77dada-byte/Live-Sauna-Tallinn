import Image from "next/image";
import { locationTypeIconComponent } from "@/lib/location-types";
import type { LocationType } from "@/lib/supabase/types";

// Real on-site photos of the Lake Harku sauna complex (see
// public/atmosphere/, originals in public/harku-real/) — keyed by activity,
// not per location (the `photos` table only holds per-visit before/after
// and booking-verification shots, not curated location photography). All
// three pilot locations are the same floating complex, so a type-keyed
// photo of it still reads true. sauna_swimming reuses the sauna photo and
// ice_swimming reuses the winter swimming photo — both pairs read as the
// same scene.
const photoByType: Record<LocationType, string> = {
  sauna: "/atmosphere/sauna.webp",
  sauna_swimming: "/atmosphere/sauna.webp",
  winter_swimming: "/atmosphere/winter-swimming.webp",
  ice_swimming: "/atmosphere/winter-swimming.webp",
  beach: "/atmosphere/beach.webp",
};

// The old fire-and-ice color wash (warm orange for sauna, cold blue for
// winter swimming) was brand decoration, not information — gone under the
// monochrome rebrand along with Ember/Frost. Grayscale-only now, still one
// mix-blend-mode: multiply wash per type over the real photo, just varying
// in depth/contrast rather than hue.
const tintByType: Record<LocationType, string> = {
  sauna: "linear-gradient(135deg, #111111 0%, #3f3f3f 55%, #6b6b6b 130%)",
  sauna_swimming: "linear-gradient(135deg, #111111 0%, #3a3a3a 45%, #6b6b6b 130%)",
  winter_swimming: "linear-gradient(135deg, #111111 0%, #3a3a3a 60%, #808080 140%)",
  beach: "linear-gradient(135deg, #111111 0%, #3a3a3a 45%, #a3a3a3 140%)",
  ice_swimming: "linear-gradient(135deg, #0a0a0a 0%, #2e2e2e 55%, #808080 140%)",
};

// Just a bottom scrim now — the repeating icon watermark pattern (see git
// history) was designed to give the old flat gradient placeholder some
// texture; over a real photo it just adds clutter. This only exists to
// keep the close button and any future overlaid text/status icons legible
// against busy photo detail.
const bottomScrim = "linear-gradient(180deg, rgba(17,17,17,0) 55%, rgba(17,17,17,0.45) 100%)";

export function LocationTypeBanner({
  type,
  className = "",
}: {
  type: LocationType;
  className?: string;
}) {
  const Icon = locationTypeIconComponent[type];

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} aria-hidden>
      <Image src={photoByType[type]} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" style={{ objectFit: "cover" }} />
      <div
        className="absolute inset-0 opacity-50 mix-blend-multiply"
        style={{ background: tintByType[type] }}
      />
      <div className="absolute inset-0" style={{ background: bottomScrim }} />
      <Icon className="relative h-14 w-14 text-white/70 drop-shadow" strokeWidth={1.5} />
    </div>
  );
}
