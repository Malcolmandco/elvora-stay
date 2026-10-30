/*
# Create Property Rooms Table and Room Sync Queue

## Summary
Creates two new tables to support a hotel-specific room catalog system:
1. property_rooms — stores real room types imported from Hotelbeds per property,
   with Elvora editable pricing and supplier metadata.
2. hotelbeds_room_sync_queue — resumable queue for batch room synchronization.

## New Tables

### property_rooms
Stores actual room types for each property, sourced from Hotelbeds Content API.
Each room belongs to exactly one property (property_id).

Key columns:
- id (uuid, PK)
- property_id (text, FK to properties.id)
- supplier_name (text, default 'hotelbeds')
- supplier_hotel_code (text)
- supplier_room_code (text) — unique per hotel
- supplier_room_name (text)
- supplier_room_type (text)
- supplier_room_characteristic (text)
- supplier_description (text)
- supplier_max_adults (integer)
- supplier_max_children (integer)
- supplier_max_occupancy (integer)
- supplier_facilities (text[])
- supplier_last_synced_at (timestamptz)
- elvora_room_name (text, nullable) — admin override
- elvora_description (text, nullable) — admin override
- elvora_price_per_night (numeric) — Elvora selling price
- currency (text, default 'USD')
- price_source (text, default 'hotelbeds_sync')
- price_synced_at (timestamptz)
- price_reference_check_in (date)
- price_reference_check_out (date)
- price_reference_adults (integer)
- price_reference_rooms (integer)
- price_override (boolean, default false)
- is_active (boolean, default true)
- display_order (integer, default 0)
- room_image (text, nullable)
- created_at, updated_at (timestamptz)

Unique constraint: (property_id, supplier_room_code)

### hotelbeds_room_sync_queue
- id (uuid, PK)
- property_id (text)
- supplier_hotel_code (text)
- status (text: pending/running/completed/no_rooms_found/failed/quota_paused)
- rooms_found, rooms_created, rooms_updated, prices_updated (integer)
- last_error (text)
- attempt_count (integer)
- started_at, completed_at (timestamptz)
- created_at, updated_at (timestamptz)

## Security
- RLS enabled on both tables.
- property_rooms: anon+authenticated can SELECT (public catalog); authenticated only for INSERT/UPDATE/DELETE.
- hotelbeds_room_sync_queue: authenticated only for all operations.
*/

CREATE TABLE IF NOT EXISTS property_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  supplier_name text NOT NULL DEFAULT 'hotelbeds',
  supplier_hotel_code text,
  supplier_room_code text,
  supplier_room_name text,
  supplier_room_type text,
  supplier_room_characteristic text,
  supplier_description text,
  supplier_max_adults integer,
  supplier_max_children integer,
  supplier_max_occupancy integer,
  supplier_facilities text[] DEFAULT '{}'::text[],
  supplier_last_synced_at timestamptz,
  elvora_room_name text,
  elvora_description text,
  elvora_price_per_night numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  price_source text NOT NULL DEFAULT 'hotelbeds_sync',
  price_synced_at timestamptz,
  price_reference_check_in date,
  price_reference_check_out date,
  price_reference_adults integer,
  price_reference_rooms integer,
  price_override boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  room_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_rooms_property_supplier_unique
  ON property_rooms (property_id, supplier_room_code)
  WHERE supplier_room_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_rooms_property_id_idx
  ON property_rooms (property_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS property_rooms_display_order_idx
  ON property_rooms (property_id, display_order);

ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_property_rooms" ON property_rooms;
CREATE POLICY "anon_select_property_rooms" ON property_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_property_rooms" ON property_rooms;
CREATE POLICY "auth_insert_property_rooms" ON property_rooms FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_property_rooms" ON property_rooms;
CREATE POLICY "auth_update_property_rooms" ON property_rooms FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_property_rooms" ON property_rooms;
CREATE POLICY "auth_delete_property_rooms" ON property_rooms FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS hotelbeds_room_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  supplier_hotel_code text,
  status text NOT NULL DEFAULT 'pending',
  rooms_found integer NOT NULL DEFAULT 0,
  rooms_created integer NOT NULL DEFAULT 0,
  rooms_updated integer NOT NULL DEFAULT 0,
  prices_updated integer NOT NULL DEFAULT 0,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_sync_queue_status_idx
  ON hotelbeds_room_sync_queue (status);

CREATE INDEX IF NOT EXISTS room_sync_queue_property_idx
  ON hotelbeds_room_sync_queue (property_id);

ALTER TABLE hotelbeds_room_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_room_sync_queue" ON hotelbeds_room_sync_queue;
CREATE POLICY "auth_select_room_sync_queue" ON hotelbeds_room_sync_queue FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_room_sync_queue" ON hotelbeds_room_sync_queue;
CREATE POLICY "auth_insert_room_sync_queue" ON hotelbeds_room_sync_queue FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_room_sync_queue" ON hotelbeds_room_sync_queue;
CREATE POLICY "auth_update_room_sync_queue" ON hotelbeds_room_sync_queue FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_room_sync_queue" ON hotelbeds_room_sync_queue;
CREATE POLICY "auth_delete_room_sync_queue" ON hotelbeds_room_sync_queue FOR DELETE
  TO authenticated USING (true);