"use client";

import { useState, type FormEvent } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

function useReportSubmit(endpoint: string) {
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
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }
      setState("success");
      setMessage("Thanks — reported!");
    } catch {
      setState("error");
      setMessage("Network error");
    }
  }

  return { state, message, submit };
}

const inputClass =
  "w-28 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent";
const buttonClass =
  "rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

export function ReportButtons({ locationId }: { locationId: string }) {
  const occupancyReport = useReportSubmit("/api/occupancy");
  const waterReport = useReportSubmit("/api/water");
  const iceReport = useReportSubmit("/api/ice");

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
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        Report status
      </h3>

      <form onSubmit={handleOccupancy} className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder="People count"
          value={peopleCount}
          onChange={(event) => setPeopleCount(event.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={occupancyReport.state === "submitting"}
          className={buttonClass}
        >
          Report occupancy
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
          placeholder="Water °C"
          value={temperature}
          onChange={(event) => setTemperature(event.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={waterReport.state === "submitting"}
          className={buttonClass}
        >
          Report water temp
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
          <option value="none">No ice</option>
          <option value="partial">Partial ice</option>
          <option value="frozen">Frozen</option>
        </select>
        <button
          type="submit"
          disabled={iceReport.state === "submitting"}
          className={buttonClass}
        >
          Report ice
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
