# ELVORA STAY — PHASE 7: DIDA CATALOG PILOT IMPORT

**Date:** 2026-10-21  
**Status:** COMPLETE  
**Authorization:** Written data-use permission received from DIDA/RollingGo authorizing commercial storage, image display/download, and price comparison use. DIDA is catalog/content only — NO booking functionality.

---

## 1. Executive Summary

Successfully imported 10 DIDA-supplied hotels for the Bali (Denpasar) pilot into the Elvora Stay database. All properties are stored as catalog-only records, hidden from public view (`is_active = false`), with booking disabled. No booking workflows, booking links, or price-comparison UI changes were introduced. The production build passes cleanly.

### Before/After Counts

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total properties | 4,236 | 4,246 | +10 |
| Hotelbeds properties | 4,236 | 4,236 | 0 |
| DIDA properties | 0 | 10 | +10 |
| Supplier property keys | 0 | 10 | +10 |
| Destinations | 143 | 143 | 0 |

---

## 2. Safeguards Verified

### 2.1 Pre-Import Safeguard Review

Before any data was written, the following safeguards were verified:

- **Phase 6 Report** (`docs/phase-6-dida-import-preparation.md`): Confirmed schema analysis, duplicate detection design, import record specification, and pilot rollout plan were all reviewed.
- **DIDA MCP Adapter** (`supabase/functions/_shared/dida-mcp.ts`): Bounded timeout (25s), bounded response (1MiB), credential isolation (DIDA_API_KEY from Deno.env only), JSON-RPC 2.0 transport with SSE parsing.
- **DIDA Capability Test Function** (`supabase/functions/dida-capability-test/index.ts`): `verify_jwt = true`, Bearer auth enforced, no DB writes, no Hotelbeds calls. Strictly validated searchHotels arguments only.
- **RLS Policies**: `public_select_properties` policy allows `is_active = true OR jwt.role = 'admin'`. All frontend queries filter `.eq('is_active', true)`. DIDA properties with `is_active = false` are invisible to public.
- **Schema Constraints**: `property_status` CHECK constraint allows `'catalog'` — confirmed valid for DIDA import.

### 2.2 Property Safety Settings (All 10 DIDA Hotels)

Every imported DIDA property has the following safety-critical field values:

| Field | Value | Purpose |
|-------|-------|---------|
| `is_active` | `false` | Hidden from public — RLS and frontend gate |
| `booking_enabled` | `false` | No booking functionality |
| `property_status` | `'catalog'` | Catalog-only, not bookable |
| `supplier_status` | `'not_connected'` | No live supplier connection |
| `verification_status` | `'needs_review'` | Awaiting editorial review |
| `supplier_name` | `'dida'` | Supplier identification |
| `editorial_override` | `false` | No editorial overrides applied |
| `amenities_override` | `false` | No amenity overrides applied |

### 2.3 Public Visibility Verification

- SQL query `SELECT count(*) FROM properties WHERE supplier_name = 'dida' AND is_active = true` returned **0**.
- Frontend hooks (`src/hooks/use-properties.ts`) filter all queries with `.eq('is_active', true)` at 7 separate query sites (lines 188, 194, 241, 293, 327, 410).
- RLS policy `public_select_properties` enforces `is_active = true OR jwt.role = 'admin'` at the database level.
- **Result: Zero DIDA records are visible to public queries.**

### 2.4 Booking Workflow Verification

- No changes were made to any booking-related frontend code, edge functions, or database tables.
- The `stay-booking` and `stay-availability` edge functions were not modified.
- No booking links or checkout flows were added for DIDA properties.
- The `source_url` field stores the DIDA hotel detail page URL (for reference only, not displayed in UI).
- The DIDA adapter test file (`src/lib/__tests__/dida-mcp-adapter.test.ts`) contains zero references to booking, checkout, or stay-booking.
- **Result: Zero booking workflows or links were introduced.**

---

## 3. Pilot Import Details

### 3.1 Search Parameters

- **DIDA MCP Tool:** `searchHotels`
- **Place:** `Denpasar Indonesia`
- **Place Type:** `city`
- **Check-in Date:** 2026-11-15
- **Nights:** 2
- **Adults:** 2
- **Locale:** English / USD
- **Size:** 20 (max 20 per DIDA API)
- **Results returned:** 20 hotels; 10 selected for pilot

### 3.2 Geographic Validation

All 10 hotels passed geographic validation:

- **Country code:** `ID` (Indonesia) — confirmed via DIDA `areaCode` field
- **Coordinates:** All within Bali bounding box (lat: -8.85 to -8.55, lon: 115.15 to 115.30)
- **Destination assignment:** All linked to `dest-bali` (Bali, Indonesia)

### 3.3 Duplicate Detection

- Cross-supplier duplicate check: Query compared all 10 DIDA properties against Hotelbeds properties in the Bali destination using coordinate distance calculation (haversine formula).
- **Result: Zero duplicates found.** No Hotelbeds properties exist in the `dest-bali` destination.
- Idempotent import protection: `supplier_property_keys` table with `UNIQUE (supplier_name, supplier_hotel_code)` constraint. `ON CONFLICT DO NOTHING` on all INSERTs.

### 3.4 Imported Hotels

| # | Property ID | Hotel Name | Brand | Stars | Price/Night (USD) | Geo Check |
|---|-------------|------------|-------|-------|-------------------|-----------|
| 1 | dida-57700 | Aston Denpasar Hotel & Convention Center | Aston Archipelago | 4 | $32.62 | PASS |
| 2 | dida-62214 | Sanur Resort Watujimbar | — | 4 | $57.63 | PASS |
| 3 | dida-212171 | ARTOTEL Sanur Bali | ArtOtel by Radisson | 4 | $95.44 | PASS |
| 4 | dida-1427078 | Holiday Inn Bali Sanur by IHG | Holiday Inn | 4 | $77.13 | PASS |
| 5 | dida-2547145 | eL Hotel & Resort Bali Sanur | — | 4 | $118.43 | PASS |
| 6 | dida-57862 | Hotel Neo Denpasar by ASTON | Hotel NEO | 3 | $24.77 | PASS |
| 7 | dida-57875 | MarsCity Hotel | — | 3 | $14.82 | PASS |
| 8 | dida-152719 | Maya Sanur Resort & Spa | — | 5 | $183.70 | PASS |
| 9 | dida-1554833 | Bestah Coliving | Zuzu HS | 3.5 | $19.17 | PASS |
| 10 | dida-56161 | City of Aventus Hotel - Denpasar | — | 4 | $21.28 | PASS |

**Price range:** $14.82 – $183.70/night  
**Star range:** 3 – 5 stars  
**Total amenities stored:** 297 unique amenity entries across 10 hotels  
**Total tags stored:** 104 tag entries across 10 hotels

### 3.5 Image Handling

Each property stores 1 image in the `images` JSONB array with the following structure:

```json
{
  "url": "https://image-cdn.rollinggo.cn/...",
  "source": "dida",
  "rights_confirmed": true
}
```

- All 10 images have `rights_confirmed: true` flag, documenting the written data-use permission from DIDA/RollingGo.
- Images are sourced from DIDA's CDN (`image-cdn.rollinggo.cn`).
- No images were downloaded locally; URLs are stored for remote display per the authorization.

### 3.6 Supplier Property Keys

All 10 entries in `supplier_property_keys` table include:

- `property_id`: Links to the properties table (e.g., `dida-57700`)
- `supplier_name`: `dida`
- `supplier_hotel_code`: DIDA's hotel ID (e.g., `57700`)
- `supplier_destination_id`: `dest-bali`
- `supplier_place`: `Denpasar Indonesia`
- `supplier_place_type`: `city`
- `supplier_payload`: JSON with hotel metadata, coordinates, price, and import provenance (`source: "dida_search_pilot"`, `importPhase: "phase7"`)

### 3.7 Data Stored Per Property

Each of the 10 properties includes:

- Hotel name, slug (unique, prefixed with `dida-{hotelId}-`)
- Brand (where available)
- Plain-text and HTML descriptions
- Star rating
- Full address
- Latitude/longitude coordinates
- Price per night (USD) and currency
- Amenities array (15-40 items per hotel)
- Tags array (1-17 items per hotel)
- Image URL with rights confirmation
- DIDA booking reference URL (stored in `source_url`, not displayed in UI)
- Supplier hotel code and supplier name
- Last synced timestamp
- Supplier amenities (mirror of amenities array for override system)

---

## 4. Migrations Applied

Four migrations were applied during Phase 7:

1. **`20261021120000_dida_bali_pilot_import.sql`** — Hotels 3-4 (dida-212171, dida-1427078) + supplier property keys
2. **`20261021120100_dida_bali_pilot_batch2.sql`** — Hotels 5-6 (dida-2547145, dida-57862) + supplier property keys
3. **`20261021120200_dida_bali_pilot_batch3.sql`** — Hotels 7-8 (dida-57875, dida-152719) + supplier property keys
4. **`20261021120300_dida_bali_pilot_batch4.sql`** — Hotels 9-10 (dida-1554833, dida-56161) + supplier property keys

Hotels 1-2 (dida-57700, dida-62214) were inserted via `execute_sql` in the first batch before switching to `apply_migration` for the remaining batches.

All migrations use `ON CONFLICT (id) DO NOTHING` and `ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING` for idempotency.

---

## 5. Frontend Code Changes

**No frontend code was changed during Phase 7.** The import was purely a database operation. The existing frontend already handles DIDA properties correctly:

- `src/hooks/use-properties.ts` filters all queries with `.eq('is_active', true)`, ensuring DIDA catalog properties remain invisible until explicitly activated.
- The property detail page and booking page check `booking_enabled` before showing booking UI.
- No new routes, components, or pages were added.

---

## 6. Production Build

```
npm run build
> tsc -b && vite build
✓ 1784 modules transformed.
✓ built in 17.33s
```

Build passes with zero errors. The only warning is the standard chunk size advisory (1,055 KB), which is pre-existing and unrelated to the DIDA import.

---

## 7. Validation Summary

| Check | Result |
|-------|--------|
| Total properties increased by 10 | PASS (4,236 → 4,246) |
| DIDA property count = 10 | PASS |
| Supplier property keys = 10 | PASS |
| All DIDA properties `is_active = false` | PASS (10/10) |
| All DIDA properties `booking_enabled = false` | PASS (10/10) |
| All DIDA properties `property_status = 'catalog'` | PASS (10/10) |
| Zero DIDA properties visible to public queries | PASS (0 visible) |
| All coordinates within Bali bounding box | PASS (10/10) |
| All area codes = "ID" (Indonesia) | PASS (10/10) |
| Zero cross-supplier duplicates | PASS (0 duplicates) |
| All images have `rights_confirmed: true` | PASS (10/10) |
| All supplier_property_keys have import provenance | PASS (10/10) |
| No booking workflows/links introduced | PASS |
| No frontend code changes | PASS |
| Production build passes | PASS |

---

## 8. Next Steps

The pilot import is complete. The following actions are recommended before wider rollout:

1. **Editorial Review:** Review the 10 DIDA catalog entries in the admin panel. Edit descriptions, verify amenity mappings, and curate images before setting `is_active = true` for any property.
2. **Price Comparison Display:** When ready, the `price_per_night` field is available for display alongside Hotelbeds prices (once Hotelbeds properties exist in the same destination).
3. **Image Download:** Per the DIDA/RollingGo authorization, images may be downloaded from the CDN URLs and stored locally for performance. This is optional — remote display is also permitted.
4. **Destination Expansion:** Following the prioritized rollout plan from Phase 4, the next destinations for DIDA import would be Phuket, Koh Samui, and Singapore (based on search availability and geographic coverage).
5. **Country Code Population:** All 143 destinations still have `country_code = NULL`. This should be populated before wider DIDA imports to enable the geographic validation algorithm from Phase 4.

---

## 9. File Inventory

### Migrations Created
- `supabase/migrations/20261021150559_20261021120000_dida_bali_pilot_import.sql.sql`
- `supabase/migrations/20261021150634_20261021120100_dida_bali_pilot_batch2.sql.sql`
- `supabase/migrations/20261021150701_20261021120200_dida_bali_pilot_batch3.sql.sql`
- `supabase/migrations/20261021150721_20261021120300_dida_bali_pilot_batch4.sql.sql`

### Documentation
- `docs/phase-7-dida-catalog-pilot.md` (this file)

### No Changes To
- Any frontend source files (`src/`)
- Any edge function source files (`supabase/functions/`)
- Any configuration files (`supabase/config.toml`, `vite.config.ts`, etc.)
- Any existing database tables, columns, or RLS policies

---

## 10. Post-Import Read-Only Audit (2026-10-21)

**Audit type:** READ-ONLY. No records were inserted, updated, deleted, deployed, or modified.
**Method:** Direct SQL queries against the live Supabase database, migration file inspection, and RLS policy review.

### 10.1 Verified DIDA Property Count and Linkage

**Confirmed fact:** Exactly 10 DIDA properties and 10 supplier_property_keys exist.

| Count | Value |
|-------|-------|
| DIDA properties | 10 |
| DIDA supplier_property_keys | 10 |
| Total properties | 4,246 |
| Total supplier_property_keys | 10 |
| Orphaned SPK (key without property) | 0 |
| Hotelbeds properties | 4,236 (unchanged) |

All 10 SPK entries link to existing properties (verified via LEFT JOIN — zero orphans).

### 10.2 Full Property Record Audit (all 10 DIDA hotels)

Every field below was queried from the live database for each property:

| Property ID | supplier_hotel_code | Name | Destination | Lat / Lon | is_active | property_status | booking_enabled | verification_status | Price (USD) |
|-------------|---------------------|------|-------------|-----------|-----------|-----------------|-----------------|---------------------|-------------|
| dida-57700 | 57700 | Aston Denpasar Hotel & Convention Center | dest-bali | -8.639268 / 115.206164 | false | catalog | false | needs_review | $32.62 |
| dida-62214 | 62214 | Sanur Resort Watujimbar | dest-bali | -8.691458 / 115.262529 | false | catalog | false | needs_review | $57.63 |
| dida-212171 | 212171 | ARTOTEL Sanur Bali | dest-bali | -8.705514 / 115.260804 | false | catalog | false | needs_review | $95.44 |
| dida-1427078 | 1427078 | Holiday Inn Bali Sanur by IHG | dest-bali | -8.705688 / 115.260713 | false | catalog | false | needs_review | $77.13 |
| dida-2547145 | 2547145 | eL Hotel & Resort Bali Sanur | dest-bali | -8.691904 / 115.264205 | false | catalog | false | needs_review | $118.43 |
| dida-57862 | 57862 | Hotel Neo Denpasar by ASTON | dest-bali | -8.636382 / 115.192865 | false | catalog | false | needs_review | $24.77 |
| dida-57875 | 57875 | MarsCity Hotel | dest-bali | -8.698110 / 115.234057 | false | catalog | false | needs_review | $14.82 |
| dida-152719 | 152719 | Maya Sanur Resort & Spa | dest-bali | -8.697549 / 115.263520 | false | catalog | false | needs_review | $183.70 |
| dida-1554833 | 1554833 | Bestah Coliving | dest-bali | -8.678085 / 115.236473 | false | catalog | false | needs_review | $19.17 |
| dida-56161 | 56161 | City of Aventus Hotel - Denpasar | dest-bali | -8.679848 / 115.203662 | false | catalog | false | needs_review | $21.28 |

Additional confirmed fields for all 10:
- `supplier_status` = `not_connected` (all 10)
- `supplier_name` = `dida` (all 10)
- `editorial_override` = `false` (all 10)
- `amenities_override` = `false` (all 10)
- `destination_slug` = `bali`, `destination_name` = `Bali` (all 10)
- `country` = `Indonesia`, `city` = `Denpasar` (all 10)

### 10.3 Duplicate Check Against Entire Catalogue

The audit compared all 10 DIDA hotels against all 4,236 Hotelbeds properties using three independent methods — not just the Bali destination.

**Method 1 — Exact name match (case-insensitive):**
- Query: `JOIN ON LOWER(TRIM(d.name)) = LOWER(TRIM(h.name))`
- **Result: 0 exact matches.**

**Method 2 — Coordinate proximity (haversine distance):**
- Within 200m: 0 matches
- Within 50km: 0 matches
- **Result: 0 coordinate matches.** No Hotelbeds property has coordinates near any DIDA hotel.

**Method 3 — Address exact match (case-insensitive):**
- Query: `JOIN ON LOWER(TRIM(address))` equality
- **Result: 0 address matches.**

**Method 4 — Distinctive name fragment match:**
- Tested brand-specific substrings: "aston denpasar", "sanur resort", "artotel sanur", "holiday inn bali sanur", "hotel neo denpasar", "marscity", "maya sanur", "bestah coliving", "city of aventus", "el hotel%bali%sanur"
- **Result: 0 matches.**

**Context:** Zero Hotelbeds properties exist in Indonesia (country ILIKE '%indonesia%' OR city ILIKE '%denpasar%' OR city ILIKE '%bali%' returned 0 rows). The DIDA Bali pilot operates in a destination with no existing Hotelbeds coverage.

**Summary:** 0 exact matches, 0 strong potential matches, 0 uncertain matches. No duplicates exist across the entire catalogue.

### 10.4 Import Safety Verification

**Safety constraint violations (count of DIDA properties violating each):**

| Constraint | Violations |
|------------|------------|
| `is_active = true` | 0 |
| `booking_enabled = true` | 0 |
| `property_status != 'catalog'` | 0 |
| `verification_status != 'needs_review'` | 0 |
| `supplier_status != 'not_connected'` | 0 |

**All 10 properties pass every safety constraint.**

**Public visibility:**
- RLS policy `public_select_properties` (tightened in migration `20261004052745`): `USING (is_active = true OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')`.
- All 10 DIDA properties have `is_active = false`, so they are excluded from all non-admin SELECT queries at the database level.
- **Result: Confirmed — DIDA properties are invisible to public queries.**

**Existing data unchanged:**
- Hotelbeds properties: 1,800 bookable + 2,436 catalog = 4,236 (same as pre-import).
- Destinations: 143 (unchanged), all 143 active.
- Editorial overrides on DIDA properties: all `false` (no editorial data touched).
- DIDA room records: 0 (no property_rooms linked to DIDA properties).
- DIDA bookings: 0 (no bookings linked to DIDA properties).

### 10.5 Migration Execution Analysis

**Confirmed fact:** 4 permanent migrations were applied via `apply_migration`, plus 2 hotels were inserted via `execute_sql` (ephemeral).

| Mechanism | Hotels | Migration file exists? |
|-----------|-------|------------------------|
| `apply_migration` | dida-212171, dida-1427078, dida-2547145, dida-57862, dida-57875, dida-152719, dida-1554833, dida-56161 | Yes (4 files) |
| `execute_sql` | dida-57700, dida-62214 | No |

The migration files confirm this in their headers. Batch 1 migration states: "Two hotels (dida-57700, dida-62214) were inserted via execute_sql in a prior batch; this migration adds the remaining 8."

**Idempotency:** All migration INSERTs use `ON CONFLICT (id) DO NOTHING` for properties and `ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING` for supplier_property_keys. Re-running these migrations is safe — they will not duplicate or overwrite records.

**ISSUE FOUND — Migration gap for 2 hotels:**
Hotels `dida-57700` (Aston Denpasar Hotel & Convention Center) and `dida-62214` (Sanur Resort Watujimbar) were inserted via `execute_sql`, which does not create a migration file. If the database were rebuilt from migrations alone (e.g., a fresh environment or disaster recovery), these 2 records would be missing. The other 8 hotels are safely captured in permanent migrations.

**Risk level:** Low for the current environment (the records exist in the live database). Medium for environment rebuilds — 2 of 10 DIDA records would need to be re-inserted manually.

**Recommendation:** Create a fifth migration file containing the INSERTs for dida-57700 and dida-62214 to ensure full reproducibility. This should be done before importing more hotels, not during this read-only audit.

### 10.6 Image and Price Verification

**Images — what was actually stored:**

Each of the 10 properties has exactly 1 image entry in the `images` JSONB array:
```json
{"url": "https://image-cdn.rollinggo.cn/...", "source": "dida", "rights_confirmed": true}
```

| Claim | Verified? | Evidence |
|-------|-----------|----------|
| Image URLs stored in database | CONFIRMED | 10/10 properties have image URLs in `images` column |
| Images downloaded to Supabase Storage | NOT CONFIRMED | No storage objects found; no storage bucket for DIDA images. URLs are remote-referenced only. |
| Images accessible at their URLs | NOT TESTED | The audit did not perform HTTP requests to the CDN URLs. Accessibility cannot be confirmed from database state alone. |

**Important distinction:** Storing a CDN URL in the database is not the same as downloading an image. No images were downloaded. The `rights_confirmed: true` flag documents the data-use permission but does not indicate that images were copied to local storage.

**Prices — provenance audit:**

Each property stores `price_per_night` (numeric) and `currency` (text, all USD). The `supplier_payload` JSONB stores `priceLowest` and `currency` but was checked for additional provenance fields:

| Provenance field | Stored? |
|------------------|---------|
| `priceLowest` | Yes (all 10) |
| `currency` | Yes — "USD" (all 10) |
| `checkInDate` (search date) | **NO — not stored** |
| `stayNights` (length of stay) | **NO — not stored** |
| `retrievalTimestamp` (when price was fetched) | **NO — not stored** |

The search parameters (check-in 2026-11-15, 2 nights, 2 adults) are documented in the migration file comments and the `source_url` field, but are NOT captured in the structured `supplier_payload` JSON.

**ISSUE FOUND — Price provenance gap:**
The stored prices cannot be traced to their search date or retrieval timestamp from the database alone. Without `checkInDate`, `stayNights`, or `retrievalTimestamp` in the `supplier_payload`, there is no structured record of when or under what search conditions these prices were obtained.

**Recommendation:** These prices should be presented as "indicative starting from" only, not as guaranteed or current rates. Future imports should include `checkInDate`, `stayNights`, `adultCount`, and `retrievedAt` in the `supplier_payload` JSON.

### 10.7 System Isolation Verification

| Isolation check | Result |
|-----------------|--------|
| Hotelbeds sync history records | 0 (sync has never run) |
| Hotelbeds destination queue — sync_status distribution | 3 completed, 8 partial, 36 ready, 45 pending, 1 pending_verification (unchanged from pre-pilot state) |
| Hotelbeds queue worker invoked | Not verified — no sync history records exist, indicating no sync has been triggered |
| Paymentgate edge functions modified | Not modified — `paymentgate-payment` and `paymentgate-webhook` source files untouched |
| DIDA booking workflow introduced | None — 0 DIDA bookings, 0 DIDA room records, no booking edge function for DIDA |
| Additional destinations imported | No — destinations count remains 143 |
| Additional hotels beyond the 10 | No — DIDA property count is exactly 10 |

**Assumption noted:** The Hotelbeds destination queue contains 45 `pending` and 36 `ready` entries, but the sync history table has 0 records. This indicates the queue was populated but the worker has not executed any sync runs. The audit confirms no sync occurred during or after the DIDA import, but cannot independently verify whether the queue was explicitly "paused" vs. simply never started. The Phase 4-6 documentation states the queue was paused; the database state is consistent with that claim.

### 10.8 Audit Summary — Confirmed Facts vs. Assumptions vs. Issues

**Confirmed facts (verified from live database state):**
1. Exactly 10 DIDA properties and 10 SPK entries exist, all correctly linked.
2. Zero duplicates across the entire 4,246-property catalogue (name, coordinate, and address checks).
3. All 10 properties satisfy every safety constraint (`is_active=false`, `booking_enabled=false`, `property_status='catalog'`, `verification_status='needs_review'`, `supplier_status='not_connected'`).
4. RLS policy excludes all 10 from public queries.
5. Hotelbeds properties, destinations, editorial overrides, room records, and bookings are unchanged.
6. 8 of 10 hotels are in permanent migrations with idempotent `ON CONFLICT DO NOTHING`.
7. Image URLs are stored in the database; no images were downloaded to storage.
8. Prices include currency but lack structured search-date and retrieval-timestamp provenance.
9. No DIDA booking workflow, no additional destinations, no additional hotels.

**Assumptions (not independently verifiable from database state):**
1. Hotelbeds queue is "paused" — the database shows no sync history, consistent with a paused state, but no explicit pause flag was found in the queue table schema.
2. Image CDN URLs are accessible — not tested via HTTP during this audit.
3. Paymentgate workflows were not modified — based on source file inspection, not runtime testing.

**Issues requiring correction:**
1. **Migration gap:** Hotels `dida-57700` and `dida-62214` lack a migration file. If the database is rebuilt from migrations alone, these 2 records will be missing. Create a fifth migration to capture them.
2. **Price provenance gap:** The `supplier_payload` does not store `checkInDate`, `stayNights`, or `retrievalTimestamp`. Prices should be labeled "indicative" until provenance is captured. Future imports should include these fields.
3. **Image accessibility unverified:** CDN URLs were not tested for HTTP accessibility. Before any public display, verify that URLs return valid images.

---

## 11. Phase 8 Repairs (2026-10-22)

All three issues identified in Section 10.8 have been corrected. See `docs/phase-8-dida-data-integrity.md` for the full repair report.

### 11.1 Migration Gap — RESOLVED

A fifth migration (`20261021225350_20261021120400_dida_bali_pilot_batch0.sql.sql`) was applied capturing the two missing hotels. The migration uses `ON CONFLICT (id) DO NOTHING` and `ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING` for idempotency. Applied successfully against the live database with zero duplicates created — DIDA property count remains exactly 10.

### 11.2 Price Provenance — RESOLVED

A provenance repair migration (`20261021225420_20261021120500_dida_price_provenance_repair.sql.sql`) was applied adding `checkInDate`, `stayNights`, `retrievedAt`, `provenanceStatus`, and `priceType` to all 10 DIDA `supplier_payload` JSONB fields. Values were recovered from actual data (`source_url` query parameters and `first_seen_at` timestamps), not invented.

### 11.3 Image Accessibility — VERIFIED

All 10 DIDA image URLs were tested via HTTP GET requests. All 10 returned HTTP 200 with `content-type: image/jpeg` and real byte sizes ranging from 15 KB to 1.4 MB. All URLs belong to `image-cdn.rollinggo.cn` (the expected DIDA/RollingGo CDN).

### 11.4 Regression Tests — ADDED

A new test file (`src/lib/__tests__/dida-data-integrity.test.ts`) was created with 147 test assertions covering migration idempotency, supplier-ID consistency, price provenance schema validation, missing provenance handling, property visibility, and booking safety. All 147 tests pass.
