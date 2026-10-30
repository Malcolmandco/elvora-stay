/*
# Add circuit breaker and batch control columns to queue settings

1. Modified Tables
- `hotelbeds_queue_settings`
  - `quota_paused` (boolean, default false) — global circuit breaker flag
  - `quota_paused_at` (timestamptz, nullable) — when the pause was triggered
  - `quota_paused_reason` (text, nullable) — reason for the pause
  - `quota_paused_endpoint` (text, nullable) — which API endpoint returned the limit
  - `quota_paused_credential_role` (text, nullable) — which credential was in use (catalog/primary)
  - `quota_paused_batch_completed` (integer, default 0) — destinations completed before pause
  - `discovery_batch_size` (integer, default 5) — max destinations per batch invocation
  - `discovery_sample_size` (integer, default 3) — hotel sample size for verification

2. Security
- No RLS changes. This table is admin-only and already locked down.

3. Important Notes
- All new columns have safe defaults so existing rows work without changes.
- No data is lost; existing columns are untouched.
*/

ALTER TABLE hotelbeds_queue_settings
  ADD COLUMN IF NOT EXISTS quota_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quota_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS quota_paused_reason text,
  ADD COLUMN IF NOT EXISTS quota_paused_endpoint text,
  ADD COLUMN IF NOT EXISTS quota_paused_credential_role text,
  ADD COLUMN IF NOT EXISTS quota_paused_batch_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discovery_batch_size integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS discovery_sample_size integer NOT NULL DEFAULT 3;

-- Also add retry_count column to queue table if not present
ALTER TABLE hotelbeds_destination_queue
  ADD COLUMN IF NOT EXISTS discovery_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_discovery_attempt_at timestamptz;
