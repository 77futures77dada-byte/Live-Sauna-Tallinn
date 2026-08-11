-- Tightens Aegna's coordinates from the island's landscape-conservation
-- centroid (0003_seed_locations.sql) to the actual ferry harbor (Aegna
-- sadam), the practically correct "you are here" point for visitors —
-- geocoded via OSM Nominatim on 2026-08-12.
--
-- Investigated as part of a bug report that the marker sat "in the sea
-- near Loksa" — it doesn't; Aegna genuinely is an offshore island ~14km
-- north of Tallinn (see its own description: "accessible only by ferry").
-- Cross-checked against Wikipedia's Aegna Landscape Conservation Area DMS
-- coordinates (59.5806, 24.7417) and the general OSM island centroid
-- (59.5813, 24.7582) — all three cluster within ~1.5km of each other and
-- nowhere near Loksa (59.578, 25.717, ~55km further east). This migration
-- is a precision improvement, not a bug fix for the reported location.

update locations
set latitude = 59.5715138, longitude = 24.7574358
where slug = 'aegna';
