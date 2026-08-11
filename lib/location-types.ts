import type { LocationType } from "./supabase/types";

export const locationTypeIcon: Record<LocationType, string> = {
  sauna: "♨️",
  sauna_swimming: "🧖",
  winter_swimming: "🏊",
  beach: "🏖️",
  ice_swimming: "🧊",
};

export const locationTypeLabel: Record<LocationType, string> = {
  sauna: "Sauna",
  sauna_swimming: "Sauna & swimming",
  winter_swimming: "Winter swimming",
  beach: "Beach",
  ice_swimming: "Ice swimming",
};
