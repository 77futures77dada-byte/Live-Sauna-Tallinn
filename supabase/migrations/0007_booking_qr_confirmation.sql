-- Phase 4a extension — QR-confirmed bookings (no staff, no payment yet).
--
-- Harku and Iglupark Noblessner both get booking_enabled = true, but a
-- "booking" here only reserves a slot on paper: the visitor's presence is
-- what actually counts, confirmed through the existing QR check-in flow
-- (app/api/visits). See docs/ARCHITECTURE.md section 9.5 for the
-- reasoning — without payment, a hold that isn't backed by a check-in
-- isn't a real hold.
--
-- Harku's type also moves from 'sauna_swimming' to 'sauna': it's three
-- igloo saunas with cold dipping, not a swimming-focused spot — capacity
-- (8) is unchanged. No runtime code branches on Harku's old type value
-- (checked: only lib/location-types.ts and the seed migration reference
-- 'sauna_swimming', neither location-specific).

-- bookings: track which visit fulfilled a booking, and widen status to
-- cover the fulfil/no-show outcomes of QR-confirmed attendance.
alter table bookings add column visit_id uuid references visits(id);

alter table bookings drop constraint bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('confirmed', 'cancelled', 'completed', 'fulfilled', 'no_show'));

-- photos: a booking's verification photo is tied to the booking, not a
-- visit (the visit doesn't exist yet at booking time).
alter table photos add column booking_id uuid references bookings(id);

alter table photos drop constraint photos_type_check;
alter table photos add constraint photos_type_check
  check (type in ('before', 'after', 'booking_verification'));

update locations set type = 'sauna', booking_enabled = true where slug = 'harku';
update locations set booking_enabled = true where slug = 'iglupark-noblessner';
