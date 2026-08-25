// location.slug -> nearest Ilmateenistus observation station name, picked
// by straight-line distance from the live feed fetched 2026-08-11 (see
// docs/ARCHITECTURE.md section 9.3). Stations that don't report
// watertemperature simply mean that location shows no water block
// (lib/weather.ts returns null, nothing is invented).
//
// All three Harku pilot saunas (0009_harku_pilot.sql) share one point on
// the lake, so they share one station too:
//   harku-1/2/3 -> Tallinn-Harku  (2.44km, no water — inland lake)
export const stationBySlug: Record<string, string> = {
  "harku-1": "Tallinn-Harku",
  "harku-2": "Tallinn-Harku",
  "harku-3": "Tallinn-Harku",
};
