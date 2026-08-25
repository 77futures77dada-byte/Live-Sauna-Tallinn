"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { nextOpenHourSlots } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";

const SLOT_COUNT = 12;

// Slots are shown as bare "HH:MM" when they're all the same calendar day
// (the common case), since a weekday abbreviation adds nothing there — and
// in Estonian, Intl's "short" weekday is a single letter (e.g. "T" for
// Teisipäev/Tuesday), which reads as noise rather than context. Once slots
// span multiple days, a full date is shown instead of that abbreviation.
function formatSlots(slots: Date[], locale: Locale): string[] {
  const tag = bcp47Locale[locale];
  const sameDay = slots.every((slot) => slot.toDateString() === slots[0]?.toDateString());

  return slots.map((slot) =>
    sameDay
      ? slot.toLocaleString(tag, { hour: "2-digit", minute: "2-digit" })
      : slot.toLocaleString(tag, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
  );
}

// A native <select>'s own popup can't be restyled with CSS — its option
// list stays browser/OS chrome no matter what the closed control looks
// like — so the time-slot picker is a small hand-rolled listbox instead,
// styled to match the rest of the form. There's no existing dropdown
// component elsewhere in the app to reuse.
function TimeSlotSelect({
  slots,
  labels,
  value,
  onChange,
}: {
  slots: Date[];
  labels: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = slots.findIndex((slot) => slot.toISOString() === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && selectedIndex < slots.length - 1) {
      event.preventDefault();
      onChange(slots[selectedIndex + 1].toISOString());
    } else if (event.key === "ArrowUp" && selectedIndex > 0) {
      event.preventDefault();
      onChange(slots[selectedIndex - 1].toISOString());
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-warm-border bg-white px-2 py-1.5 text-left text-sm text-fjord transition-colors hover:border-fjord/30 focus:border-fjord focus:ring-2 focus:ring-fjord/25 focus:outline-none"
      >
        <span>{labels[selectedIndex] ?? ""}</span>
        <ChevronDown
          className={`h-4 w-4 text-steam transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-warm-border bg-white py-1 text-sm shadow-lg"
        >
          {slots.map((slot, index) => (
            <li
              key={slot.toISOString()}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => {
                onChange(slot.toISOString());
                setOpen(false);
              }}
              className={`cursor-pointer px-2 py-1.5 ${
                index === selectedIndex ? "bg-fjord/10 font-semibold text-fjord" : "text-fjord hover:bg-ivory"
              }`}
            >
              {labels[index]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// No verification photo at booking time — see docs/ARCHITECTURE.md section
// 9.5: presence is confirmed later, on site, by the check-in flow's own
// geolocation + before-photo requirement, and again by the after-photo at
// visit finish. A booking made remotely, ahead of the visit, can't produce
// an "on site" photo anyway. Without payment, a booking only becomes a real
// hold once that on-site check-in happens — the QR wording below reflects
// that.
export function BookingForm({
  locationId,
  capacity,
  openingHours,
  locale,
  onCreated,
  onCancel,
}: {
  locationId: string;
  capacity: number | null;
  openingHours: Record<string, string> | null;
  locale: Locale;
  onCreated: (booking: Booking) => void;
  onCancel: () => void;
}) {
  const dict = getDictionary(locale).booking;
  const [slots] = useState(() => nextOpenHourSlots(SLOT_COUNT, openingHours));
  const slotLabels = useMemo(() => formatSlots(slots, locale), [slots, locale]);
  const [startTime, setStartTime] = useState(slots[0].toISOString());
  const [peopleCount, setPeopleCount] = useState("1");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, start_time: startTime, people_count: peopleCount }),
      });
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
        <TimeSlotSelect slots={slots} labels={slotLabels} value={startTime} onChange={setStartTime} />
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

      <p className="text-xs text-steam">{dict.confirmNote}</p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-lg bg-fjord px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
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
