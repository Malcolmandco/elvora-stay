/*
# Add Supplier Amenities and Amenities Override Columns

## Summary
Adds two new columns to the `properties` table to separate Hotelbeds supplier
amenities from Elvora editorial amenities, with an override flag.

## New Columns
- `supplier_amenities` text[] DEFAULT '{}' — amenities returned by the Hotelbeds Content API
- `amenities_override` boolean NOT NULL DEFAULT false — when true, `elvora_amenities` takes
  precedence over `supplier_amenities` for display

## Data Migration
Backfills `supplier_amenities` from the existing `amenities` column for all
Hotelbeds-sourced properties (supplier_name = 'hotelbeds') so no existing
amenity data is lost.

## RLS
No policy changes — existing property policies already cover these columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='supplier_amenities') THEN
    ALTER TABLE public.properties ADD COLUMN supplier_amenities text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='amenities_override') THEN
    ALTER TABLE public.properties ADD COLUMN amenities_override boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Backfill supplier_amenities from amenities for Hotelbeds properties
UPDATE public.properties
SET supplier_amenities = amenities
WHERE supplier_name = 'hotelbeds'
  AND (array_length(supplier_amenities, 1) IS NULL OR array_length(supplier_amenities, 1) = 0)
  AND array_length(amenities, 1) IS NOT NULL
  AND array_length(amenities, 1) > 0;

CREATE INDEX IF NOT EXISTS properties_amenities_override_idx ON public.properties (amenities_override);
