# ELVORA STAY — PHASE 8: DIDA DATA INTEGRITY REPAIRS

**Date:** 2026-10-22
**Status:** COMPLETE
**Predecessor:** Phase 7 DIDA Catalog Pilot (`docs/phase-7-dida-catalog-pilot.md`)

---

## 1. Executive Summary

Three issues identified during the Phase 7 read-only audit have been corrected:

1. **Migration gap fixed** — A permanent, idempotent migration now captures the two hotels that were originally inserted via direct SQL.
2. **Price provenance repaired** — All 10 DIDA `supplier_payload` records now include the search check-in date, stay length, retrieval timestamp, provenance status, and price type (indicative).
3. **Image accessibility verified** — All 10 DIDA image URLs were tested via HTTP and confirmed to return valid JPEG images from the expected supplier CDN.

Additionally, 147 regression test assertions were added to guard against future regressions across all six integrity dimensions.

**No existing systems were modified.** No hotels were imported, activated, or made bookable. Paymentgate, Hotelbeds queue, and all existing data remain unchanged.

---

## 2. Changes Made

### 2.1 Migration: Batch 0 (Migration Gap Fix)

**Migration identifier:** `20261021225350_20261021120400_dida_bali_pilot_batch0.sql.sql`
**Applied via:** `apply_migration` MCP tool
**Status:** Applied successfully to live database

This migration retroactively captures the two DIDA properties that were inserted via `execute_sql` during the first batch of the Phase 7 pilot:

| Property ID | Hotel Name | Supplier Hotel Code |
|-------------|------------|---------------------|
| dida-57700 | Aston Denpasar Hotel & Convention Center | 57700 |
| dida-62214 | Sanur Resort Watujimbar | 62214 |

**Idempotency mechanism:**
- Properties: `ON CONFLICT (id) DO NOTHING`
- Supplier property keys: `ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING`

**Verification after application:**
- DIDA property count: 10 (unchanged — no duplicates created)
- DIDA supplier_property_keys count: 10 (unchanged)
- Both records verified present in the migration history

**What this does NOT do:**
- Does not delete, update, or overwrite existing records
- Does not activate any property
- Does not enable booking
- Does not modify any other table

### 2.2 Migration: Price Provenance Repair

**Migration identifier:** `20261021225420_20261021120500_dida_price_provenance_repair.sql.sql`
**Applied via:** `apply_migration` MCP tool
**Status:** Applied successfully to live database

This migration adds five provenance fields to the `supplier_payload` JSONB column on all 10 DIDA `supplier_property_keys` rows:

| Field | Value | Source |
|-------|-------|--------|
| `checkInDate` | `"2026-11-15"` | Recovered from `source_url` query parameter (all 10 URLs contain `checkInDate=2026-11-15`) |
| `stayNights` | `2` | Recovered from `source_url` (`checkOutDate=2026-11-17` minus `checkInDate=2026-11-15` = 2 nights) |
| `retrievedAt` | ISO timestamp (varies per property) | Set to the existing `first_seen_at` column value — the actual import timestamp |
| `provenanceStatus` | `"recovered_from_source_url"` | Documents that provenance was not originally captured and was recovered after the fact |
| `priceType` | `"indicative_search_result"` | Distinguishes from guaranteed/bookable rates |

**Data recovery method:**
- No timestamps or dates were invented.
- `checkInDate` and `stayNights` were recovered from the `source_url` field, which contains the DIDA search query parameters used during the original import.
- `retrievedAt` was set to the existing `first_seen_at` value, which is the timestamp recorded when each `supplier_property_keys` row was created during the import.
- `provenanceStatus` explicitly documents that these values were recovered after the fact, not captured at import time.

**Verification after application:**
- All 10 DIDA `supplier_payload` records confirmed to contain all five new fields.
- `priceLowest` and `currency` (original fields) remain unchanged.

**What this does NOT do:**
- Does not modify the `properties` table
- Does not modify `bookings`, `property_rooms`, or any other table
- Does not activate properties or change booking settings
- Does not insert or delete any rows

### 2.3 Regression Test File

**File:** `src/lib/__tests__/dida-data-integrity.test.ts`
**Tests:** 147 assertions across 8 test functions
**Run command:** `node src/lib/__tests__/dida-data-integrity.test.ts`
**Result:** 147 passed, 0 failed

Test coverage:

| Test function | Assertions | What it verifies |
|---------------|------------|------------------|
| `testMigrationIdempotency` | Per-migration | All DIDA migrations use `ON CONFLICT DO NOTHING`; no DROP or TRUNCATE |
| `testNoDuplicateInserts` | 2 | No duplicate property IDs across all migration files; dida-57700 and dida-62214 are present |
| `testSupplierIdConsistency` | Per-INSERT | Property ID matches `dida-{supplier_hotel_code}` pattern; SPK hotel code matches property ID |
| `testPriceProvenanceSchema` | 7 | Valid provenance passes; missing fields are flagged; guaranteed/bookable price types are rejected; zero price and bad currency are rejected |
| `testMissingProvenanceHandling` | 4 | Missing checkInDate, stayNights, and retrievedAt are all detected; priceType remains indicative |
| `testPropertiesRemainHidden` | Per-migration | All property INSERTs include `is_active=false`, `property_status='catalog'`, `verification_status='needs_review'`, `supplier_status='not_connected'` |
| `testBookingRemainsDisabled` | Per-migration + 2 | No migration sets `booking_enabled=true` or `property_status='bookable'`; provenance repair does not touch properties/bookings/rooms; hotelbeds booking migration does not reference DIDA |
| `testMigrationGapCovered` | 10 | All 10 DIDA hotel IDs are present in migration files |
| `testProvenanceRepairDataSource` | 5 | Provenance repair uses `first_seen_at` as `retrievedAt`; sets `recovered_from_source_url`; uses `indicative_search_result`; filters by `supplier_name = 'dida'`; uses fixed date from source_url |

---

## 3. Image Accessibility Verification

All 10 DIDA image URLs were tested via HTTP GET requests (not HEAD-only) to verify that they return actual image content.

| Property ID | URL | HTTP Status | Content-Type | Size (bytes) | CDN |
|-------------|-----|-------------|--------------|-------------|-----|
| dida-1427078 | `https://image-cdn.rollinggo.cn/v2/1427078/hotel/default/6/image/3d2c77e2_z.jpg` | 200 | image/jpeg | 173,673 | rollinggo.cn |
| dida-152719 | `https://image-cdn.rollinggo.cn/Image/ID/152719/Featured%20Image/9725575_161_b.jpg` | 200 | image/jpeg | 29,753 | rollinggo.cn |
| dida-1554833 | `https://image-cdn.rollinggo.cn/6/Image/1554833/a25c2a72.jpg` | 200 | image/jpeg | 1,453,784 | rollinggo.cn |
| dida-212171 | `https://image-cdn.rollinggo.cn/Image/ID/212171/Featured%20Image/14654774_19_b.jpg` | 200 | image/jpeg | 22,016 | rollinggo.cn |
| dida-2547145 | `https://image-cdn.rollinggo.cn/v2/2547145/hotel/default/6/image/0f05f3c3_z.jpg` | 200 | image/jpeg | 150,898 | rollinggo.cn |
| dida-56161 | `https://image-cdn.rollinggo.cn/v2/56161/hotel/default/6/image/e3237597_z.jpg` | 200 | image/jpeg | 142,024 | rollinggo.cn |
| dida-57700 | `https://image-cdn.rollinggo.cn/Image/ID/57700/413b8aba_b.jpg` | 200 | image/jpeg | 22,790 | rollinggo.cn |
| dida-57862 | `https://image-cdn.rollinggo.cn/Image/ID/57862/Featured%20Image/8704730_13_b.jpg` | 200 | image/jpeg | 19,502 | rollinggo.cn |
| dida-57875 | `https://image-cdn.rollinggo.cn/Image/ID/57875/Featured%20Image/67a1faeb_b.jpg` | 200 | image/jpeg | 15,325 | rollinggo.cn |
| dida-62214 | `https://image-cdn.rollinggo.cn/Image/ID/62214/Featured%20Image/7713392_85_b.jpg` | 200 | image/jpeg | 29,218 | rollinggo.cn |

**Results:**
- All 10 URLs return HTTP 200.
- All 10 return `content-type: image/jpeg`.
- All 10 return real image data (byte sizes from 15 KB to 1.4 MB).
- All 10 URLs belong to `image-cdn.rollinggo.cn` (the expected DIDA/RollingGo CDN).
- No failed or expired URLs.
- No images were downloaded to Supabase Storage during this verification — only HTTP GET requests were made to confirm accessibility.

**What HTTP accessibility does NOT prove:**
- It does not prove image licensing or rights. The `rights_confirmed: true` flag in the database documents the written data-use permission from DIDA/RollingGo, but HTTP accessibility alone does not confirm licensing.
- It does not prove that images were downloaded to local storage. No images have been downloaded.
- CDN accessibility may change over time. These results reflect the state on 2026-10-22.

---

## 4. Price Provenance — Verified State

After the repair migration, all 10 DIDA `supplier_payload` records now contain:

| Field | Value (all 10) | Provenance |
|-------|----------------|------------|
| `priceLowest` | Varies ($14.82 – $183.70) | Original import — from DIDA searchHotels API response |
| `currency` | `"USD"` | Original import — from DIDA searchHotels API response |
| `checkInDate` | `"2026-11-15"` | Recovered from `source_url` query parameter |
| `stayNights` | `2` | Recovered from `source_url` (checkout - checkin) |
| `retrievedAt` | ISO timestamp (varies) | Set to existing `first_seen_at` value |
| `provenanceStatus` | `"recovered_from_source_url"` | Documents after-the-fact recovery |
| `priceType` | `"indicative_search_result"` | Marks prices as indicative, not guaranteed |
| `source` | `"dida_search_pilot"` | Original import — identifies the DIDA pilot search |
| `importPhase` | `"phase7"` | Original import — identifies the import phase |

**Price presentation guidance:**
These prices must be presented as "indicative starting from" rates, not as guaranteed or live bookable rates. The `priceType: "indicative_search_result"` field enforces this distinction in the data structure. Future imports should capture `checkInDate`, `stayNights`, `retrievedAt`, and `priceType` at import time rather than recovering them after the fact.

---

## 5. Systems Preserved

| System | Status | Evidence |
|--------|--------|----------|
| Hotelbeds properties | Unchanged (4,236) | Count verified before and after repairs |
| Hotelbeds sync queue | Not resumed | 0 sync history records; no queue worker invoked |
| Hotelbeds credentials | Not modified | No credential-related migrations applied |
| Paymentgate | Not modified | `paymentgate-payment` and `paymentgate-webhook` source files untouched |
| DIDA booking workflow | Not introduced | 0 DIDA bookings, 0 DIDA room records |
| Additional destinations | Not imported | Destinations count remains 143 |
| Additional hotels | Not imported | DIDA property count remains exactly 10 |
| Property activations | None | All 10 DIDA properties remain `is_active = false` |
| Booking enabled | None | All 10 DIDA properties remain `booking_enabled = false` |
| Frontend code | Not modified | No `src/` files changed except the new test file |
| Edge functions | Not modified | No `supabase/functions/` files changed |
| Configuration | Not modified | `supabase/config.toml`, `vite.config.ts` unchanged |

---

## 6. Test and Build Results

### 6.1 Regression Tests

```
node src/lib/__tests__/dida-data-integrity.test.ts
Running DIDA Data Integrity regression tests (Phase 8)...

147 passed, 0 failed out of 147 tests.
```

### 6.2 Existing Tests

```
node src/lib/__tests__/dida-mcp-adapter.test.ts
56 passed, 0 failed out of 56 tests.
```

### 6.3 Production Build

```
npm run build
✓ 1784 modules transformed.
✓ built in 12.41s
```

Build passes with zero errors. The only warning is the pre-existing chunk size advisory (1,055 KB), unrelated to the DIDA repairs.

---

## 7. Migration History (DIDA-related)

All migrations applied during Phases 7 and 8:

| # | Migration filename | Phase | Purpose |
|---|-------------------|-------|---------|
| 1 | `20261020160609_20261020120000_create_dida_supplier_catalog_tables.sql` | 7 | Schema: supplier_property_keys + dida_destination_map tables, partial unique index |
| 2 | `20261021150559_20261021120000_dida_bali_pilot_import.sql.sql` | 7 | Hotels 3-4 (dida-212171, dida-1427078) |
| 3 | `20261021150634_20261021120100_dida_bali_pilot_batch2.sql.sql` | 7 | Hotels 5-6 (dida-2547145, dida-57862) |
| 4 | `20261021150701_20261021120200_dida_bali_pilot_batch3.sql.sql` | 7 | Hotels 7-8 (dida-57875, dida-152719) |
| 5 | `20261021150721_20261021120300_dida_bali_pilot_batch4.sql.sql` | 7 | Hotels 9-10 (dida-1554833, dida-56161) |
| 6 | `20261021225350_20261021120400_dida_bali_pilot_batch0.sql.sql` | 8 | Hotels 1-2 (dida-57700, dida-62214) — retroactive migration gap fix |
| 7 | `20261021225420_20261021120500_dida_price_provenance_repair.sql.sql` | 8 | Price provenance repair (UPDATE only) |

All 5 DIDA hotel import migrations (batches 0-4) use `ON CONFLICT DO NOTHING` for idempotency. A full database rebuild from migrations will now reproduce all 10 DIDA properties.

---

## 8. Unresolved Issues

No unresolved issues remain from the Phase 7 audit. All three identified issues have been corrected:

1. Migration gap — **RESOLVED** (batch 0 migration applied)
2. Price provenance gap — **RESOLVED** (provenance repair migration applied)
3. Image accessibility unverified — **VERIFIED** (all 10 URLs return valid JPEGs)

**Note on clean database rebuild:** A clean rebuild from migrations was NOT tested in this environment. The migrations were applied against the live database, which already contained the records. The `ON CONFLICT DO NOTHING` clauses ensure idempotency, but a full rebuild test (applying all migrations to an empty database) was not performed. This should be done in a staging environment before relying on it for disaster recovery.

---

## 9. File Inventory

### New Files Created
- `src/lib/__tests__/dida-data-integrity.test.ts` — 147 regression test assertions
- `docs/phase-8-dida-data-integrity.md` — this file

### Migrations Applied
- `20261021225350_20261021120400_dida_bali_pilot_batch0.sql.sql` — migration gap fix
- `20261021225420_20261021120500_dida_price_provenance_repair.sql.sql` — price provenance repair

### Files Modified
- `docs/phase-7-dida-catalog-pilot.md` — appended Section 11 documenting Phase 8 repairs

### Files NOT Modified
- Any frontend source files (except the new test file)
- Any edge function source files
- Any configuration files
- Any existing migration files
- Paymentgate, Hotelbeds, or booking-related code
