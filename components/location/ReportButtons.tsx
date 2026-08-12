"use client";

import { useState, type FormEvent } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

type SubmitState = "idle" | "submitting" | "success" | "error";

function useReportSubmit(endpoint: string, dict: ReturnType<typeof getDictionary>["report"]) {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(body: Record<string, unknown>) {
    setState("submitting");
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(typeof data.error === "string" ? data.error : dict.genericError);
        return;
      }
      setState("success");
      setMessage(dict.thanks);
    } catch {
      setState("error");
      setMessage(dict.networkError);
    }
  }

  return { state, message, submit };
}

const inputClass =
  "w-28 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent";
const buttonClass =
  "rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

export function ReportButtons({ locationId, locale }: { locationId: string; locale: Locale }) {
  const dict = getDictionary(locale).report;
  const occupancyReport = useReportSubmit("/api/occupancy", dict);
  const waterReport = useReportSubmit("/api/water", dict);
  const iceReport = useReportSubmit("/api/ice", dict);

  const [peopleCount, setPeopleCount] = useState("");
  const [temperature, setTemperature] = useState("");
  const [condition, setCondition] = useState<"none" | "partial" | "frozen">("none");

  function handleOccupancy(event: FormEvent) {
    event.preventDefault();
    const count = Number(peopleCount);
    if (!Number.isInteger(count) || count < 0) return;
    occupancyReport.submit({ location_id: locationId, people_count: count });
  }

  function handleWater(event: FormEvent) {
    event.preventDefault();
    const temp = Number(temperature);
    if (!Number.isFinite(temp)) return;
    waterReport.submit({ location_id: locationId, temperature: temp });
  }

  function handleIce(event: FormEvent) {
    event.preventDefault();
    iceReport.submit({ location_id: locationId, condition });
  }

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{dict.title}</h3>

      <form onSubmit={handleOccupancy} className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder={dict.peopleCountPlaceholder}
          value={peopleCount}
          onChange={(event) => setPeopleCount(event.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={occupancyReport.state === "submitting"}
          className={buttonClass}
        >
          {dict.reportOccupancy}
        </button>
      </form>
      {occupancyReport.message && (
        <p
          className={`text-xs ${occupancyReport.state === "error" ? "text-red-600" : "text-emerald-600"}`}
        >
          {occupancyReport.message}
        </p>
      )}

      <form onSubmit={handleWater} className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          placeholder={dict.waterPlaceholder}
          value={temperature}
          onChange={(event) => setTemperature(event.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={waterReport.state === "submitting"}
          className={buttonClass}
        >
          {dict.reportWater}
        </button>
      </form>
      {waterReport.message && (
        <p
          className={`text-xs ${waterReport.state === "error" ? "text-red-600" : "text-emerald-600"}`}
        >
          {waterReport.message}
        </p>
      )}

      <form onSubmit={handleIce} className="flex items-center gap-2">
        <select
          value={condition}
          onChange={(event) => setCondition(event.target.value as typeof condition)}
          className={inputClass}
        >
          <option value="none">{dict.noIce}</option>
          <option value="partial">{dict.partialIce}</option>
          <option value="frozen">{dict.frozen}</option>
        </select>
        <button
          type="submit"
          disabled={iceReport.state === "submitting"}
          className={buttonClass}
        >
          {dict.reportIce}
        </button>
      </form>
      {iceReport.message && (
        <p
          className={`text-xs ${iceReport.state === "error" ? "text-red-600" : "text-emerald-600"}`}
        >
          {iceReport.message}
        </p>
      )}
    </div>
  );
}
