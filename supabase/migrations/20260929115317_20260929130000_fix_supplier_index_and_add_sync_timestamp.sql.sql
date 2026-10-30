/*
# Fix supplier index for multi-supplier support + add last_synced_at

1. Drop the single-column unique index on supplier_hotel_code
2. Create a composite unique index on (supplier_name, supplier_hotel_code)
   so two different suppliers can have the same hotel code without conflict
3. Add last_synced_at timestamp column to track content sync separately
   from generic updated_at
*/

DROP INDEX IF EXISTS idx_properties_supplier_hotel_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_supplier_composite
  ON properties (supplier_name, supplier_hotel_code)
  WHERE supplier_hotel_code IS NOT NULL;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
