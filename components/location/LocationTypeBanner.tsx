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

// One mix-blend-mode: multiply wash per type over the real photo. The
// client's design notes put the lake blue-green "as a tint under
// photography", so each wash runs deep-lake -> warm woodsmoke charcoal
// (matching --color-lake / --color-fjord) rather than the flat grayscale
// it used before — varying in depth per type, not hue.
const tintByType: Record<LocationType, string> = {
  sauna: "linear-gradient(135deg, #1c3f3d 0%, #2a2018 55%, #5a4f42 130%)",
  sauna_swimming: "linear-gradient(135deg, #1c3f3d 0%, #26201b 45%, #5a4f42 130%)",
  winter_swimming: "linear-gradient(135deg, #163a3a 0%, #26201b 60%, #6d6152 140%)",
  beach: "linear-gradient(135deg, #1c3f3d 0%, #26201b 45%, #8a7c68 140%)",
  ice_swimming: "linear-gradient(135deg, #12302f 0%, #201b16 55%, #6d6152 140%)",
};

// Just a bottom scrim now — the repeating icon watermark pattern (see git
// history) was designed to give the old flat gradient placeholder some
// texture; over a real photo it just adds clutter. This only exists to
// keep the close button and any future overlaid text/status icons legible
// against busy photo detail.
const bottomScrim = "linear-gradient(180deg, rgba(42,32,24,0) 55%, rgba(42,32,24,0.45) 100%)";

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
