// location.slug -> nearest Ilmateenistus observation station name, picked
// by straight-line distance from the live feed fetched 2026-08-11 (see
// docs/ARCHITECTURE.md section 9.3). Several locations share a station,
// which the architecture doc calls out as fine for MVP. Stations that
// don't report watertemperature simply mean that location shows no water
// block (lib/weather.ts returns null, nothing is invented).
//
//   harku                -> Tallinn-Harku  (2.44km, no water — inland lake)
//   iglupark-noblessner  -> Pirita         (5.22km, water)
//   stroomi              -> Tallinn-Harku  (6.79km, no water)
//   pikakari             -> Pirita         (5.50km, water)
//   kakumae              -> Tilgu          (5.25km, water)
//   pirita               -> Pirita         (1.33km, water)
//   aegna                -> Rohuneeme      (3.14km, no water)
export const stationBySlug: Record<string, string> = {
  harku: "Tallinn-Harku",
  "iglupark-noblessner": "Pirita",
  stroomi: "Tallinn-Harku",
  pikakari: "Pirita",
  kakumae: "Tilgu",
  pirita: "Pirita",
  aegna: "Rohuneeme",
};
