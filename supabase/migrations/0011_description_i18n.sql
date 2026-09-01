-- Per-language description columns — the single `description` column
-- always rendered its (English) seed text regardless of the viewer's
-- locale. `description` itself is left in place rather than dropped
-- (unused by the app after this migration) since dropping is a
-- separate, more invasive change.

alter table locations
  add column description_et text,
  add column description_en text,
  add column description_ru text;

update locations
set description_en = description
where description is not null;

-- Real copy for the three live Harku igloo saunas (0009_harku_pilot.sql),
-- translated by hand — matched by exact current text rather than slug so
-- it only touches rows that still carry the original seed description.
update locations
set
  description_et = 'Üks kolmest tasuta avalikust iglusaunast Harku järve kaldal — kastuda saab otse külma järvevette.',
  description_ru = 'Одна из трёх бесплатных общественных саун-иглу на берегу озера Харку — окунуться в холодную воду можно прямо у сауны.'
where description = 'One of three free public igloo saunas on the shore of Lake Harku, with cold-water dipping straight into the lake.';
