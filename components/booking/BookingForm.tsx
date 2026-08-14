"use client";

import { Camera } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { nextHourSlots } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";

const SLOT_COUNT = 12;

function formatSlot(date: Date, locale: Locale): string {
  return date.toLocaleString(bcp47Locale[locale], {
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
  locale,
  onCreated,
  onCancel,
}: {
  locationId: string;
  capacity: number | null;
  locale: Locale;
  onCreated: (booking: Booking) => void;
  onCancel: () => void;
}) {
  const dict = getDictionary(locale).booking;
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
      setMessage(dict.photoRequiredError);
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
        setMessage(typeof data.error === "string" ? data.error : dict.createFailed);
        return;
      }

      onCreated(data as Booking);
    } catch {
      setStatus("error");
      setMessage(dict.networkError);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg bg-ivory p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-steam">{dict.timeSlot}</label>
        <select
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          className="w-full rounded-lg border border-warm-border px-2 py-1 text-sm text-fjord"
        >
          {slots.map((slot) => (
            <option key={slot.toISOString()} value={slot.toISOString()}>
              {formatSlot(slot, locale)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-steam">
          {dict.people} {capacity !== null ? `(${dict.maxSuffix} ${capacity})` : ""}
        </label>
        <input
          type="number"
          min={1}
          max={capacity ?? undefined}
          value={peopleCount}
          onChange={(event) => setPeopleCount(event.target.value)}
          className="w-24 rounded-lg border border-warm-border px-2 py-1 text-sm text-fjord"
        />
      </div>

      <div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-warm-border bg-white px-3 py-1.5 text-sm text-fjord transition-colors hover:bg-ivory">
          <Camera className="h-4 w-4 text-steam" aria-hidden />
          {file ? dict.photoSelected : dict.takePhoto}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            required
          />
        </label>
        <p className="mt-1 text-xs text-steam">{dict.photoRequiredHint}</p>
      </div>

      <p className="text-xs text-steam">{dict.confirmNote}</p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {status === "submitting" ? dict.confirming : dict.confirmBooking}
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
