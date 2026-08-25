-- Harku pilot restructuring: the product moves from "every public sauna/
-- beach/winter-swimming spot in Tallinn" to one site — three igloo saunas
-- on Lake Harku. Everything else (Iglupark Noblessner, Stroomi, Pikakari,
-- Kakumäe, Pirita, Aegna, and the old single "Harku" row) is removed, and
-- Harku itself splits into three independently bookable/checkable
-- locations sharing one point on the lake.
--
-- location_id -> locations(id) had no ON DELETE behavior anywhere (all
-- seven tables below), so deleting a location currently fails outright.
-- Unlike user_id in 0008 (where historical reports outlive the reporting
-- account on purpose), a location's own history has no meaning once the
-- location itself is gone — CASCADE is the right call here, not
-- anonymize-and-keep.

alter table occupancy_reports drop constraint occupancy_reports_location_id_fkey;
alter table occupancy_reports add constraint occupancy_reports_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table water_reports drop constraint water_reports_location_id_fkey;
alter table water_reports add constraint water_reports_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table ice_reports drop constraint ice_reports_location_id_fkey;
alter table ice_reports add constraint ice_reports_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table visits drop constraint visits_location_id_fkey;
alter table visits add constraint visits_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table photos drop constraint photos_location_id_fkey;
alter table photos add constraint photos_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table bookings drop constraint bookings_location_id_fkey;
alter table bookings add constraint bookings_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

alter table ratings drop constraint ratings_location_id_fkey;
alter table ratings add constraint ratings_location_id_fkey
  foreign key (location_id) references locations(id) on delete cascade;

-- Drop the six locations outside the pilot, plus the old single "Harku"
-- row (replaced below by three) — cascades take their reports, visits,
-- bookings, photos, and ratings with them.
delete from locations
where slug in (
  'iglupark-noblessner', 'stroomi', 'pikakari', 'kakumae', 'pirita', 'aegna', 'harku'
);

-- Names are placeholders — client to confirm real names later (tracked
-- for the /admin follow-up pass). Same point on Lake Harku for all three
-- (client hasn't given per-sauna coordinates); capacity 8 uses the top of
-- the client's stated "6-8 people" range as a placeholder, also to be
-- corrected in /admin once known.
insert into locations (slug, name, description, latitude, longitude, type, capacity, booking_enabled, opening_hours, is_free)
values
  (
    'harku-1',
    'Sauna 1',
    'One of three free public igloo saunas on the shore of Lake Harku, with cold-water dipping straight into the lake.',
    59.4140481, 24.6325750,
    'sauna',
    8,
    true,
    null,
    true
  ),
  (
    'harku-2',
    'Sauna 2',
    'One of three free public igloo saunas on the shore of Lake Harku, with cold-water dipping straight into the lake.',
    59.4140481, 24.6325750,
    'sauna',
    8,
    true,
    null,
    true
  ),
  (
    'harku-3',
    'Sauna 3',
    'One of three free public igloo saunas on the shore of Lake Harku, with cold-water dipping straight into the lake.',
    59.4140481, 24.6325750,
    'sauna',
    8,
    true,
    null,
    true
  );
