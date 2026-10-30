/*
# Add missing sync history fields and tighten RLS to admin-only

## Changes

1. New columns on `hotelbeds_sync_history`:
   - `hotels_processed` (INTEGER, default 0) — total hotels processed in content sync
   - `hotels_inserted` (INTEGER, default 0) — new hotels inserted
   - `hotels_updated` (INTEGER, default 0) — existing hotels updated
   - `stop_reason` (TEXT, nullable) — reason the sync was stopped or paused

2. Status constraint updated to include 'stopped' and 'paused' statuses.
   The existing 'cancelled' status is retained for backward compatibility.
   New allowed values: pending, running, paused, completed, partially_completed,
   paused_quota, stopped, failed, cancelled.

3. RLS tightened: sync history is admin-only.
   Previous policies allowed any authenticated user full access.
   New policies check that the user's raw_app_meta_data contains role=admin.
   SELECT: admin users can view all sync history records.
   INSERT: admin users can create sync history records.
   UPDATE: admin users can update sync history records (status changes, progress).
   DELETE: not granted (sync history is immutable audit trail).

## Security
- RLS policies now verify admin role via raw_app_meta_data->>'role' = 'admin'.
- Non-admin authenticated users cannot read or modify sync history.
- The anon role has no access.
*/

-- Add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'hotels_processed') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN hotels_processed INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'hotels_inserted') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN hotels_inserted INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'hotels_updated') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN hotels_updated INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'stop_reason') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN stop_reason TEXT;
  END IF;
END $$;

-- Update status constraint to include 'stopped' and 'paused'
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'hotelbeds_sync_history_status_check' AND table_name = 'hotelbeds_sync_history') THEN
    ALTER TABLE hotelbeds_sync_history DROP CONSTRAINT hotelbeds_sync_history_status_check;
  END IF;
END $$;

ALTER TABLE hotelbeds_sync_history
  ADD CONSTRAINT hotelbeds_sync_history_status_check
  CHECK (status IN ('pending', 'running', 'paused', 'completed', 'partially_completed', 'paused_quota', 'stopped', 'failed', 'cancelled'));

-- Drop old permissive policies and replace with admin-only policies
DROP POLICY IF EXISTS hotelbeds_sync_history_select_auth ON hotelbeds_sync_history;
DROP POLICY IF EXISTS hotelbeds_sync_history_insert_auth ON hotelbeds_sync_history;
DROP POLICY IF EXISTS hotelbeds_sync_history_update_auth ON hotelbeds_sync_history;

CREATE POLICY hotelbeds_sync_history_select_admin
  ON hotelbeds_sync_history FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

CREATE POLICY hotelbeds_sync_history_insert_admin
  ON hotelbeds_sync_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

CREATE POLICY hotelbeds_sync_history_update_admin
  ON hotelbeds_sync_history FOR UPDATE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');
