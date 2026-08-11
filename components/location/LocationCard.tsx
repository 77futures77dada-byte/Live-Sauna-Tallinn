"use client";

import { locationTypeIcon, locationTypeLabel } from "@/lib/location-types";
import type { Database } from "@/lib/supabase/types";
import { OccupancyBadge } from "./OccupancyBadge";

type Location = Database["public"]["Tables"]["locations"]["Row"];

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function LocationCard({
  location,
  onClose,
}: {
  location: Location;
  onClose: () => void;
}) {
  const openingHours = location.opening_hours;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900
                   sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-96 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{location.name}</h2>
            <p className="text-sm text-zinc-500">
              {locationTypeIcon[location.type]} {locationTypeLabel[location.type]}
              {location.is_free ? " · Free" : " · Paid"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {location.description && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {location.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {location.capacity !== null && (
            <span className="text-sm text-zinc-500">
              👥 Capacity: {location.capacity}
            </span>
          )}
          <OccupancyBadge level="unknown" />
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          No live occupancy reports yet for this location.
        </p>

        {openingHours && (
          <div className="mt-4 text-sm">
            <h3 className="font-medium text-zinc-700 dark:text-zinc-200">
              Opening hours
            </h3>
            <ul className="mt-1 space-y-0.5 text-zinc-500">
              {weekdays
                .filter((day) => day in openingHours)
                .map((day) => (
                  <li key={day}>
                    {day}: {openingHours[day]}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
