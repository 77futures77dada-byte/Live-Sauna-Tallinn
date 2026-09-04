-- Live queue (Phase: queue-redesign).
--
-- Run this manually via the Supabase SQL editor — there is no local CLI
-- for this project (same note as 0004_enable_realtime.sql /
-- 0010_visit_audit_and_expiry.sql).
--
-- The client's mockup shows a "living queue" per sauna — "2 gruppi ees ·
-- ~40 min" — with the explicit caveat that the numbers come from other
-- saunagoers who confirmed their presence, i.e. they are estimates, not an
-- official register. This table is the "joined the queue on site" signal;
-- the wait estimate is derived from it plus the existing `visits` history
-- (see lib/queue.ts), never from a hardcoded default.
--
-- One row = one group that has joined the queue at a location. left_at
-- IS NULL means still waiting; it is set when the group leaves manually,
-- when their queue entry is auto-expired (lib/queue.ts, same lazy pattern
-- as expireStaleVisits), or when they check in on site (POST /api/visits
-- closes it, the way a check-in fulfils a booking).

create table queue_entries (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  -- profiles(id) + on delete set null + nullable, matching visits/bookings
  -- in 0008: a closed queue entry still has aggregate value (how long the
  -- queue was over time is exactly the kind of B2G reporting the
  -- municipality asked for), independent of who was in it. Once user_id is
  -- null, queue_entries_select_own_or_admin means only admins can read the
  -- orphaned row.
  user_id uuid references profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

-- Aggregates ("how many groups are active at this location", "how many
-- joined before me") run through the service role in application code —
-- same pattern as getOpenVisitCountsByLocation / getBookedCountsForSlots —
-- so the only index that matters is the active-entries lookup.
create index queue_entries_active_by_location_idx
  on queue_entries (location_id, joined_at)
  where left_at is null;

create index queue_entries_active_by_user_idx
  on queue_entries (user_id)
  where left_at is null;

alter table queue_entries enable row level security;

-- Raw rows: owner or admin only — same as visits/bookings. The public
-- queue numbers never come from this policy; they are a service-role
-- aggregate (lib/queue.ts) that returns per-location counts only.
create policy "queue_entries_select_own_or_admin"
  on queue_entries for select
  using (auth.uid() = user_id or public.is_admin());

create policy "queue_entries_insert_own"
  on queue_entries for insert
  with check (auth.uid() = user_id);

-- Leaving the queue = setting left_at. Only the owner, only while the
-- entry is still active (mirrors visits_update_own_while_open).
create policy "queue_entries_update_own_while_active"
  on queue_entries for update
  using (auth.uid() = user_id and left_at is null)
  with check (auth.uid() = user_id);

-- No realtime publication entry on purpose: queue_entries is RLS-locked to
-- its owner, so postgres_changes would never deliver another user's INSERT
-- to a subscriber anyway. The dashboard polls the aggregate endpoint
-- (/api/queue/live) instead — same approach as /api/occupancy/live.
