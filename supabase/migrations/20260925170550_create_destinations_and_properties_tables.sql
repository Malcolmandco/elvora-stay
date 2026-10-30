/*
# Create destinations and properties tables

## Summary
Creates the core data tables for the Elvora Stay travel platform:
- `destinations` — canonical geographic destinations (Miami, Bali, Maldives, etc.)
- `properties` — real property catalog linked to destinations via foreign key

## destinations table
- id: text primary key (stable slugs like 'dest-miami')
- name, slug (unique), country, country_code, region, continent
- parent_destination_id: self-referential FK for hierarchy (Miami Beach → Miami)
- short_description, long_description, hero_image, hero_image_alt
- latitude, longitude (nullable)
- is_active, is_featured, is_popular: boolean flags
- stay_count: integer (denormalized count, updated by the app)
- created_at, updated_at

## properties table
- id: text primary key ('prop-001', etc.)
- name, slug (unique), brand
- description, long_description
- property_type, property_status, supplier_status, verification_status
- booking_enabled, price_display_mode
- destination_id: FK → destinations(id) — the canonical link
- destination_slug, destination_name: denormalized for convenience
- country, city, region, address
- latitude, longitude (nullable)
- price_per_night (nullable), currency
- rating, review_count, max_guests, bedrooms, beds, bathrooms (all nullable)
- amenities, tags, collections: text[] arrays
- featured, is_active: boolean flags
- images: jsonb array of {id, url, alt, caption?}
- house_rules: text[]
- policies: jsonb {check_in, check_out, cancellation, damage_policy}
- source_url, website, last_verified_at
- created_at, updated_at

## Security
- RLS enabled on both tables
- Public (anon, authenticated) can SELECT active destinations and properties
- Only authenticated users can INSERT/UPDATE/DELETE (admin operations)
- No public write access
*/

-- ============================================================
-- DESTINATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS destinations (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  country text NOT NULL,
  country_code text,
  region text,
  continent text,
  parent_destination_id text REFERENCES destinations(id) ON DELETE SET NULL,
  short_description text NOT NULL,
  long_description text NOT NULL,
  hero_image text NOT NULL,
  hero_image_alt text NOT NULL,
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_popular boolean NOT NULL DEFAULT false,
  stay_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Public can read active destinations
DROP POLICY IF EXISTS "public_select_destinations" ON destinations;
CREATE POLICY "public_select_destinations"
  ON destinations FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated can insert (admin)
DROP POLICY IF EXISTS "auth_insert_destinations" ON destinations;
CREATE POLICY "auth_insert_destinations"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated can update (admin)
DROP POLICY IF EXISTS "auth_update_destinations" ON destinations;
CREATE POLICY "auth_update_destinations"
  ON destinations FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Authenticated can delete (admin)
DROP POLICY IF EXISTS "auth_delete_destinations" ON destinations;
CREATE POLICY "auth_delete_destinations"
  ON destinations FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- PROPERTIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  brand text,
  description text NOT NULL,
  long_description text NOT NULL,
  property_type text NOT NULL,
  property_status text NOT NULL DEFAULT 'catalog',
  supplier_status text NOT NULL DEFAULT 'not_connected',
  verification_status text NOT NULL DEFAULT 'needs_review',
  booking_enabled boolean NOT NULL DEFAULT false,
  price_display_mode text NOT NULL DEFAULT 'check_availability',
  destination_id text REFERENCES destinations(id) ON DELETE SET NULL,
  destination_slug text,
  destination_name text,
  country text NOT NULL,
  city text NOT NULL,
  region text,
  address text,
  latitude double precision,
  longitude double precision,
  price_per_night double precision,
  currency text NOT NULL DEFAULT 'USD',
  rating double precision,
  review_count integer,
  max_guests integer,
  bedrooms integer,
  beds integer,
  bathrooms integer,
  amenities text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  collections text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  images jsonb NOT NULL DEFAULT '[]',
  video text,
  house_rules text[] NOT NULL DEFAULT '{}',
  policies jsonb NOT NULL DEFAULT '{}',
  source_url text,
  website text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Public can read active properties
DROP POLICY IF EXISTS "public_select_properties" ON properties;
CREATE POLICY "public_select_properties"
  ON properties FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated can insert (admin)
DROP POLICY IF EXISTS "auth_insert_properties" ON properties;
CREATE POLICY "auth_insert_properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated can update (admin)
DROP POLICY IF EXISTS "auth_update_properties" ON properties;
CREATE POLICY "auth_update_properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Authenticated can delete (admin)
DROP POLICY IF EXISTS "auth_delete_properties" ON properties;
CREATE POLICY "auth_delete_properties"
  ON properties FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_destination_id ON properties(destination_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_destinations_slug ON destinations(slug);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON destinations(is_active);
CREATE INDEX IF NOT EXISTS idx_destinations_is_popular ON destinations(is_popular) WHERE is_popular = true;
