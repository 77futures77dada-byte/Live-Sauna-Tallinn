-- Admin moderation (docs/ARCHITECTURE.md Phase 4a section 3): a banned
-- user's own reports/visits/photos are rejected at the API layer (see
-- lib/moderation.ts and the checks added to app/api/occupancy,
-- app/api/water, app/api/ice, app/api/visits, app/api/photos) — this
-- column is what those checks read.

alter table profiles add column is_banned boolean not null default false;
