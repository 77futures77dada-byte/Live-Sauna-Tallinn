"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { nextHourSlots } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings";

const SLOT_COUNT = 12;

function formatSlot(date: Date): string {
  return date.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The verification-photo requirement and QR wording here are deliberate —
// see docs/ARCHITECTURE.md section 9.5: without payment, a booking only
// becomes a real hold once the visitor checks in on site.
export function BookingForm({
  locationId,
  capacity,
  onCreated,
  onCancel,
}: {
  locationId: string;
  capacity: number | null;
  onCreated: (booking: Booking) => void;
  onCancel: () => void;
}) {
  const [slots] = useState(() => nextHourSlots(SLOT_COUNT));
  const [startTime, setStartTime] = useState(slots[0].toISOString());
  const [peopleCount, setPeopleCount] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setStatus("error");
      setMessage("A verification photo is required to confirm a booking.");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    const formData = new FormData();
    formData.append("location_id", locationId);
    formData.append("start_time", startTime);
    formData.append("people_count", peopleCount);
    formData.append("file", file);

    try {
      const res = await fetch("/api/bookings", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Failed to create booking");
        return;
      }

      onCreated(data as Booking);
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
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Time slot
        </label>
        <select
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
        >
          {slots.map((slot) => (
            <option key={slot.toISOString()} value={slot.toISOString()}>
              {formatSlot(slot)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          People {capacity !== null ? `(max ${capacity})` : ""}
        </label>
        <input
          type="number"
          min={1}
          max={capacity ?? undefined}
          value={peopleCount}
          onChange={(event) => setPeopleCount(event.target.value)}
          className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          📷 {file ? "Photo selected ✓" : "Take verification photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            required
          />
        </label>
        <p className="mt-1 text-xs text-zinc-400">
          Required to confirm the booking — this is not the check-in photo, just proof you
          submitted the booking yourself.
        </p>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Booking a slot doesn&apos;t hold your place by itself — confirm you&apos;re here by
        scanning the QR code on site when you arrive.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "submitting" ? "Confirming…" : "Confirm booking"}
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
