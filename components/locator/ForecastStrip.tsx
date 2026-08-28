"use client";

import { Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";
import { weatherCodeIcon } from "@/lib/weather-icons";
import type { DailyForecast } from "@/lib/forecast";

type ForecastState =
  | { status: "loading" }
  | { status: "ready"; days: DailyForecast[] }
  | { status: "error" };

// The one deliberate warm touch in this otherwise monochrome strip (see
// lib/occupancy-status.ts / HeroLanding.tsx for the same idea elsewhere) —
// picks today's column out of the row, not applied anywhere else here.
const TODAY_ACCENT = "#f2b84b";

const DAYS_SHOWN = 6;

export function ForecastStrip({
  latitude,
  longitude,
  locale,
}: {
  latitude: number;
  longitude: number;
  locale: Locale;
}) {
  const dict = getDictionary(locale).forecast;
  const [state, setState] = useState<ForecastState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/forecast?lat=${latitude}&lon=${longitude}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { days: DailyForecast[] }) => {
        if (!cancelled) setState({ status: "ready", days: data.days.slice(0, DAYS_SHOWN) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (state.status === "error") return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-6 rounded-3xl border border-warm-border bg-ivory p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-sm font-semibold text-fjord">{dict.title}</h2>

      {state.status === "loading" && (
        <p className="mt-2 text-sm text-steam">{dict.loading}</p>
      )}

      {state.status === "ready" && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {state.days.map((day) => {
            const isToday = day.date === todayIso;
            const Icon = weatherCodeIcon(day.weatherCode);
            const weekday = new Date(`${day.date}T12:00:00`).toLocaleDateString(
              bcp47Locale[locale],
              { weekday: "short" },
            );

            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1 rounded-xl py-2 text-center"
                style={
                  isToday
                    ? { backgroundColor: `${TODAY_ACCENT}1a`, border: `1px solid ${TODAY_ACCENT}4d` }
                    : undefined
                }
              >
                <span
                  className="text-xs font-medium capitalize"
                  style={{ color: isToday ? TODAY_ACCENT : undefined }}
                >
                  {isToday ? dict.today : weekday}
                </span>
                <Icon
                  className={`h-5 w-5 ${isToday ? "" : "text-fjord"}`}
                  style={isToday ? { color: TODAY_ACCENT } : undefined}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-fjord">
                  {Math.round(day.temperatureMax)}°
                </span>
                <span className="text-xs text-steam">{Math.round(day.temperatureMin)}°</span>
                <span className="flex items-center gap-0.5 text-[10px] text-steam">
                  <Wind className="h-2.5 w-2.5" aria-hidden />
                  {Math.round(day.windSpeedMax)} m/s
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
