"use client";

import { useState } from "react";
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
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : dict.genericError);
        return;
      }

      setStatus("idle");
      onStarted({ id: data.id, locationId: data.location_id, startedAt: data.started_at });
    } catch {
      setStatus("error");
      setMessage(dict.networkError);
    }
  }

  return (
    <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {status === "loading" ? dict.checkingIn : dict.checkIn}
      </button>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
