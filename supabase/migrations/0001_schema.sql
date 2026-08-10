-- Live Sauna Tallinn — initial schema
-- See docs/ARCHITECTURE.md sections 2 and 5 for the rationale.

create extension if not exists pgcrypto;

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  avatar_url text,
  reputation numeric default 0,
  reports_count int default 0,
  confirmed_reports int default 0,
  rejected_reports int default 0,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- locations
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- for QR/deep link: /location/harku
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  type text not null check (type in ('sauna','winter_swimming','beach','ice_swimming','sauna_swimming')),
  capacity int,                        -- null = not applicable (beach)
  booking_enabled boolean default false,
  opening_hours jsonb,                 -- {"mon": "07:00-21:00", ...}
  is_free boolean default true,
  created_at timestamptz default now()
);

-- occupancy_reports
create table occupancy_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  people_count int not null,
  created_at timestamptz default now()
);

-- water_reports
create table water_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id),
  temperature numeric not null,
  source text default 'user' check (source in ('user','sensor')),
  created_at timestamptz default now()
);

-- ice_reports
create table ice_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  condition text check (condition in ('none','partial','frozen')),
  created_at timestamptz default now()
);

-- visits
create table visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  rating int check (rating between 1 and 5),
  crowd_level text check (crowd_level in ('low','medium','high'))
);

-- photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  visit_id uuid references visits(id),
  type text check (type in ('before','after')),
  storage_url text not null,
  moderated boolean default false,
  created_at timestamptz default now()
);

-- bookings (schema present from Phase 0; UI/API deferred to Phase 4 — see
-- docs/ARCHITECTURE.md section 9.2)
create table bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  people_count int not null,
  status text default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at timestamptz default now()
);

-- ratings
create table ratings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  rating int check (rating between 1 and 5),
  created_at timestamptz default now(),
  unique(location_id, user_id)
);

-- Freshness queries always filter by location and sort by recency —
-- see docs/ARCHITECTURE.md section 2 ("Индексы, о которых стоит не забыть").
create index occupancy_reports_location_created_idx
  on occupancy_reports (location_id, created_at desc);
create index water_reports_location_created_idx
  on water_reports (location_id, created_at desc);
create index ice_reports_location_created_idx
  on ice_reports (location_id, created_at desc);

create index visits_location_id_idx on visits (location_id);
create index visits_user_id_idx on visits (user_id);
create index photos_location_id_idx on photos (location_id);
create index bookings_location_id_idx on bookings (location_id);
create index ratings_location_id_idx on ratings (location_id);
