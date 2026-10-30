/*
# DIDA supplier catalog preparation (Phase 2)

## Purpose
Prepare the database for an additional hotel supplier (DIDA) without touching
any existing property, room, booking, destination, Hotelbeds, Paymentgate, or
frontend code. This migration only ADDS schema objects; it does not insert,
update, or delete any rows in existing tables.

## 1. New unique index on properties (supplier identity)
- `properties_supplier_name_supplier_hotel_code_idx` — a PARTIAL UNIQUE index on
  `properties(supplier_name, supplier_hotel_code)` restricted to rows where both
  columns are non-null and non-empty. This guarantees that a given supplier's
  hotel code maps to at most one property row, which is the data-integrity
  precondition for adding a second supplier (DIDA) alongside Hotelbeds.
- The index is partial so it does NOT affect existing rows that legitimately
  have NULL supplier fields (e.g. manually-created editorial properties).
- Pre-migration verification confirmed 4,236 properties, all with non-null,
  non-empty supplier_name + supplier_hotel_code, and ZERO duplicate
  (supplier_name, supplier_hotel_code) pairs — so this index creates cleanly
  without modifying any data.

## 2. New table: supplier_property_keys
- Durable, supplier-scoped identity for each imported hotel, independent of the
  `properties` core columns. Prevents duplicate imports from the same supplier
  and stores the verified DIDA search parameters that located the hotel.
- property_id REFERENCES properties(id) ON DELETE CASCADE — when a property is
  deleted, its supplier-key row goes with it. No forced changes to existing
  property identifiers.
- supplier_payload is for raw supplier response metadata ONLY. It MUST NOT
  contain API keys, bearer tokens, authorization headers, or any secret.
- RLS enabled. Only admin JWTs (role='admin' OR is_admin='true') can
  SELECT/INSERT/UPDATE/DELETE. Anonymous users get nothing. Edge functions
  using the service-role key bypass RLS.
- Starts with ZERO rows.

## 3. New table: dida_destination_map
- Approved destination-to-DIDA-search configurations, curated by an admin.
  Stores the verified `place`/`placeType` to use for each Elvora destination
  (e.g. dest-bali -> "Denpasar Indonesia" / "city") plus the geographic
  validation envelope (country code + lat/lon bounding box) that every returned
  hotel must satisfy before it is accepted.
- destination_id REFERENCES destinations(id) ON DELETE CASCADE.
- Supports MULTIPLE search locations per Elvora destination (one destination
  can map to several DIDA places, e.g. Bali -> Denpasar + Ubud + Seminyak).
  Therefore NO unique constraint on destination_id alone.
- Prevents duplicate mappings via UNIQUE(destination_id, dida_place, dida_place_type).
- RLS enabled, same admin-only policy pattern. Starts with ZERO rows.

## 4. Security / RLS
- Both new tables: RLS ENABLED.
- Four policies per table (SELECT/INSERT/UPDATE/DELETE), each TO authenticated,
  using the established Elvora admin predicate:
    (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin') OR
    (((auth.jwt() -> 'app_metadata') ->> 'is_admin') = 'true')
- anon role receives NO policies → no anonymous access to either table.
- The `supplier_payload` column is protected by these policies: only admin JWTs
  can read it; the service-role key (used by trusted edge functions) bypasses
  RLS and can read/write it.

## 5. What this migration does NOT do
- Does NOT add CHECK constraints on supplier_name (preserves future-supplier
  compatibility per task instructions).
- Does NOT change property_status, booking_enabled, is_active,
  verification_status, or supplier_status semantics.
- Does NOT change any existing index, constraint, or policy.
- Does NOT insert, update, or delete any rows.
- Does NOT touch bookings, property_rooms, payments, Hotelbeds tables, or any
  edge function / frontend code.

## 6. Rollback
To fully revert this migration (safe because both new tables start empty and
the partial unique index does not affect existing rows):
  DROP TABLE IF EXISTS dida_destination_map CASCADE;
  DROP TABLE IF EXISTS supplier_property_keys CASCADE;
  DROP INDEX IF EXISTS properties_supplier_name_supplier_hotel_code_idx;
This removes all objects created here and nothing else.
*/

-- ─── 1. Partial unique index on properties(supplier_name, supplier_hotel_code) ───
CREATE UNIQUE INDEX IF NOT EXISTS properties_supplier_name_supplier_hotel_code_idx
  ON properties (supplier_name, supplier_hotel_code)
  WHERE supplier_name IS NOT NULL
    AND supplier_name <> ''
    AND supplier_hotel_code IS NOT NULL
    AND supplier_hotel_code <> '';

-- ─── 2. supplier_property_keys ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_property_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  supplier_hotel_code text NOT NULL,
  supplier_destination_id text,
  supplier_place text,
  supplier_place_type text,
  supplier_payload jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_property_keys_supplier_name_hotel_code_key
    UNIQUE (supplier_name, supplier_hotel_code)
);

CREATE INDEX IF NOT EXISTS supplier_property_keys_property_id_idx
  ON supplier_property_keys (property_id);

ALTER TABLE supplier_property_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_supplier_property_keys" ON supplier_property_keys;
CREATE POLICY "admin_select_supplier_property_keys"
  ON supplier_property_keys FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_insert_supplier_property_keys" ON supplier_property_keys;
CREATE POLICY "admin_insert_supplier_property_keys"
  ON supplier_property_keys FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_update_supplier_property_keys" ON supplier_property_keys;
CREATE POLICY "admin_update_supplier_property_keys"
  ON supplier_property_keys FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text))
  WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_delete_supplier_property_keys" ON supplier_property_keys;
CREATE POLICY "admin_delete_supplier_property_keys"
  ON supplier_property_keys FOR DELETE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

-- ─── 3. dida_destination_map ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dida_destination_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  dida_place text NOT NULL,
  dida_place_type text NOT NULL,
  dida_destination_id text,
  verified_country_code text,
  verified_lat_min double precision,
  verified_lat_max double precision,
  verified_lon_min double precision,
  verified_lon_max double precision,
  verification_status text NOT NULL DEFAULT 'unverified',
  last_searched_at timestamptz,
  last_result_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dida_destination_map_destination_place_type_key
    UNIQUE (destination_id, dida_place, dida_place_type)
);

CREATE INDEX IF NOT EXISTS dida_destination_map_destination_id_idx
  ON dida_destination_map (destination_id);

ALTER TABLE dida_destination_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_dida_destination_map" ON dida_destination_map;
CREATE POLICY "admin_select_dida_destination_map"
  ON dida_destination_map FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_insert_dida_destination_map" ON dida_destination_map;
CREATE POLICY "admin_insert_dida_destination_map"
  ON dida_destination_map FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_update_dida_destination_map" ON dida_destination_map;
CREATE POLICY "admin_update_dida_destination_map"
  ON dida_destination_map FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text))
  WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));

DROP POLICY IF EXISTS "admin_delete_dida_destination_map" ON dida_destination_map;
CREATE POLICY "admin_delete_dida_destination_map"
  ON dida_destination_map FOR DELETE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text) = 'true'::text));
