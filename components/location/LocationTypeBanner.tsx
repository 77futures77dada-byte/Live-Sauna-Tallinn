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
      style={{ background: gradientByType[type] }}
      aria-hidden
    >
      <Icon className="h-16 w-16 text-white/20" strokeWidth={1.5} />
    </div>
  );
}
