import Image from "next/image";
import { locationTypeIconComponent } from "@/lib/location-types";
import type { LocationType } from "@/lib/supabase/types";

// Licensed stock photography (see public/atmosphere/) — one photo per
// activity, not per location (the `photos` table only holds per-visit
// before/after and booking-verification shots, not curated location
// photography, so there's nothing location-specific to show here).
// sauna_swimming reuses the sauna photo and ice_swimming reuses the winter
// swimming photo — both pairs read as the same scene.
const photoByType: Record<LocationType, string> = {
  sauna: "/atmosphere/sauna.webp",
  sauna_swimming: "/atmosphere/sauna.webp",
  winter_swimming: "/atmosphere/winter-swimming.webp",
  ice_swimming: "/atmosphere/winter-swimming.webp",
  beach: "/atmosphere/beach.webp",
};

// Same fire-and-ice language the gradient placeholder used, now as a color
// wash (mix-blend-mode: multiply) over the real photo instead of a flat
// fill, so each type still reads as warm (sauna) or cold (winter swimming)
// at a glance.
const tintByType: Record<LocationType, string> = {
  sauna: "linear-gradient(135deg, #0e2233 0%, #6a2f14 55%, #e8632c 130%)",
  sauna_swimming: "linear-gradient(135deg, #0e2233 0%, #2c5064 45%, #e8632c 130%)",
  winter_swimming: "linear-gradient(135deg, #0e2233 0%, #1c4a63 60%, #3fa9d6 140%)",
  beach: "linear-gradient(135deg, #0e2233 0%, #2c5064 45%, #d9cfbc 140%)",
  ice_swimming: "linear-gradient(135deg, #0a1620 0%, #16414f 55%, #3fa9d6 140%)",
};

// Just a bottom scrim now — the repeating icon watermark pattern (see git
// history) was designed to give the old flat gradient placeholder some
// texture; over a real photo it just adds clutter. This only exists to
// keep the close button and any future overlaid text/status icons legible
// against busy photo detail.
const bottomScrim = "linear-gradient(180deg, rgba(10,20,30,0) 55%, rgba(10,20,30,0.45) 100%)";

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
