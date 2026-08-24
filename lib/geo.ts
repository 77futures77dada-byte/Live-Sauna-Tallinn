const EARTH_RADIUS_KM = 6371;

// Great-circle distance via the haversine formula — plenty accurate at
// city scale, no need for anything more precise than a sidebar "N km away".
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// A check-in only counts if the visitor is actually at the location — see
// the "I'm here" geofence requirement. 200m comfortably covers typical
// consumer GPS error (often 10-50m, worse under tree cover or between
// buildings) while still rejecting a check-in from across town.
export const CHECKIN_RADIUS_METERS = 200;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return distanceKm(lat1, lon1, lat2, lon2) * 1000;
}
