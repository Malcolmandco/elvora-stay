/*
# Hotel Image Repair History

## Purpose
Records every approved image correction made through the Hotel Image Audit repair workflow.
Tracks which property had its generic Pexels fallback image replaced with genuine
Hotelbeds hotel photographs, including who approved the change and when.

## 1. New Table

### hotel_image_repair_history
- `id` (uuid PK): unique repair record.
- `property_id` (text): the property that was repaired (e.g., "hb-1000739").
- `supplier_hotel_code` (text): Hotelbeds hotel code.
- `previous_images` (jsonb): the image array before repair.
- `replacement_images` (jsonb): the new image array after repair.
- `source` (text): where the replacement images came from (e.g., "hotelbeds_content_api").
- `verification_evidence` (text): description of evidence linking images to the property.
- `approved_by` (text): email or ID of the admin who approved.
- `approved_at` (timestamptz): when the approval was made.
- `notes` (text, nullable): additional notes.
- `created_at` (timestamptz): when the record was created.

## 2. Security
- RLS enabled. Admin-only read/write (TO authenticated).
*/

CREATE TABLE IF NOT EXISTS hotel_image_repair_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  supplier_hotel_code text NOT NULL,
  previous_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  replacement_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'hotelbeds_content_api',
  verification_evidence text,
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotel_image_repair_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_repair_history" ON hotel_image_repair_history;
CREATE POLICY "admin_read_repair_history"
ON hotel_image_repair_history FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_repair_history" ON hotel_image_repair_history;
CREATE POLICY "admin_write_repair_history"
ON hotel_image_repair_history FOR ALL
TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_repair_history_property_id ON hotel_image_repair_history(property_id);
CREATE INDEX IF NOT EXISTS idx_repair_history_approved_at ON hotel_image_repair_history(approved_at);