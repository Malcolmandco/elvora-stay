/*
# Correct Aspen/Denver destination misassignment

## Background
The Hotelbeds destination mapping file mapped Aspen → DEN (Denver International Airport)
and Vail → DEN. When the queue worker ran the catalog sync for "Aspen," it fetched all
380 hotels from the DEN destination code. Every one of those 380 properties is located
in Denver, Aurora, Westminster, Golden, Englewood, Lakewood, Thornton, Broomfield,
and other Denver-metro / Colorado Front Range cities — none are in or near Aspen
(39.19°N, 106.82°W). The average property coordinates (39.83°N, 104.65°W) are 200+ km
from Aspen.

## Changes

### 1. Create Denver destination
- New destination `dest-denver` with Denver coordinates (39.7392, -104.9903)
- Follows the same schema and conventions as existing destinations (Miami, etc.)
- Hero image from Pexels (Denver skyline)
- `is_active = true`, `is_featured = false`, `is_popular = false`, `status = 'published'`

### 2. Move all 380 properties from dest-aspen to dest-denver
- Update `destination_id` to `dest-denver`, `destination_slug` to `denver`,
  `destination_name` to `Denver` for all 380 properties
- Preserve: supplier_hotel_code, stable ID, images, descriptions, amenities, ratings,
  address, coordinates, editorial_override, booking metadata, supplier metadata
- No properties are deleted or duplicated
- No editorial content is overwritten (none had editorial_override = true anyway)

### 3. Reset Aspen destination
- Set `stay_count = 0` on dest-aspen
- Aspen remains active and visible — its editorial content, hero image, and metadata
  are preserved for future use when a proper Aspen Hotelbeds code is verified

### 4. Update queue entries
- Aspen queue entry: set `sync_status = 'pending_verification'`,
  `verification_status = 'pending'`, clear `verified_hotelbeds_code` to NULL,
  set `hotelbeds_code` to empty string (column is NOT NULL)
- Vail queue entry: if it exists with DEN code, same treatment

### 5. Audit log
- Record each property move in `property_audit_log` with old/new destination

## Safety
- No DROP, DELETE, or column type changes
- No transaction control statements
- All updates are idempotent (safe to re-run)
- No editorial overrides are affected (0 properties had them)
- No booking or payment workflows are touched
*/

-- ============================================================
-- 1. Create Denver destination (idempotent)
-- ============================================================
INSERT INTO destinations (
  id, name, slug, country, region,
  short_description, long_description,
  hero_image, hero_image_alt,
  latitude, longitude,
  is_active, is_featured, is_popular,
  stay_count, status, display_order, is_new,
  highlights, experiences, local_tips, tags, seo_keywords,
  created_at, updated_at
) VALUES (
  'dest-denver',
  'Denver',
  'denver',
  'United States',
  'Colorado',
  'Mile-high city & Rocky Mountain gateway',
  'Colorado''s capital sits a mile above sea level, blending urban sophistication with instant access to the Rocky Mountains. Denver offers a thriving craft brewery scene, world-class museums, and year-round outdoor adventure.',
  'https://images.pexels.com/photos/16108565/pexels-photo-16108565.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
  'Denver skyline at sunset',
  39.7392,
  -104.9903,
  true,
  false,
  false,
  0,
  'published',
  0,
  false,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Record audit entries for every property being moved
--    (insert BEFORE the update so we capture the old state)
-- ============================================================
INSERT INTO property_audit_log (property_id, property_name, action, changed_fields)
SELECT
  p.id,
  p.name,
  'destination_reassignment',
  jsonb_build_object(
    'old_destination_id', p.destination_id,
    'old_destination_name', p.destination_name,
    'old_destination_slug', p.destination_slug,
    'new_destination_id', 'dest-denver',
    'new_destination_name', 'Denver',
    'new_destination_slug', 'denver',
    'reason', 'Corrected Aspen/Denver misassignment — property was imported under DEN Hotelbeds code but is located in Denver metro area, not Aspen'
  )
FROM properties p
WHERE p.destination_id = 'dest-aspen'
  AND p.supplier_name = 'hotelbeds'
  AND p.is_active = true;

-- ============================================================
-- 3. Move all 380 Aspen properties to Denver
-- ============================================================
UPDATE properties
SET
  destination_id = 'dest-denver',
  destination_slug = 'denver',
  destination_name = 'Denver',
  updated_at = now()
WHERE destination_id = 'dest-aspen'
  AND supplier_name = 'hotelbeds';

-- ============================================================
-- 4. Update Aspen destination: reset stay_count to 0
-- ============================================================
UPDATE destinations
SET
  stay_count = 0,
  updated_at = now()
WHERE id = 'dest-aspen';

-- ============================================================
-- 5. Update Denver destination: set stay_count to actual count
-- ============================================================
UPDATE destinations
SET
  stay_count = (
    SELECT COUNT(*) FROM properties
    WHERE destination_id = 'dest-denver'
      AND is_active = true
  ),
  updated_at = now()
WHERE id = 'dest-denver';

-- ============================================================
-- 6. Fix Aspen queue entry: remove incorrect DEN verification
--    hotelbeds_code is NOT NULL so use empty string
-- ============================================================
UPDATE hotelbeds_destination_queue
SET
  sync_status = 'pending_verification',
  verification_status = 'pending',
  verified_hotelbeds_code = NULL,
  hotelbeds_code = '',
  processed_count = 0,
  inserted_count = 0,
  updated_count = 0,
  duplicate_count = 0,
  failed_count = 0,
  total_available = 0,
  current_position = 1,
  next_resume_position = NULL,
  last_error = NULL,
  last_synced_at = NULL,
  last_completed_at = NULL,
  updated_at = now()
WHERE destination_id = 'dest-aspen';

-- ============================================================
-- 7. Fix Vail queue entry: remove incorrect DEN mapping
-- ============================================================
UPDATE hotelbeds_destination_queue
SET
  sync_status = 'pending_verification',
  verification_status = 'pending',
  verified_hotelbeds_code = NULL,
  hotelbeds_code = '',
  last_error = NULL,
  updated_at = now()
WHERE destination_id = 'dest-vail'
  AND (hotelbeds_code = 'DEN' OR verified_hotelbeds_code = 'DEN');
