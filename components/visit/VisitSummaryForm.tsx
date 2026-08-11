"use client";

import { useState, type FormEvent } from "react";

type CrowdLevel = "low" | "medium" | "high";

const crowdLevelLabel: Record<CrowdLevel, string> = {
  low: "Quiet",
  medium: "Moderate",
  high: "Busy",
};

export function VisitSummaryForm({
  visitId,
  onFinished,
  onCancel,
}: {
  visitId: string;
  onFinished: () => void;
  onCancel: () => void;
}) {
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
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }

      onFinished();
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50"
    >
      <div>
        <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Rating</p>
        <div className="flex gap-1 text-xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="leading-none"
            >
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          How busy was it?
        </label>
        <select
          value={crowdLevel}
          onChange={(event) => setCrowdLevel(event.target.value as CrowdLevel)}
          className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
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
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "submitting" ? "Finishing…" : "Finish visit"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </form>
  );
}
