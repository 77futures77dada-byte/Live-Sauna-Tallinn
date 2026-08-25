"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/bookings";
import { bcp47Locale, getDictionary, type Locale } from "@/lib/i18n";
import type { BookingStatus } from "@/lib/supabase/types";
import { BookingForm } from "./BookingForm";

// confirmed = waiting on the visitor (caution/amber, "not resolved yet"),
// same quiet/busy/neutral vocabulary as occupancy status elsewhere
// otherwise — these are functional status colors, kept saturated even
// under the monochrome rebrand (see app/globals.css).
const statusColor: Record<BookingStatus, string> = {
  confirmed: "text-caution",
  fulfilled: "text-quiet",
  no_show: "text-busy",
  cancelled: "text-steam",
  completed: "text-steam",
};

function formatRange(booking: Booking, locale: Locale): string {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const tag = bcp47Locale[locale];
  return `${start.toLocaleString(tag, { weekday: "short", hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}`;
}

// Bookings here don't guarantee a physical hold by themselves — see the
// explanatory copy below and docs/ARCHITECTURE.md section 9.5. Shown on
// LocationCard for any location with booking_enabled.
export function BookingPanel({
  locationId,
  capacity,
  openingHours,
  locale,
  refreshToken,
}: {
  locationId: string;
  capacity: number | null;
  openingHours: Record<string, string> | null;
  locale: Locale;
  // Bumped by LocationCard when this location's open visit changes, so a
  // QR check-in that fulfills a booking is reflected without a manual
  // refresh.
  refreshToken: string | null;
}) {
  const dict = getDictionary(locale).booking;
  const statusLabel: Record<BookingStatus, string> = {
    confirmed: dict.statusConfirmed,
    fulfilled: dict.statusFulfilled,
    no_show: dict.statusNoShow,
    cancelled: dict.statusCancelled,
    completed: dict.statusCompleted,
  };
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
    <div className="mt-4 space-y-2 border-t border-warm-border pt-4">
      <h3 className="text-sm font-medium text-fjord">{dict.bookSlotTitle}</h3>
      <p className="text-xs text-steam">{dict.bookSlotHint}</p>

      {bookings && bookings.length > 0 && (
        <ul className="space-y-1">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between text-xs text-fjord">
              <span>
                {formatRange(booking, locale)} · {booking.people_count} {dict.people}
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
          openingHours={openingHours}
          locale={locale}
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
            className="w-full rounded-lg border border-warm-border px-3 py-1.5 text-sm font-medium text-fjord transition-colors hover:bg-ivory"
          >
            {dict.bookSlotButton}
          </button>
        )
      )}
    </div>
  );
}
