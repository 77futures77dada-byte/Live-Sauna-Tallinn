export type GeolocationFailureReason =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout";

export type GeolocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: GeolocationFailureReason };

const TIMEOUT_MS = 5000;

// Resolves with a discriminated result — a caller that needs to explain
// *why* location failed (permission denied vs. a technical failure) can
// branch on `reason`. Never rejects. Calling getCurrentPosition is itself
// what triggers the browser's permission prompt the first time.
export function getBrowserLocationResult(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }

    let settled = false;
    const finish = (result: GeolocationResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        const reason: GeolocationFailureReason =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable";
        finish({ ok: false, reason });
      },
      { timeout: TIMEOUT_MS, maximumAge: 5 * 60_000 },
    );
  });
}

// Coords-or-null convenience wrapper for callers that don't strictly need
// location and can't be blocked by it (e.g. the assistant sheet).
export async function getBrowserLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const result = await getBrowserLocationResult();
  return result.ok ? { latitude: result.latitude, longitude: result.longitude } : null;
}
