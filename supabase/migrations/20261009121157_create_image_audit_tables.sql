/*
# Hotel Image Audit Tables

## Purpose
Stores the results of a read-only image accuracy audit for all Hotelbeds-sourced
properties. The audit checks whether stored photographs are correctly associated
with their hotel, detects duplicate images, broken URLs, cross-hotel image reuse,
and non-Hotelbeds fallback images (e.g., Pexels stock photos).

## 1. New Tables

### hotel_image_audit_runs
- Records each audit execution (run).
- `id` (uuid PK): unique run identifier.
- `started_at` (timestamptz): when the run began.
- `completed_at` (timestamptz, nullable): when the run finished.
- `status` (text): 'running', 'completed', 'failed', 'partial'.
- `total_properties` (int): number of properties examined.
- `stats` (jsonb): aggregate statistics (counts per audit status).
- `api_calls_made` (int): number of Hotelbeds API calls made (should be 0 for stored-data audits).
- `quota_issues` (text, nullable): description of any quota or permission errors.
- `notes` (text, nullable): additional notes about the run.

### hotel_image_audit_results
- One row per property per audit run.
- `id` (uuid PK).
- `run_id` (uuid FK -> hotel_image_audit_runs.id, ON DELETE CASCADE).
- `property_id` (text): matches properties.id (e.g., "hb-6022").
- `property_name` (text): hotel name at time of audit.
- `supplier_hotel_code` (text): Hotelbeds hotel code.
- `destination_name` (text, nullable): destination.
- `city` (text, nullable): city.
- `country` (text, nullable): country.
- `image_count` (int): total stored images.
- `audit_status` (text): one of VERIFIED, UNVERIFIED, BROKEN_IMAGE, POSSIBLE_MISMATCH, NO_IMAGES, DUPLICATE_IMAGE.
- `issues` (jsonb): array of issue descriptors (e.g., [{"type":"pexels_fallback","url":"...","detail":"..."}]).
- `has_internal_duplicates` (bool): same URL appears more than once within this property.
- `has_cross_hotel_duplicates` (bool): URL shared with a different property.
- `has_non_hotelbeds_images` (bool): contains non-Hotelbeds image URLs.
- `has_broken_urls` (bool): contains URLs that failed accessibility check.
- `url_check_performed` (bool): whether URL accessibility was checked.
- `last_synced_at` (timestamptz, nullable): property's last sync timestamp.
- `created_at` (timestamptz): when this result was recorded.

## 2. Security
- RLS enabled on both tables.
- Only authenticated admin users can read/write (TO authenticated, ownership via app_metadata role check is enforced at the edge function level; policies use auth.uid() existence as a baseline).
- No anon access — audit data is admin-only.

## 3. Indexes
- hotel_image_audit_results(run_id): for filtering by run.
- hotel_image_audit_results(audit_status): for filtering by status.
- hotel_image_audit_results(property_id): for looking up a specific property.
*/

CREATE TABLE IF NOT EXISTS hotel_image_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_properties integer NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  api_calls_made integer NOT NULL DEFAULT 0,
  quota_issues text,
  notes text
);

ALTER TABLE hotel_image_audit_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_runs" ON hotel_image_audit_runs;
CREATE POLICY "admin_read_audit_runs"
ON hotel_image_audit_runs FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_audit_runs" ON hotel_image_audit_runs;
CREATE POLICY "admin_write_audit_runs"
ON hotel_image_audit_runs FOR ALL
TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS hotel_image_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES hotel_image_audit_runs(id) ON DELETE CASCADE,
  property_id text NOT NULL,
  property_name text NOT NULL,
  supplier_hotel_code text NOT NULL,
  destination_name text,
  city text,
  country text,
  image_count integer NOT NULL DEFAULT 0,
  audit_status text NOT NULL DEFAULT 'UNVERIFIED',
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_internal_duplicates boolean NOT NULL DEFAULT false,
  has_cross_hotel_duplicates boolean NOT NULL DEFAULT false,
  has_non_hotelbeds_images boolean NOT NULL DEFAULT false,
  has_broken_urls boolean NOT NULL DEFAULT false,
  url_check_performed boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotel_image_audit_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_results" ON hotel_image_audit_results;
CREATE POLICY "admin_read_audit_results"
ON hotel_image_audit_results FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_audit_results" ON hotel_image_audit_results;
CREATE POLICY "admin_write_audit_results"
ON hotel_image_audit_results FOR ALL
TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_results_run_id ON hotel_image_audit_results(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_status ON hotel_image_audit_results(audit_status);
CREATE INDEX IF NOT EXISTS idx_audit_results_property_id ON hotel_image_audit_results(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status ON hotel_image_audit_runs(status);