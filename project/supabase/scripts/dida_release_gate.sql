-- =====================================================================
-- DIDA RELEASE GATE
-- Run in two steps. STEP 1 is read-only. STEP 2 changes data and must
-- only run after you have reviewed STEP 1 output.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: READ-ONLY CANDIDATE REPORT
-- A DIDA hotel passes only if ALL of these are true:
--   a. description is real supplier text (not "Name - City, Country")
--   b. at least one image exists in the images JSONB array
--   c. at least 5 amenities
--   d. has a price_per_night
--   e. price provenance exists in supplier_property_keys.supplier_payload
--      (checkInDate, stayNights, retrievedAt, priceType)
--   f. not on the known-bad list (edit below)
-- ---------------------------------------------------------------------
WITH known_bad AS (
  SELECT unnest(ARRAY[
    'dida-526',      -- no supplier data, placeholder only
    'dida-1003490',  -- no supplier data, placeholder only
    'dida-113332',   -- placeholder, no images
    'dida-290497',   -- placeholder, no images
    'dida-35156'     -- image returns 404
  ]) AS id
),
checks AS (
  SELECT
    p.id,
    p.name,
    p.destination_name,
    -- (a) description is not the name-only fallback
    (p.description IS NOT NULL
      AND p.description <> ''
      AND p.description NOT LIKE '% - %, %'
      AND length(p.long_description) > 200) AS has_real_description,
    -- (b) at least one image
    (jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0) AS has_images,
    -- (c) amenities
    (coalesce(array_length(p.amenities, 1), 0) >= 5) AS has_amenities,
    -- (d) price
    (p.price_per_night IS NOT NULL AND p.price_per_night > 0) AS has_price,
    -- (e) provenance
    (skp.supplier_payload ? 'checkInDate'
      AND skp.supplier_payload ? 'stayNights'
      AND skp.supplier_payload ? 'retrievedAt'
      AND skp.supplier_payload ? 'priceType') AS has_price_provenance,
    -- (f) not known-bad
    (p.id NOT IN (SELECT id FROM known_bad)) AS not_known_bad
  FROM properties p
  LEFT JOIN supplier_property_keys skp
    ON skp.property_id = p.id AND skp.supplier_name = 'dida'
  WHERE p.supplier_name = 'dida'
)
SELECT
  id,
  name,
  destination_name,
  has_real_description,
  has_images,
  has_amenities,
  has_price,
  has_price_provenance,
  not_known_bad,
  (has_real_description AND has_images AND has_amenities
     AND has_price AND has_price_provenance AND not_known_bad) AS passes_gate
FROM checks
ORDER BY destination_name, id;

-- Summary: how many pass
-- SELECT COUNT(*) FILTER (WHERE passes_gate) AS passing,
--        COUNT(*) AS total
-- FROM (...same query as above...) s;

-- ---------------------------------------------------------------------
-- STEP 2: RELEASE (ONLY AFTER STEP 1 REVIEW)
-- Releases ONLY hotels that passed the gate. Browse-only: booking stays
-- off and prices stay labelled as indicative. Runs in one transaction.
-- ---------------------------------------------------------------------
BEGIN;

WITH known_bad AS (
  SELECT unnest(ARRAY[
    'dida-526','dida-1003490','dida-113332','dida-290497','dida-35156'
  ]) AS id
)
UPDATE properties p
SET
  is_active = true,
  booking_enabled = false,              -- no bookings until PaymentGate is live
  price_display_mode = 'check_availability',
  verification_status = 'verified',     -- confirm this value is allowed by your check constraint
  updated_at = now()
WHERE p.supplier_name = 'dida'
  AND p.description IS NOT NULL
  AND p.description NOT LIKE '% - %, %'
  AND length(p.long_description) > 200
  AND jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0
  AND coalesce(array_length(p.amenities, 1), 0) >= 5
  AND p.price_per_night IS NOT NULL AND p.price_per_night > 0
  AND p.id NOT IN (SELECT id FROM known_bad)
  AND EXISTS (
    SELECT 1 FROM supplier_property_keys skp
    WHERE skp.property_id = p.id
      AND skp.supplier_name = 'dida'
      AND skp.supplier_payload ? 'checkInDate'
      AND skp.supplier_payload ? 'stayNights'
      AND skp.supplier_payload ? 'retrievedAt'
      AND skp.supplier_payload ? 'priceType'
  );

-- Check the number released before committing:
-- SELECT COUNT(*) FROM properties WHERE supplier_name='dida' AND is_active = true;

-- If the count is right, run COMMIT;  If not, run ROLLBACK;
COMMIT;
-- ROLLBACK;
