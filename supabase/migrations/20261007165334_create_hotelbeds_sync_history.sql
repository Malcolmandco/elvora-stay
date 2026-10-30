-- Sync history table for tracking manual Hotelbeds sync operations
CREATE TABLE IF NOT EXISTS hotelbeds_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  admin_user_email TEXT,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('content', 'rooms', 'prices', 'content_and_rooms')),
  scope TEXT NOT NULL CHECK (scope IN ('one_property', 'selected_properties', 'one_destination', 'selected_destinations', 'all_eligible')),
  scope_detail JSONB NOT NULL DEFAULT '{}',
  batch_size INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'partially_completed', 'paused_quota', 'failed', 'cancelled')),
  properties_processed INTEGER NOT NULL DEFAULT 0,
  properties_total INTEGER NOT NULL DEFAULT 0,
  rooms_found INTEGER NOT NULL DEFAULT 0,
  rooms_created INTEGER NOT NULL DEFAULT 0,
  rooms_updated INTEGER NOT NULL DEFAULT 0,
  rooms_skipped INTEGER NOT NULL DEFAULT 0,
  rooms_deactivated INTEGER NOT NULL DEFAULT 0,
  prices_found INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_messages TEXT[] NOT NULL DEFAULT '{}',
  quota_paused BOOLEAN NOT NULL DEFAULT false,
  quota_paused_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only authenticated users can access sync history
ALTER TABLE hotelbeds_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotelbeds_sync_history_select_auth
  ON hotelbeds_sync_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY hotelbeds_sync_history_insert_auth
  ON hotelbeds_sync_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY hotelbeds_sync_history_update_auth
  ON hotelbeds_sync_history FOR UPDATE
  TO authenticated
  USING (true);

-- Index for recent history queries
CREATE INDEX idx_sync_history_created_at ON hotelbeds_sync_history (created_at DESC);
CREATE INDEX idx_sync_history_status ON hotelbeds_sync_history (status);
