"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

function LocationEditForm({
  location,
  onSaved,
  onCancel,
}: {
  location: Location;
  onSaved: (updated: Location) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [descriptionEt, setDescriptionEt] = useState(location.description_et ?? "");
  const [descriptionEn, setDescriptionEn] = useState(location.description_en ?? "");
  const [descriptionRu, setDescriptionRu] = useState(location.description_ru ?? "");
  const [capacity, setCapacity] = useState(location.capacity?.toString() ?? "");
  const [openingHours, setOpeningHours] = useState(
    location.opening_hours ? JSON.stringify(location.opening_hours, null, 2) : "",
  );
  const [bookingEnabled, setBookingEnabled] = useState(location.booking_enabled);
  const [isFree, setIsFree] = useState(location.is_free);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: location.id,
          name,
          description_et: descriptionEt,
          description_en: descriptionEn,
          description_ru: descriptionRu,
          capacity,
          opening_hours: openingHours,
          booking_enabled: bookingEnabled,
          is_free: isFree,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Failed to save");
        return;
      }

      onSaved(data);
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Description (Estonian)
          </label>
          <textarea
            value={descriptionEt}
            onChange={(e) => setDescriptionEt(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Description (English) — fallback when a translation is missing
          </label>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Description (Russian)
          </label>
          <textarea
            value={descriptionRu}
            onChange={(e) => setDescriptionRu(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Capacity</label>
          <input
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="—"
            className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
          />
        </div>
        <label className="mt-5 flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free
        </label>
        <label className="mt-5 flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={bookingEnabled}
            onChange={(e) => setBookingEnabled(e.target.checked)}
          />
          Booking enabled
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Opening hours (JSON, e.g. {'{"mon":"07:00-21:00"}'}, or empty)
        </label>
        <textarea
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "saving" ? "Saving…" : "Save"}
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

export function LocationsAdminTable({ locations: initial }: { locations: Location[] }) {
  const [locations, setLocations] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ul className="mt-4 space-y-2">
      {locations.map((location) => (
        <li key={location.id} className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{location.name}</p>
              <p className="text-xs text-zinc-500">
                {location.type} · {location.is_free ? "Free" : "Paid"} ·{" "}
                {location.booking_enabled ? "Booking on" : "Booking off"} ·{" "}
                {location.capacity !== null ? `Capacity ${location.capacity}` : "No capacity limit"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingId(editingId === location.id ? null : location.id)}
              className="rounded-lg px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {editingId === location.id ? "Close" : "Edit"}
            </button>
          </div>

          {editingId === location.id && (
            <LocationEditForm
              location={location}
              onCancel={() => setEditingId(null)}
              onSaved={(updated) => {
                setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                setEditingId(null);
              }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
