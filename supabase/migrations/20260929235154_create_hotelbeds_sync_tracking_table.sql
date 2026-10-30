-- Track Hotelbeds content sync progress per destination
-- Enables resumable sync, rate-limit handling, and audit trail
CREATE TABLE IF NOT EXISTS hotelbeds_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id TEXT REFERENCES destinations(id) ON DELETE SET NULL,
  destination_name TEXT NOT NULL,
  hotelbeds_code TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'rate_limited', 'failed', 'partial')),
  pages_processed INTEGER NOT NULL DEFAULT 0,
  hotels_processed INTEGER NOT NULL DEFAULT 0,
  hotels_inserted INTEGER NOT NULL DEFAULT 0,
  hotels_updated INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  unmapped_count INTEGER NOT NULL DEFAULT 0,
  total_hotels INTEGER NOT NULL DEFAULT 0,
  last_page_from INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hb_sync_log_destination ON hotelbeds_sync_log (destination_id);
CREATE INDEX IF NOT EXISTS idx_hb_sync_log_status ON hotelbeds_sync_log (sync_status);
CREATE INDEX IF NOT EXISTS idx_hb_sync_log_code ON hotelbeds_sync_log (hotelbeds_code);

ALTER TABLE hotelbeds_sync_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "select_sync_log_authenticated" ON hotelbeds_sync_log FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sync_log_authenticated" ON hotelbeds_sync_log FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sync_log_authenticated" ON hotelbeds_sync_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sync_log_authenticated" ON hotelbeds_sync_log FOR DELETE
  TO authenticated USING (true);
