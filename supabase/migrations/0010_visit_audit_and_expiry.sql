-- Visit audit trail + abandoned-visit auto-close (B2G reliability pass).
--
-- Run this manually via the Supabase SQL editor — there is no local CLI
-- for this project (same note as 0004_enable_realtime.sql).
--
-- 1. Check-in already validates the browser's geolocation against the
--    location (haversine, CHECKIN_RADIUS_METERS — lib/geo.ts), but the
--    coordinates were only used transiently and then discarded. The
--    municipality needs a real audit trail of where each check-in
--    happened, so persist the pair on the visit row.
--
--    Nullable on purpose: visits created before this migration have no
--    recorded coordinates, and — like the historical rows kept in 0008 —
--    they are not backfilled.
--
-- 2. A visit that is never finished manually stays finished_at IS NULL
--    forever, and the Phase 3 "one open visit per user" rule then blocks
--    that user from checking in anywhere else indefinitely. The official
--    maximum session is 3 hours; auto_closed marks a visit that the app
--    force-closed after a grace window (4h — see lib/visits.ts) so it is
--    distinguishable from a normally finished visit in reporting and does
--    not count toward reputation (which requires a rating).

alter table visits add column latitude double precision;
alter table visits add column longitude double precision;
alter table visits add column auto_closed boolean not null default false;
