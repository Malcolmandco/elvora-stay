/*
# Add Hotelbeds supplier linking columns to properties table

1. New Columns
- `supplier_hotel_code` (text, nullable) — Hotelbeds hotel code used to link
  this property to its counterpart in the Hotelbeds content/availability APIs.
- `supplier_name` (text, nullable, default 'hotelbeds') — Name of the external
  supplier that this property is connected to. Currently only 'hotelbeds' is
  supported.

2. Modified Tables
- `properties` — Two new nullable columns added. Existing rows are unaffected.

3. Security
- No RLS policy changes. Existing policies still apply.

4. Indexes
- Added a unique index on `supplier_hotel_code` to prevent duplicate supplier
  links. WHERE clause keeps NULL values from triggering unique violations.

5. Important Notes
- These columns enable the new architecture: our database is the primary
  source for hotel content (discovery, cards, detail pages), while Hotelbeds
  remains the source for live availability and rates.
- Properties with a non-null `supplier_hotel_code` can be cross-referenced
  with Hotelbeds availability results to show live pricing on catalog pages.
*/

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS supplier_hotel_code text,
  ADD COLUMN IF NOT EXISTS supplier_name text DEFAULT 'hotelbeds';

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_supplier_hotel_code
  ON properties (supplier_hotel_code)
  WHERE supplier_hotel_code IS NOT NULL;
