export class TimeoutError extends Error {
  constructor() {
    super("Request timed out");
    this.name = "TimeoutError";
  }
}

// fetch with a hard client-side deadline. Without this a stalled upload
// (flaky mobile connection, dead tunnel) leaves the UI on "Uploading…"
// forever with no way out — see the check-in / before-after photo flows.
// Rejects with TimeoutError when the deadline passes so callers can show
// a "took too long, retry" message distinct from a normal network error.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
