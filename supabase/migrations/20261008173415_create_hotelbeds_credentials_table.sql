/*
# Create hotelbeds_credentials table and add credential fields to sync history

## New Tables
- `hotelbeds_credentials`: Stores multiple Hotelbeds API account credentials.
  - `id` (uuid, primary key)
  - `label` (text, not null) — admin-given account name
  - `environment` (text, 'test' or 'production')
  - `api_key_enc` (text, not null) — PGP-encrypted API key
  - `api_secret_enc` (text, not null) — PGP-encrypted API secret
  - `purpose` (text, nullable) — admin notes
  - `is_active` (boolean, default true)
  - `last_tested_at` (timestamptz, nullable)
  - `last_test_status` (text, nullable)
  - `last_test_capabilities` (jsonb, nullable)
  - `is_legacy` (boolean, default false)
  - `legacy_role` (text, nullable)
  - `created_at`, `updated_at`, `created_by`

## Modified Tables
- `hotelbeds_sync_history`: Added credential_id, credential_label, credential_environment

## Security
- RLS enabled, admin-only CRUD policies.
- API key/secret encrypted at rest via pgcrypto PGP symmetric encryption.
- SECURITY DEFINER functions for encrypt/decrypt, callable only by service_role.
- Browser never receives decrypted secrets.

## Important Notes
1. pgcrypto extension required for PGP encryption.
2. Encryption key is an edge function secret (HOTELBEDS_ENC_KEY), never exposed to browser.
3. Existing env-var credentials continue to work unchanged.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS hotelbeds_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'production')),
  api_key_enc text NOT NULL,
  api_secret_enc text NOT NULL,
  purpose text,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_status text,
  last_test_capabilities jsonb,
  is_legacy boolean NOT NULL DEFAULT false,
  legacy_role text CHECK (legacy_role IN ('primary', 'catalog') OR legacy_role IS NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE hotelbeds_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cred_select_admin" ON hotelbeds_credentials;
CREATE POLICY "cred_select_admin"
  ON hotelbeds_credentials FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

DROP POLICY IF EXISTS "cred_insert_admin" ON hotelbeds_credentials;
CREATE POLICY "cred_insert_admin"
  ON hotelbeds_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

DROP POLICY IF EXISTS "cred_update_admin" ON hotelbeds_credentials;
CREATE POLICY "cred_update_admin"
  ON hotelbeds_credentials FOR UPDATE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

DROP POLICY IF EXISTS "cred_delete_admin" ON hotelbeds_credentials;
CREATE POLICY "cred_delete_admin"
  ON hotelbeds_credentials FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

-- SECURITY DEFINER: encrypt and upsert a credential (service role only)
CREATE OR REPLACE FUNCTION upsert_hotelbeds_credential(
  p_enc_key text,
  p_id uuid DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_environment text DEFAULT 'test',
  p_api_key text DEFAULT NULL,
  p_api_secret text DEFAULT NULL,
  p_purpose text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_key_enc text;
  v_secret_enc text;
BEGIN
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_key_enc := pgp_sym_encrypt(p_api_key, p_enc_key);
  v_secret_enc := pgp_sym_encrypt(p_api_secret, p_enc_key);

  IF p_id IS NOT NULL THEN
    UPDATE hotelbeds_credentials
    SET label = p_label,
        environment = p_environment,
        api_key_enc = v_key_enc,
        api_secret_enc = v_secret_enc,
        purpose = p_purpose,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO hotelbeds_credentials (label, environment, api_key_enc, api_secret_enc, purpose)
    VALUES (p_label, p_environment, v_key_enc, v_secret_enc, p_purpose)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- SECURITY DEFINER: decrypt and return credential secrets (service role only)
CREATE OR REPLACE FUNCTION get_hotelbeds_credential_secrets(
  p_enc_key text,
  p_id uuid
) RETURNS TABLE(api_key text, api_secret text, environment text, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_enc text;
  v_secret_enc text;
  v_env text;
  v_label text;
  v_api_key text;
  v_api_secret text;
BEGIN
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT api_key_enc, api_secret_enc, environment, label
  INTO v_key_enc, v_secret_enc, v_env, v_label
  FROM hotelbeds_credentials
  WHERE id = p_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_api_key := pgp_sym_decrypt(v_key_enc::bytea, p_enc_key);
  v_api_secret := pgp_sym_decrypt(v_secret_enc::bytea, p_enc_key);

  RETURN QUERY SELECT v_api_key, v_api_secret, v_env, v_label;
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_hotelbeds_credential(text, uuid, text, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_hotelbeds_credential_secrets(text, uuid) FROM anon, authenticated;

-- Add credential fields to sync history
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'credential_id') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN credential_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'credential_label') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN credential_label text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotelbeds_sync_history' AND column_name = 'credential_environment') THEN
    ALTER TABLE hotelbeds_sync_history ADD COLUMN credential_environment text;
  END IF;
END $$;
