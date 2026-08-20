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

// A soft top-left bloom layered over the photo, so the banner reads as lit
// from one corner rather than flat, plus a bottom scrim so the icon
// watermarks stay legible over busy photo detail.
const lightingOverlay = `
  radial-gradient(130% 90% at 12% -15%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%),
  linear-gradient(180deg, rgba(10,20,30,0.1) 0%, rgba(10,20,30,0.4) 100%)
`;

// Scattered, oversized, low-opacity copies of the type glyph — a tiled
// watermark rather than one small centered icon — so the banner feels like
// branded texture instead of a placeholder. Fixed positions (not a CSS
// tile) since these are React icon components, not a background-image.
const watermarks = [
  { top: "-12%", left: "-6%", size: 104, opacity: 0.14, rotate: -14 },
  { top: "8%", left: "34%", size: 64, opacity: 0.18, rotate: 10 },
  { top: "-6%", left: "68%", size: 88, opacity: 0.13, rotate: 6 },
  { top: "48%", left: "4%", size: 72, opacity: 0.12, rotate: 18 },
  { top: "42%", left: "82%", size: 96, opacity: 0.15, rotate: -8 },
  { top: "68%", left: "44%", size: 60, opacity: 0.17, rotate: -20 },
];

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
      <div className="absolute inset-0" style={{ background: lightingOverlay }} />
      {watermarks.map((mark, i) => (
        <Icon
          key={i}
          className="absolute text-white drop-shadow-sm"
          strokeWidth={1.25}
          style={{
            top: mark.top,
            left: mark.left,
            width: mark.size,
            height: mark.size,
            opacity: mark.opacity,
            transform: `rotate(${mark.rotate}deg)`,
          }}
        />
      ))}
      <Icon className="relative h-14 w-14 text-white/70 drop-shadow" strokeWidth={1.5} />
    </div>
  );
}
