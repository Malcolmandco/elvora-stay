/*
# Fix property_rooms unique constraint for upsert support

## Summary
The existing partial unique index on property_rooms (property_id, supplier_room_code)
WHERE supplier_room_code IS NOT NULL cannot be used by Supabase's upsert ON CONFLICT.
Replace it with a standard UNIQUE constraint so upserts work correctly.

## Changes
- Drop the partial unique index property_rooms_property_supplier_unique
- Add a standard UNIQUE constraint on (property_id, supplier_room_code)
*/

DROP INDEX IF EXISTS property_rooms_property_supplier_unique;

ALTER TABLE property_rooms
  ADD CONSTRAINT property_rooms_property_supplier_unique
  UNIQUE (property_id, supplier_room_code);