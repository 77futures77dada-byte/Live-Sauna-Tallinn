"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/supabase/types";
import { BookingForm } from "./BookingForm";

const statusLabel: Record<BookingStatus, string> = {
  confirmed: "Confirmed — awaiting check-in",
  fulfilled: "Checked in ✓",
  no_show: "Missed (no check-in)",
  cancelled: "Cancelled",
  completed: "Completed",
};

const statusColor: Record<BookingStatus, string> = {
  confirmed: "text-amber-600 dark:text-amber-400",
  fulfilled: "text-emerald-600 dark:text-emerald-400",
  no_show: "text-red-600 dark:text-red-400",
  cancelled: "text-zinc-400",
  completed: "text-zinc-400",
};

function formatRange(booking: Booking): string {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  return `${start.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Bookings here don't guarantee a physical hold by themselves — see the
// explanatory copy below and docs/ARCHITECTURE.md section 9.5. Shown on
// LocationCard for any location with booking_enabled.
export function BookingPanel({
  locationId,
  capacity,
  refreshToken,
}: {
  locationId: string;
  capacity: number | null;
  // Bumped by LocationCard when this location's open visit changes, so a
  // QR check-in that fulfills a booking is reflected without a manual
  // refresh.
  refreshToken: string | null;
}) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/bookings?location_id=${locationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Booking[]) => {
        if (!cancelled) setBookings(data);
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, refreshToken]);

  const hasActiveConfirmed = bookings?.some((b) => b.status === "confirmed") ?? false;

  return (
    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Book a slot</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Booking reserves a time, not a physical place — confirm you&apos;re here by scanning the
        QR code on site. Slots not checked into by the end of the hour are marked as missed.
      </p>

      {bookings && bookings.length > 0 && (
        <ul className="space-y-1">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300"
            >
              <span>
                {formatRange(booking)} · {booking.people_count} people
              </span>
              <span className={statusColor[booking.status]}>{statusLabel[booking.status]}</span>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <BookingForm
          locationId={locationId}
          capacity={capacity}
          onCreated={(booking) => {
            setBookings((prev) => [booking, ...(prev ?? [])]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        !hasActiveConfirmed && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Book a slot
          </button>
        )
      )}
    </div>
  );
}
