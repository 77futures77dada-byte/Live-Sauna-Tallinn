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

const inputClass = "w-28 rounded-lg border border-warm-border px-2 py-1 text-sm text-fjord";
const buttonClass =
  "rounded-lg border border-ember bg-ivory-shade/40 px-3 py-1 text-sm font-medium text-ember transition hover:bg-ember/10 disabled:opacity-50";

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
    <div className="mt-4 space-y-3 border-t border-warm-border pt-4">
      <h3 className="text-sm font-medium text-fjord">{dict.title}</h3>

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
          className={`text-xs ${occupancyReport.state === "error" ? "text-busy" : "text-quiet"}`}
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
          className={`text-xs ${waterReport.state === "error" ? "text-busy" : "text-quiet"}`}
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
          className={`text-xs ${iceReport.state === "error" ? "text-busy" : "text-quiet"}`}
        >
          {iceReport.message}
        </p>
      )}
    </div>
  );
}
