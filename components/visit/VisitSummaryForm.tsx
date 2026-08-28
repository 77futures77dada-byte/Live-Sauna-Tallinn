"use client";

import { useState, type FormEvent } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

type CrowdLevel = "low" | "medium" | "high";

export function VisitSummaryForm({
  visitId,
  locale,
  onFinished,
  onCancel,
}: {
  visitId: string;
  locale: Locale;
  onFinished: () => void;
  onCancel: () => void;
}) {
  const dict = getDictionary(locale).visit;
  const crowdLevelLabel: Record<CrowdLevel, string> = {
    low: dict.crowdLow,
    medium: dict.crowdMedium,
    high: dict.crowdHigh,
  };
  const [rating, setRating] = useState(5);
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>("medium");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/visits/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visitId, rating, crowd_level: crowdLevel }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : dict.genericError);
        return;
      }

      onFinished();
    } catch {
      setStatus("error");
      setMessage(dict.networkError);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg bg-ivory p-3">
      <div>
        <p className="mb-1 text-xs font-medium text-steam">{dict.rating}</p>
        <div className="flex gap-1 text-xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={dict.starLabel[String(n) as "1" | "2" | "3" | "4" | "5"]}
              aria-pressed={rating === n}
              className={`leading-none ${n <= rating ? "text-fjord" : "text-steam"}`}
            >
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-steam">{dict.howBusy}</label>
        <select
          value={crowdLevel}
          onChange={(event) => setCrowdLevel(event.target.value as CrowdLevel)}
          className="w-full rounded-lg border border-warm-border px-2 py-1 text-sm text-fjord"
        >
          {(Object.keys(crowdLevelLabel) as CrowdLevel[]).map((level) => (
            <option key={level} value={level}>
              {crowdLevelLabel[level]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-lg bg-fjord px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {status === "submitting" ? dict.finishing : dict.finishVisit}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-steam transition-colors hover:bg-ivory"
        >
          {dict.cancel}
        </button>
      </div>
      {message && <p className="text-xs text-busy">{message}</p>}
    </form>
  );
}
