-- Adds the report tables to Supabase's Realtime publication so INSERTs
-- are pushed to subscribed clients (docs/ARCHITECTURE.md section 4 —
-- "map and open card update without reload when someone else reports").
--
-- This is DDL against a system publication, which requires more than the
-- anon/service-role REST API can do (no raw-SQL execution path over
-- PostgREST) — run this manually via the Supabase SQL editor, or toggle
-- Database > Replication > public schema for these three tables in the
-- dashboard, which does the same thing.

alter publication supabase_realtime add table occupancy_reports;
alter publication supabase_realtime add table water_reports;
alter publication supabase_realtime add table ice_reports;
