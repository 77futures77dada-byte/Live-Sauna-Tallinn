import { Flame, Snowflake, ThermometerSnowflake, Umbrella, Waves, type LucideIcon } from "lucide-react";
import type { LocationType } from "./supabase/types";

// Lucide icons, not emoji — see docs/ARCHITECTURE.md Phase 4a. Picked so
// each of the 5 types stays visually distinct at 18px marker size:
// sauna_swimming pairs a thermometer with a snowflake (hot sauna, cold
// dip) rather than reusing sauna's flame or winter_swimming's waves.
export const locationTypeIconComponent: Record<LocationType, LucideIcon> = {
  sauna: Flame,
  sauna_swimming: ThermometerSnowflake,
  winter_swimming: Waves,
  beach: Umbrella,
  ice_swimming: Snowflake,
};
