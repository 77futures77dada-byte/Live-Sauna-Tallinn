import { locationTypeIconComponent } from "@/lib/location-types";
import type { LocationType } from "@/lib/supabase/types";

// There's no real location photo gallery in this app yet — the `photos`
// table only holds per-visit before/after and booking-verification shots
// (personal check-in proof, privately RLS-gated), not curated location
// photography, so there's nothing appropriate to show here today. Rather
// than a bare "no photo" placeholder, this is a tasteful stand-in: a
// gradient tuned per location type, echoing what it's actually like there
// (warm ember glow for a sauna, icy blue for a winter swim spot), with the
// type glyph as a large watermark.
const gradientByType: Record<LocationType, string> = {
  sauna: "linear-gradient(135deg, #0e2233 0%, #6a2f14 55%, #e8632c 130%)",
  sauna_swimming: "linear-gradient(135deg, #0e2233 0%, #2c5064 45%, #e8632c 130%)",
  winter_swimming: "linear-gradient(135deg, #0e2233 0%, #1c4a63 60%, #3fa9d6 140%)",
  beach: "linear-gradient(135deg, #0e2233 0%, #2c5064 45%, #d9cfbc 140%)",
  ice_swimming: "linear-gradient(135deg, #0a1620 0%, #16414f 55%, #3fa9d6 140%)",
};

// A soft top-left bloom layered over the diagonal gradient, so the banner
// reads as lit from one corner rather than a flat two-color fill.
const textureOverlay =
  "radial-gradient(130% 90% at 12% -15%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%)";

// Scattered, oversized, low-opacity copies of the type glyph — a tiled
// watermark rather than one small centered icon — so the banner feels like
// branded texture instead of a placeholder. Fixed positions (not a CSS
// tile) since these are React icon components, not a background-image.
const watermarks = [
  { top: "-12%", left: "-6%", size: 104, opacity: 0.1, rotate: -14 },
  { top: "8%", left: "34%", size: 64, opacity: 0.14, rotate: 10 },
  { top: "-6%", left: "68%", size: 88, opacity: 0.09, rotate: 6 },
  { top: "48%", left: "4%", size: 72, opacity: 0.08, rotate: 18 },
  { top: "42%", left: "82%", size: 96, opacity: 0.11, rotate: -8 },
  { top: "68%", left: "44%", size: 60, opacity: 0.13, rotate: -20 },
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
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `${textureOverlay}, ${gradientByType[type]}` }}
      aria-hidden
    >
      {watermarks.map((mark, i) => (
        <Icon
          key={i}
          className="absolute text-white"
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
      <Icon className="relative h-14 w-14 text-white/30" strokeWidth={1.5} />
    </div>
  );
}
