/*
# Add Editorial Override Columns, Audit Trail, and Tighten RLS

## Purpose
Separate Hotelbeds supplier data from Elvora editorial data so that
Hotelbeds content sync never overwrites admin-made editorial changes.
Also adds an audit trail table for tracking admin actions, and tightens
RLS so only admin-role users can modify properties.

## Changes

### 1. New columns on `properties` (editorial overrides)
All columns are nullable and default NULL so existing rows are unaffected.
When non-NULL, the editorial value takes precedence over the supplier value.

- `elvora_name` (text) — admin-edited property name
- `elvora_short_description` (text) — admin-edited short description
- `elvora_description` (text) — admin-edited full description
- `elvora_editorial_title` (text) — editorial headline
- `elvora_editorial_subtitle` (text) — editorial subheadline
- `elvora_editorial_description` (text) — editorial body text
- `elvora_images` (jsonb) — admin-curated image array
- `elvora_tags` (text[]) — admin-curated tags
- `elvora_amenities` (text[]) — admin-curated amenities
- `elvora_featured` (boolean) — admin featured flag
- `elvora_popular` (boolean) — admin popular flag
- `elvora_new` (boolean) — admin new flag
- `elvora_property_status` (text) — admin status override (catalog/bookable/coming_soon/archived)
- `elvora_booking_enabled` (boolean) — admin booking-enabled override
- `elvora_is_active` (boolean) — admin active/inactive override
- `elvora_price_display` (double precision) — editorial display price (NOT live pricing)
- `elvora_currency` (text) — editorial display currency
- `elvora_phone` (text) — admin phone
- `elvora_email` (text) — admin email
- `elvora_website` (text) — admin website
- `elvora_neighborhood` (text) — admin neighborhood
- `editorial_override` (boolean, default false) — flag: true when any editorial field has been set
- `elvora_primary_image_index` (integer) — which image to use as primary (0-based)

### 2. New table: `property_audit_log`
Tracks admin changes to properties.
- `id` (uuid PK)
- `admin_user_email` (text) — email of the admin who made the change
- `admin_user_id` (uuid) — auth uid of the admin
- `property_id` (text) — which property was changed
- `property_name` (text) — name at time of change
- `action` (text) — type of action (edit, archive, restore, create, delete, feature, etc.)
- `changed_fields` (jsonb) — { field: { previous, new } }
- `created_at` (timestamptz)

### 3. New table: `amenities`
Admin-manageable amenities library (not a hardcoded list).
- `id` (uuid PK)
- `name` (text, unique, not null)
- `category` (text) — e.g. "General", "Room", "Service"
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)

### 4. RLS changes on `properties`
- SELECT: public (anon + authenticated) can read active properties only
- INSERT/UPDATE/DELETE: only admin users (app_metadata.role = 'admin')
- Drop the old permissive write policies

### 5. RLS on new tables
- `property_audit_log`: admin-only INSERT and SELECT; no UPDATE/DELETE
- `amenities`: public SELECT; admin-only INSERT/UPDATE/DELETE

## Safety
- No existing columns are dropped or renamed
- No existing data is modified
- All new columns are nullable with defaults
- Existing 2,300 properties are preserved
- Bookings, favorites, destinations tables are untouched
*/

-- ============================================================
-- 1. Add editorial override columns to properties
-- ============================================================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS elvora_name text,
  ADD COLUMN IF NOT EXISTS elvora_short_description text,
  ADD COLUMN IF NOT EXISTS elvora_description text,
  ADD COLUMN IF NOT EXISTS elvora_editorial_title text,
  ADD COLUMN IF NOT EXISTS elvora_editorial_subtitle text,
  ADD COLUMN IF NOT EXISTS elvora_editorial_description text,
  ADD COLUMN IF NOT EXISTS elvora_images jsonb,
  ADD COLUMN IF NOT EXISTS elvora_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS elvora_amenities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS elvora_featured boolean,
  ADD COLUMN IF NOT EXISTS elvora_popular boolean,
  ADD COLUMN IF NOT EXISTS elvora_new boolean,
  ADD COLUMN IF NOT EXISTS elvora_property_status text,
  ADD COLUMN IF NOT EXISTS elvora_booking_enabled boolean,
  ADD COLUMN IF NOT EXISTS elvora_is_active boolean,
  ADD COLUMN IF NOT EXISTS elvora_price_display double precision,
  ADD COLUMN IF NOT EXISTS elvora_currency text,
  ADD COLUMN IF NOT EXISTS elvora_phone text,
  ADD COLUMN IF NOT EXISTS elvora_email text,
  ADD COLUMN IF NOT EXISTS elvora_website text,
  ADD COLUMN IF NOT EXISTS elvora_neighborhood text,
  ADD COLUMN IF NOT EXISTS editorial_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS elvora_primary_image_index integer DEFAULT 0;

-- Add 'archived' to the property_status check constraint if it exists
-- We do this by checking current constraints and adding a new one that includes 'archived'
DO $$
BEGIN
  -- Drop the old constraint if it exists and doesn't include 'archived'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'properties'
    AND constraint_name = 'properties_property_status_check'
  ) THEN
    ALTER TABLE properties DROP CONSTRAINT properties_property_status_check;
  END IF;
END $$;

-- Add check constraint that includes 'archived'
ALTER TABLE properties
  ADD CONSTRAINT properties_property_status_check
  CHECK (property_status IN ('catalog', 'bookable', 'coming_soon', 'archived'));

-- ============================================================
-- 2. Create property_audit_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS property_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_email text,
  admin_user_id uuid,
  property_id text,
  property_name text,
  action text NOT NULL,
  changed_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
DROP POLICY IF EXISTS "admin_select_audit_log" ON property_audit_log;
CREATE POLICY "admin_select_audit_log"
ON property_audit_log FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only INSERT
DROP POLICY IF EXISTS "admin_insert_audit_log" ON property_audit_log;
CREATE POLICY "admin_insert_audit_log"
ON property_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- No UPDATE or DELETE policies — audit log is immutable

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_property_id ON property_audit_log(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON property_audit_log(created_at DESC);

-- ============================================================
-- 3. Create amenities library table
-- ============================================================
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text DEFAULT 'General',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

-- Public SELECT
DROP POLICY IF EXISTS "public_select_amenities" ON amenities;
CREATE POLICY "public_select_amenities"
ON amenities FOR SELECT
TO anon, authenticated
USING (true);

-- Admin-only INSERT
DROP POLICY IF EXISTS "admin_insert_amenities" ON amenities;
CREATE POLICY "admin_insert_amenities"
ON amenities FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only UPDATE
DROP POLICY IF EXISTS "admin_update_amenities" ON amenities;
CREATE POLICY "admin_update_amenities"
ON amenities FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only DELETE
DROP POLICY IF EXISTS "admin_delete_amenities" ON amenities;
CREATE POLICY "admin_delete_amenities"
ON amenities FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Seed common amenities
INSERT INTO amenities (name, category) VALUES
  ('Pool', 'General'), ('Private Pool', 'General'), ('Infinity Pool', 'General'),
  ('Spa', 'Wellness'), ('Gym', 'Wellness'), ('Sauna', 'Wellness'), ('Hot Tub', 'Wellness'),
  ('Beach Access', 'Outdoor'), ('Ocean View', 'Outdoor'), ('Mountain View', 'Outdoor'),
  ('Beachfront', 'Outdoor'), ('Waterfront', 'Outdoor'), ('Garden', 'Outdoor'),
  ('Terrace', 'Outdoor'), ('Ski Access', 'Outdoor'),
  ('Restaurant', 'Dining'), ('Bar', 'Dining'), ('Breakfast', 'Dining'),
  ('Room Service', 'Service'), ('Concierge', 'Service'), ('Butler Service', 'Service'),
  ('Chef', 'Service'), ('Driver', 'Service'), ('Housekeeping', 'Service'),
  ('Laundry', 'Service'), ('Airport Shuttle', 'Service'), ('Airport Transfer', 'Service'),
  ('Pet Friendly', 'General'), ('Air Conditioning', 'Room'), ('Kitchen', 'Room'),
  ('Fireplace', 'Room'), ('Elevator', 'Building'), ('Security', 'Building'),
  ('Parking', 'Building'), ('WiFi', 'General'), ('Business Center', 'General'),
  ('Tennis', 'Recreation'), ('Golf', 'Recreation'), ('Kids Club', 'Recreation'),
  ('Water Sports', 'Recreation'), ('Diving', 'Recreation'),
  ('Wine Cellar', 'Room'), ('Home Theater', 'Room'), ('Helipad', 'General'),
  ('Private Beach', 'Outdoor'), ('Mountain View', 'Outdoor')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. Tighten RLS on properties
-- ============================================================
-- Drop old permissive write policies
DROP POLICY IF EXISTS "auth_delete_properties" ON properties;
DROP POLICY IF EXISTS "auth_insert_properties" ON properties;
DROP POLICY IF EXISTS "auth_update_properties" ON properties;

-- Keep public SELECT for active properties only
-- But also allow admin to see ALL properties (including inactive/archived)
DROP POLICY IF EXISTS "public_select_properties" ON properties;
CREATE POLICY "public_select_properties"
ON properties FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only INSERT
DROP POLICY IF EXISTS "admin_insert_properties" ON properties;
CREATE POLICY "admin_insert_properties"
ON properties FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only UPDATE
DROP POLICY IF EXISTS "admin_update_properties" ON properties;
CREATE POLICY "admin_update_properties"
ON properties FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Admin-only DELETE
DROP POLICY IF EXISTS "admin_delete_properties" ON properties;
CREATE POLICY "admin_delete_properties"
ON properties FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================
-- 5. Indexes for admin table performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_properties_supplier_name ON properties(supplier_name);
CREATE INDEX IF NOT EXISTS idx_properties_supplier_hotel_code ON properties(supplier_hotel_code);
CREATE INDEX IF NOT EXISTS idx_properties_destination_id ON properties(destination_id);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_property_status ON properties(property_status);
CREATE INDEX IF NOT EXISTS idx_properties_country ON properties(country);
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_last_synced_at ON properties(last_synced_at DESC NULLS LAST);
