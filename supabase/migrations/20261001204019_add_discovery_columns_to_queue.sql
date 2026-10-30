/*
# Add Discovery Tracking Columns to Hotelbeds Destination Queue

## Purpose
Extend the queue table to store verification evidence and discovery metadata
so the automatic destination-code discovery process can record its findings.

## Changes to hotelbeds_destination_queue
- verified_at (timestamptz, nullable) — when verification was confirmed
- verification_sample (jsonb, nullable) — sample hotel data from verification
- verification_evidence (jsonb, nullable) — structured evidence (city, country, coords, etc.)
- discovery_candidates (jsonb, nullable) — all candidate codes tested during discovery
- discovery_notes (text, nullable) — human-readable discovery notes

## Security
- No new RLS policies needed — existing policies cover these columns.
- No sensitive data stored.
*/

ALTER TABLE hotelbeds_destination_queue
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_sample jsonb,
  ADD COLUMN IF NOT EXISTS verification_evidence jsonb,
  ADD COLUMN IF NOT EXISTS discovery_candidates jsonb,
  ADD COLUMN IF NOT EXISTS discovery_notes text;
