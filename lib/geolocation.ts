// Resolves with coordinates if the visitor grants permission, null for
// every other case (denied, unsupported, timed out) — never throws, so a
// caller that doesn't strictly need location can't be blocked by it.
// Calling getCurrentPosition is itself what triggers the browser's
// permission prompt the first time.
export function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timeout = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { timeout: 5000, maximumAge: 5 * 60_000 },
    );
  });
}
