"use client";

import { Camera } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { getBrowserLocation } from "@/lib/geolocation";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { OpenVisit } from "@/lib/visits";

export function CheckInButton({
  locationId,
  locale,
  onStarted,
}: {
  locationId: string;
  locale: Locale;
  onStarted: (visit: OpenVisit) => void;
}) {
  const dict = getDictionary(locale).visit;
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleClick() {
    if (!file) {
      setStatus("error");
      setMessage(dict.checkInPhotoRequiredError);
      return;
    }

    setStatus("locating");
    setMessage(null);

    // On-site presence is the whole point of "I'm here" — a visitor who
    // denies location access (or whose browser can't provide it) can't be
    // verified, so there's no fallback that lets the check-in through
    // anyway.
    const position = await getBrowserLocation();
    if (!position) {
      setStatus("error");
      setMessage(dict.locationRequiredError);
      return;
    }

    setStatus("loading");

    try {
      const formData = new FormData();
      formData.append("location_id", locationId);
      formData.append("latitude", String(position.latitude));
      formData.append("longitude", String(position.longitude));
      formData.append("file", file);

      const res = await fetch("/api/visits", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        if (data.code === "too_far") {
          setMessage(dict.tooFarError);
        } else if (data.code === "location_required" || data.code === "photo_required") {
          setMessage(dict.checkInPhotoRequiredError);
        } else {
          setMessage(typeof data.error === "string" ? data.error : dict.genericError);
        }
        return;
      }

      setStatus("idle");
      setFile(null);
      onStarted({ id: data.id, locationId: data.location_id, startedAt: data.started_at });
    } catch {
      setStatus("error");
      setMessage(dict.networkError);
    }
  }

  const busy = status === "locating" || status === "loading";

  return (
    <div className="mt-4 space-y-1.5 border-t border-warm-border pt-4">
      <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-warm-border bg-white px-3 py-1.5 text-sm text-fjord transition-colors hover:bg-ivory">
        <Camera className="h-4 w-4 text-steam" aria-hidden />
        {file ? dict.photoSelected : dict.takeCheckInPhoto}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
      <p className="text-xs text-steam">{dict.checkInPhotoHint}</p>

      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !file}
        className="w-full rounded-lg bg-ember px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {status === "locating" ? dict.locating : status === "loading" ? dict.checkingIn : dict.checkIn}
      </button>
      {message && <p className="text-xs text-busy">{message}</p>}
    </div>
  );
}
