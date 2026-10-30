/*
# Create bookings table for stay bookings

## Purpose
Stores all stay booking records with full supplier integration metadata,
payment state, and a safe state machine from DRAFT through CONFIRMED.

## New Tables
- `bookings`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK auth.users, defaults to authenticated user)
  - `booking_type` (text, defaults 'stay')
  - `property_id` (text, references properties.id)
  - `property_name` (text)
  - `property_image` (text)
  - `destination_name` (text)
  - `supplier` (text, nullable — e.g. 'duffel', 'hotelbeds')
  - `supplier_property_id` (text, nullable)
  - `supplier_offer_id` (text, nullable — rate/offer ID from availability search)
  - `supplier_booking_reference` (text, nullable — confirmation from supplier after booking)
  - `check_in` (date)
  - `check_out` (date)
  - `guests` (integer)
  - `rooms` (integer, default 1)
  - `room_name` (text, nullable)
  - `room_details` (jsonb, default '{}')
  - `meal_plan` (text, nullable)
  - `cancellation_policy` (text, nullable)
  - `currency` (text, default 'USD')
  - `subtotal` (numeric, default 0)
  - `taxes` (numeric, default 0)
  - `total` (numeric, default 0)
  - `payment_status` (text, default 'pending' — pending/paid/failed/refunded)
  - `payment_intent_id` (text, nullable — Stripe PI ID)
  - `booking_status` (text, default 'draft' — draft/availability_checked/payment_pending/payment_succeeded/booking_pending/confirmed/failed/cancelled)
  - `guest_first_name` (text, nullable)
  - `guest_last_name` (text, nullable)
  - `guest_email` (text, nullable)
  - `guest_phone` (text, nullable)
  - `price_timestamp` (timestamptz, nullable — when the rate was last verified)
  - `reference` (text, unique — ELVORA-XXXXXX customer-facing ref)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled
- Owner-scoped CRUD: users can only access their own bookings
- user_id defaults to auth.uid() so inserts without explicit user_id succeed

## Important Notes
1. The booking_status state machine: draft → availability_checked → payment_pending → payment_succeeded → booking_pending → confirmed (or failed at any step)
2. payment_status and booking_status are separate — payment can succeed while supplier booking fails
3. Admin reads are handled via a SECURITY DEFINER function or service role (not via RLS)
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_type text NOT NULL DEFAULT 'stay',
  property_id text,
  property_name text,
  property_image text,
  destination_name text,
  supplier text,
  supplier_property_id text,
  supplier_offer_id text,
  supplier_booking_reference text,
  check_in date,
  check_out date,
  guests integer DEFAULT 1,
  rooms integer DEFAULT 1,
  room_name text,
  room_details jsonb DEFAULT '{}'::jsonb,
  meal_plan text,
  cancellation_policy text,
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(12,2) DEFAULT 0,
  taxes numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_intent_id text,
  booking_status text NOT NULL DEFAULT 'draft',
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,
  price_timestamp timestamptz,
  reference text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookings" ON bookings;
CREATE POLICY "select_own_bookings" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookings" ON bookings;
CREATE POLICY "insert_own_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookings" ON bookings;
CREATE POLICY "update_own_bookings" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookings" ON bookings;
CREATE POLICY "delete_own_bookings" ON bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_reference_idx ON bookings(reference);
CREATE INDEX IF NOT EXISTS bookings_booking_status_idx ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings(payment_status);

-- Function to generate a unique booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_exists boolean;
BEGIN
  LOOP
    v_ref := 'ELVORA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM bookings WHERE reference = v_ref) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_booking_reference TO authenticated;