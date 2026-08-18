-- Deleting a user currently fails unconditionally: profiles.id references
-- auth.users(id) with no ON DELETE behavior, and every signup gets a
-- profiles row via the on_auth_user_created trigger (0002_rls.sql), so
-- the FK blocks every deletion, not just ones with real activity.
--
-- Split by what the referencing row actually represents:
--   - profiles and photos are the account's own data (identity, private
--     per-visit proof shots) — cascade with the account.
--   - occupancy/water/ice reports, visits, bookings, and ratings are
--     historical/aggregate records whose value outlives the reporting
--     user (what a location was like, its traffic, its average rating) —
--     anonymize instead of deleting the row.

-- profiles -> auth.users: delete the profile with the account.
alter table profiles drop constraint profiles_id_fkey;
alter table profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- photos -> profiles: private per-visit proof shots, not community data.
alter table photos drop constraint photos_user_id_fkey;
alter table photos add constraint photos_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- occupancy_reports / water_reports / ice_reports -> profiles: append-only
-- historical log (0002_rls.sql: "no update/delete policy ... append-only
-- log"). The observation stays true regardless of who reported it, so
-- anonymize (SET NULL) rather than delete. water_reports.user_id was
-- already nullable (sensor-sourced rows have no user); occupancy/ice need
-- the same relaxation to allow the null.
alter table occupancy_reports alter column user_id drop not null;
alter table occupancy_reports drop constraint occupancy_reports_user_id_fkey;
alter table occupancy_reports add constraint occupancy_reports_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

alter table water_reports drop constraint water_reports_user_id_fkey;
alter table water_reports add constraint water_reports_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

alter table ice_reports alter column user_id drop not null;
alter table ice_reports drop constraint ice_reports_user_id_fkey;
alter table ice_reports add constraint ice_reports_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

-- visits -> profiles: check-in history has aggregate value (location
-- traffic over time) independent of who checked in. Once user_id is
-- null, visits_select_own_or_admin (0002_rls.sql) means only admins can
-- read the orphaned row — nobody can reclaim it as their own.
alter table visits alter column user_id drop not null;
alter table visits drop constraint visits_user_id_fkey;
alter table visits add constraint visits_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

-- bookings -> profiles: reservation record kept for capacity-planning
-- history, anonymized rather than erased.
alter table bookings alter column user_id drop not null;
alter table bookings drop constraint bookings_user_id_fkey;
alter table bookings add constraint bookings_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

-- ratings -> profiles: a location's aggregate score shouldn't shift just
-- because a reviewer deleted their account. unique(location_id, user_id)
-- still holds after this — Postgres treats NULL as distinct per row, so
-- multiple anonymized ratings on the same location don't collide.
alter table ratings alter column user_id drop not null;
alter table ratings drop constraint ratings_user_id_fkey;
alter table ratings add constraint ratings_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;
