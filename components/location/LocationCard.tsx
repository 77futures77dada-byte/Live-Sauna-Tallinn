"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAge, getFreshness } from "@/lib/freshness";
import { locationTypeIcon, locationTypeLabel } from "@/lib/location-types";
import type { LatestIce, LatestOccupancy, LatestWater } from "@/lib/reports";
import type { Database } from "@/lib/supabase/types";
import type { StationObservation } from "@/lib/weather";
import { IceStatus } from "./IceStatus";
import { OccupancyBadge } from "./OccupancyBadge";
import { ReportButtons } from "./ReportButtons";
import { WaterTempStat } from "./WaterTempStat";
import { WeatherStrip } from "./WeatherStrip";

type Location = Database["public"]["Tables"]["locations"]["Row"];

type WeatherState =
  | { status: "loading" }
  | { status: "ready"; observation: StationObservation }
  | { status: "error" };

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function LocationCard({
  location,
  userId,
  occupancy,
  water,
  ice,
  onClose,
}: {
  location: Location;
  userId: string | null;
  occupancy?: LatestOccupancy;
  water?: LatestWater;
  ice?: LatestIce;
  onClose: () => void;
}) {
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/weather?slug=${location.slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((observation: StationObservation) => {
        if (!cancelled) setWeather({ status: "ready", observation });
      })
      .catch(() => {
        if (!cancelled) setWeather({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [location.slug]);

  const openingHours = location.opening_hours;
  const occupancyLevel = getFreshness(occupancy?.createdAt ?? null);

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
          <OccupancyBadge level={occupancyLevel} count={occupancy?.peopleCount} />
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {occupancy && occupancyLevel !== "unknown"
            ? `Updated ${formatAge(occupancy.createdAt)}`
            : "No live occupancy reports yet for this location."}
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

        <div className="mt-4 space-y-1.5">
          <WaterTempStat report={water} />
          <IceStatus report={ice} />
        </div>

        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {weather.status === "loading" && (
            <p className="text-sm text-zinc-400">Loading weather…</p>
          )}
          {weather.status === "error" && (
            <p className="text-sm text-zinc-400">Weather data unavailable.</p>
          )}
          {weather.status === "ready" && <WeatherStrip observation={weather.observation} />}
        </div>

        {userId ? (
          <ReportButtons locationId={location.id} />
        ) : (
          <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            to report status.
          </p>
        )}
      </div>
    </>
  );
}
