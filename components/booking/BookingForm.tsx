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

// Appends "· N left" / "· Full" to a slot's own time label, from the
// per-slot booked counts fetched from /api/bookings/availability — this is
// what actually makes other people's bookings visible: without it, two
// visitors booking the same hour from two different phones have no way to
// know about each other until the server rejects the second one.
function annotateSlotLabels(
  labels: string[],
  slots: Date[],
  bookedCounts: Map<string, number>,
  capacity: number | null,
  dict: { spotsLeft: string; slotFull: string },
): string[] {
  if (capacity === null) return labels;

  return labels.map((label, index) => {
    const booked = bookedCounts.get(slots[index].toISOString()) ?? 0;
    const remaining = capacity - booked;
    if (remaining <= 0) return `${label} · ${dict.slotFull}`;
    if (booked > 0) return `${label} · ${dict.spotsLeft.replace("{n}", String(remaining))}`;
    return label;
  });
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
  fullSlots,
}: {
  slots: Date[];
  labels: string[];
  value: string;
  onChange: (value: string) => void;
  fullSlots: Set<string>;
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
        className="flex w-full items-center justify-between rounded-lg border border-warm-border bg-ivory px-2 py-1.5 text-left text-sm text-fjord transition-colors hover:border-fjord/30 focus:border-fjord focus:ring-2 focus:ring-fjord/25 focus:outline-none"
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
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-warm-border bg-ivory py-1 text-sm shadow-lg"
        >
          {slots.map((slot, index) => {
            const full = fullSlots.has(slot.toISOString());
            return (
              <li
                key={slot.toISOString()}
                role="option"
                aria-selected={index === selectedIndex}
                aria-disabled={full}
                onClick={() => {
                  if (full) return;
                  onChange(slot.toISOString());
                  setOpen(false);
                }}
                className={`px-2 py-1.5 ${full ? "cursor-not-allowed text-steam/50" : "cursor-pointer"} ${
                  index === selectedIndex && !full
                    ? "bg-fjord/10 font-semibold text-fjord"
                    : !full
                      ? "text-fjord hover:bg-ivory"
                      : ""
                }`}
              >
                {labels[index]}
              </li>
            );
          })}
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
  const rawSlotLabels = useMemo(() => formatSlots(slots, locale), [slots, locale]);
  const [startTime, setStartTime] = useState(slots[0].toISOString());
  const [peopleCount, setPeopleCount] = useState("1");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [bookedCounts, setBookedCounts] = useState<Map<string, number>>(new Map());

  // Other visitors' bookings, aggregated per hour (no names, no counts
  // attributable to anyone) — see app/api/bookings/availability. Refetched
  // whenever the form opens so a slot someone else just took shows up.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/bookings/availability?location_id=${locationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: { start_time: string; booked_people_count: number }[]) => {
        if (cancelled) return;
        setBookedCounts(new Map(rows.map((row) => [new Date(row.start_time).toISOString(), row.booked_people_count])));
      })
      .catch(() => {
        if (!cancelled) setBookedCounts(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const fullSlots = useMemo(() => {
    if (capacity === null) return new Set<string>();
    return new Set(
      slots
        .filter((slot) => (bookedCounts.get(slot.toISOString()) ?? 0) >= capacity)
        .map((slot) => slot.toISOString()),
    );
  }, [slots, bookedCounts, capacity]);

  const slotLabels = useMemo(
    () => annotateSlotLabels(rawSlotLabels, slots, bookedCounts, capacity, dict),
    [rawSlotLabels, slots, bookedCounts, capacity, dict],
  );

  // The chosen slot (startTime, set on explicit user selection) may have
  // filled up while availability was still loading or just after — derived
  // at render time rather than synced back with an effect + setState, so
  // it falls back to the first still-open slot without an extra render.
  const effectiveStartTime = fullSlots.has(startTime)
    ? (slots.find((slot) => !fullSlots.has(slot.toISOString()))?.toISOString() ?? startTime)
    : startTime;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (fullSlots.has(effectiveStartTime)) {
      setStatus("error");
      setMessage(dict.createFailed);
      return;
    }
    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, start_time: effectiveStartTime, people_count: peopleCount }),
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
        <TimeSlotSelect
          slots={slots}
          labels={slotLabels}
          value={effectiveStartTime}
          onChange={setStartTime}
          fullSlots={fullSlots}
        />
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
          disabled={status === "submitting" || fullSlots.has(effectiveStartTime)}
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
