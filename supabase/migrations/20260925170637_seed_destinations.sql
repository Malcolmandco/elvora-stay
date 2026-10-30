/*
# Seed destinations table

Populates the destinations table with 142 canonical geographic destinations
from the existing static data. All destinations are real geographic locations.

Uses ON CONFLICT (id) DO UPDATE to be idempotent — re-running will update
existing records without creating duplicates.
*/