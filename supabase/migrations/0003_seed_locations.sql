-- Phase 1 seed data — 7 real Tallinn-area locations.
--
-- Coordinates were geocoded via OSM Nominatim (structured address/POI
-- lookups, not guessed) on 2026-08-11. opening_hours is left null for all
-- rows: none of the sources checked gave a reliable per-weekday schedule,
-- so it's left for a follow-up pass rather than fabricated.

insert into locations (slug, name, description, latitude, longitude, type, capacity, booking_enabled, opening_hours, is_free)
values
  (
    'harku',
    'Harku',
    'Three free public igloo saunas on the shore of Lake Harku, with cold-water dipping straight into the lake.',
    59.4140481, 24.6325750,
    'sauna_swimming',
    8,
    false,
    null,
    true
  ),
  (
    'iglupark-noblessner',
    'Iglupark Noblessner',
    'Paid, year-round seaside saunas at the Noblessner harbor.',
    59.4533641, 24.7335572,
    'sauna',
    null,
    false,
    null,
    false
  ),
  (
    'stroomi',
    'Stroomi',
    'Tallinn''s official Stroomi beach on Kopli Bay, popular for winter swimming.',
    59.4430894, 24.6840831,
    'winter_swimming',
    null,
    false,
    null,
    true
  ),
  (
    'pikakari',
    'Pikakari',
    'A quieter winter-swimming beach next to the Paljassaare nature reserve.',
    59.4737477, 24.7238012,
    'winter_swimming',
    null,
    false,
    null,
    true
  ),
  (
    'kakumae',
    'Kakumäe',
    'A calm, family-friendly beach on the Kakumäe peninsula.',
    59.4509185, 24.5805703,
    'beach',
    null,
    false,
    null,
    true
  ),
  (
    'pirita',
    'Pirita',
    'Tallinn''s largest beach, home to an active winter swimming club.',
    59.4781665, 24.8354441,
    'winter_swimming',
    null,
    false,
    null,
    true
  ),
  (
    'aegna',
    'Aegna',
    'Winter swimming for the committed — accessible only by ferry to Aegna island.',
    59.5812970, 24.7581971,
    'ice_swimming',
    null,
    false,
    null,
    true
  );
