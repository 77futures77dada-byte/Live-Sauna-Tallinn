-- Row Level Security — see docs/ARCHITECTURE.md section 3.
--
-- Reports (occupancy/water/ice) are an append-only log: no update/delete
-- policy is created for them, so those operations are denied by default
-- once RLS is enabled. Admin-only mutations (locations, photo moderation,
-- profiles.is_admin/reputation) are expected to go through the service
-- role from server-side admin routes, not through user-facing RLS.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- profiles ------------------------------------------------------------

alter table profiles enable row level security;

create policy "profiles_select_all"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only username/avatar_url are owner-editable; reputation, report
-- counters, and is_admin are managed by triggers / the service role.
revoke update on profiles from authenticated;
grant update (username, avatar_url) on profiles to authenticated;

-- Auto-create a profile row when a new auth user signs up, so every
-- authenticated user immediately satisfies the profiles(id) FK used
-- everywhere else. Runs as the table owner, bypassing RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ) || '_' || substr(new.id::text, 1, 8)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- locations -------------------------------------------------------------

alter table locations enable row level security;

create policy "locations_select_all"
  on locations for select
  using (true);

create policy "locations_admin_write"
  on locations for all
  using (public.is_admin())
  with check (public.is_admin());

-- occupancy / water / ice reports — public read, owner insert, immutable --

alter table occupancy_reports enable row level security;

create policy "occupancy_reports_select_all"
  on occupancy_reports for select
  using (true);

create policy "occupancy_reports_insert_own"
  on occupancy_reports for insert
  with check (auth.uid() = user_id);

alter table water_reports enable row level security;

create policy "water_reports_select_all"
  on water_reports for select
  using (true);

create policy "water_reports_insert_own"
  on water_reports for insert
  with check (auth.uid() = user_id);

alter table ice_reports enable row level security;

create policy "ice_reports_select_all"
  on ice_reports for select
  using (true);

create policy "ice_reports_insert_own"
  on ice_reports for insert
  with check (auth.uid() = user_id);

-- visits ------------------------------------------------------------------

alter table visits enable row level security;

create policy "visits_select_own_or_admin"
  on visits for select
  using (auth.uid() = user_id or public.is_admin());

create policy "visits_insert_own"
  on visits for insert
  with check (auth.uid() = user_id);

create policy "visits_update_own_while_open"
  on visits for update
  using (auth.uid() = user_id and finished_at is null)
  with check (auth.uid() = user_id);

-- photos --------------------------------------------------------------------

alter table photos enable row level security;

create policy "photos_select_moderated_or_own"
  on photos for select
  using (moderated = true or auth.uid() = user_id or public.is_admin());

create policy "photos_insert_own"
  on photos for insert
  with check (auth.uid() = user_id);

create policy "photos_delete_own"
  on photos for delete
  using (auth.uid() = user_id);

create policy "photos_admin_moderate"
  on photos for update
  using (public.is_admin())
  with check (public.is_admin());

-- bookings (schema present from Phase 0; UI/API deferred to Phase 4 —
-- see docs/ARCHITECTURE.md section 9.2) -------------------------------------

alter table bookings enable row level security;

create policy "bookings_select_own_or_admin"
  on bookings for select
  using (auth.uid() = user_id or public.is_admin());

create policy "bookings_insert_own"
  on bookings for insert
  with check (auth.uid() = user_id);

create policy "bookings_update_own_or_admin"
  on bookings for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ratings ---------------------------------------------------------------
-- Not covered by the RLS table in docs/ARCHITECTURE.md section 3; inferred
-- analogous to reports (public read, owner write) since ratings has a
-- unique(location_id, user_id) constraint implying users edit their own
-- rating rather than insert duplicates.

alter table ratings enable row level security;

create policy "ratings_select_all"
  on ratings for select
  using (true);

create policy "ratings_insert_own"
  on ratings for insert
  with check (auth.uid() = user_id);

create policy "ratings_update_own"
  on ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
