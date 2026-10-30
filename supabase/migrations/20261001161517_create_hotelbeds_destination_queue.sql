/*
# Create Hotelbeds Destination Queue Table and Queue Settings

## Purpose
Replaces the manual destination-by-destination catalog sync workflow with a
resumable automated destination queue. Each row represents one Elvora
destination that needs its Hotelbeds catalog imported, along with its
verification status, sync progress, resume position, and error state.

## New Tables

### hotelbeds_destination_queue
- id (uuid, PK)
- destination_id (text) — FK to destinations.id, nullable for unmapped
- destination_name (text) — Elvora destination name
- destination_slug (text) — Elvora slug
- hotelbeds_code (text) — candidate Hotelbeds destination code
- verified_hotelbeds_code (text, nullable) — confirmed correct code after verification
- verification_status (text) — pending | verifying | verified | verification_failed
- sync_status (text) — pending | verifying | ready | running | partial | completed | paused | quota_paused | failed
- current_position (int) — next page to fetch (resume position)
- total_available (int) — total hotels Hotelbeds reports for this destination
- target_count (int) — max hotels to import (default 500)
- processed_count (int) — hotels processed so far
- inserted_count (int)
- updated_count (int)
- duplicate_count (int)
- failed_count (int)
- last_error (text, nullable)
- last_started_at (timestamptz, nullable)
- last_completed_at (timestamptz, nullable)
- last_synced_at (timestamptz, nullable)
- next_resume_position (int, nullable)
- retry_count (int, default 0)
- account_role (text, default 'catalog') — always 'catalog' (Account B)
- priority (int, default 100) — lower = higher priority
- created_at (timestamptz)
- updated_at (timestamptz)

### hotelbeds_queue_settings
- id (int, PK, always 1) — singleton row
- hotels_per_destination (int, default 500)
- api_page_size (int, default 25)
- concurrent_destinations (int, default 3)
- automatic_resume (boolean, default true)
- rate_limit_protection (boolean, default true)
- queue_running (boolean, default false)
- last_api_status (int, nullable)
- last_quota_event (text, nullable)
- last_quota_event_at (timestamptz, nullable)
- updated_at (timestamptz)

## Security
- RLS enabled on both tables.
- Policies allow anon + authenticated CRUD (admin panel uses anon key).
- No sensitive data stored in these tables.

## Important Notes
1. The queue table uses a unique constraint on destination_id to prevent
   duplicate queue records for the same Elvora destination.
2. The settings table is a singleton (id = 1) created at migration time.
3. The existing hotelbeds_sync_log table remains unchanged and continues to
   log individual sync operations.
*/

-- Create the queue table
CREATE TABLE IF NOT EXISTS hotelbeds_destination_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id text,
  destination_name text NOT NULL,
  destination_slug text NOT NULL,
  hotelbeds_code text NOT NULL,
  verified_hotelbeds_code text,
  verification_status text NOT NULL DEFAULT 'pending',
  sync_status text NOT NULL DEFAULT 'pending',
  current_position integer NOT NULL DEFAULT 1,
  total_available integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL DEFAULT 500,
  processed_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  last_error text,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_synced_at timestamptz,
  next_resume_position integer,
  retry_count integer NOT NULL DEFAULT 0,
  account_role text NOT NULL DEFAULT 'catalog',
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate queue records for the same destination
CREATE UNIQUE INDEX IF NOT EXISTS uq_hdq_destination_id
  ON hotelbeds_destination_queue (destination_id)
  WHERE destination_id IS NOT NULL;

-- Index for queue ordering by priority
CREATE INDEX IF NOT EXISTS idx_hdq_priority
  ON hotelbeds_destination_queue (priority, sync_status);

-- Index for sync_status lookups
CREATE INDEX IF NOT EXISTS idx_hdq_sync_status
  ON hotelbeds_destination_queue (sync_status);

-- Enable RLS
ALTER TABLE hotelbeds_destination_queue ENABLE ROW LEVEL SECURITY;

-- Policies for queue table (admin panel uses anon key)
DROP POLICY IF EXISTS "anon_select_queue" ON hotelbeds_destination_queue;
CREATE POLICY "anon_select_queue" ON hotelbeds_destination_queue
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_queue" ON hotelbeds_destination_queue;
CREATE POLICY "anon_insert_queue" ON hotelbeds_destination_queue
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_queue" ON hotelbeds_destination_queue;
CREATE POLICY "anon_update_queue" ON hotelbeds_destination_queue
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_queue" ON hotelbeds_destination_queue;
CREATE POLICY "anon_delete_queue" ON hotelbeds_destination_queue
  FOR DELETE TO anon, authenticated USING (true);

-- Create settings table (singleton)
CREATE TABLE IF NOT EXISTS hotelbeds_queue_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hotels_per_destination integer NOT NULL DEFAULT 500,
  api_page_size integer NOT NULL DEFAULT 25,
  concurrent_destinations integer NOT NULL DEFAULT 3,
  automatic_resume boolean NOT NULL DEFAULT true,
  rate_limit_protection boolean NOT NULL DEFAULT true,
  queue_running boolean NOT NULL DEFAULT false,
  last_api_status integer,
  last_quota_event text,
  last_quota_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE hotelbeds_queue_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON hotelbeds_queue_settings;
CREATE POLICY "anon_select_settings" ON hotelbeds_queue_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_settings" ON hotelbeds_queue_settings;
CREATE POLICY "anon_update_settings" ON hotelbeds_queue_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default singleton row
INSERT INTO hotelbeds_queue_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger for queue table
CREATE OR REPLACE FUNCTION trigger_hdq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hdq_updated_at ON hotelbeds_destination_queue;
CREATE TRIGGER trg_hdq_updated_at
  BEFORE UPDATE ON hotelbeds_destination_queue
  FOR EACH ROW EXECUTE FUNCTION trigger_hdq_updated_at();

-- Create updated_at trigger for settings table
CREATE OR REPLACE FUNCTION trigger_hqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hqs_updated_at ON hotelbeds_queue_settings;
CREATE TRIGGER trg_hqs_updated_at
  BEFORE UPDATE ON hotelbeds_queue_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_hqs_updated_at();
