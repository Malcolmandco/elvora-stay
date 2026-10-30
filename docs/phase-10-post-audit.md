# Phase 10 Post-Implementation Audit

**Audit Date:** 2026-10-26
**Scope:** Elvora Stay — DIDA hotel enrichment (Phase 10) post-implementation verification
**Method:** Read-only database queries against live Supabase instance, HTTP HEAD checks on image URLs, local file inspection. No database writes, no supplier API calls, no function redeployments, no price refreshes.

---

## 1. Record Counts and Safety Flags

### DIDA records (properties table)

| Metric | Count |
|--------|-------|
| Total DIDA records | 46 |
| Bali (pilot, excluded from Phase 10 scope) | 10 |
| Non-Bali (Phase 10 scope: Tokyo, Santorini, Marrakech, Sydney) | 36 |

**Per-destination counts (non-Bali):**

| Destination | Count |
|-------------|-------|
| Tokyo | 10 |
| Santorini | 6 |
| Marrakech | 10 |
| Sydney | 10 |

Query: `SELECT destination_name, COUNT(*) FROM properties WHERE supplier_name = 'dida' GROUP BY destination_name`

### Safety flags — all 46 DIDA records

| Flag | Expected | Actual | Pass |
|------|----------|--------|------|
| is_active = false | 46 | 46 | YES |
| booking_enabled = false | 46 | 46 | YES |
| property_status = 'catalog' | 46 | 46 | YES |
| verification_status = 'needs_review' | 46 | 46 | YES |

Query: `SELECT COUNT(*) FILTER (WHERE is_active=false), ... FROM properties WHERE supplier_name='dida'`
Bali subset independently confirmed: 10/10 on all four flags.

### Hotelbeds records — unchanged

| Metric | Count |
|--------|-------|
| Total Hotelbeds records | 4,236 |
| Records modified since 2026-10-22 | 0 |

Query: `SELECT COUNT(*) FROM properties WHERE supplier_name='hotelbeds' AND updated_at >= '2026-10-22'::timestamptz`

Total properties table: 4,282 (4,236 hotelbeds + 46 dida). No Hotelbeds records were touched during Phase 10.

---

## 2. Per-Property Detail (36 Non-Bali Records)

Legend: Desc = description status (authentic = full supplier text; placeholder = "Name - City, Country" only), Images = image count, Amen = amenity count, Tags = tag count, Sync = last_synced_at.

### Tokyo (10)

| ID | Description | Long Desc | Images | Amen | Tags | Brand | Lat/Lng | Rating | Sync |
|----|-------------|-----------|--------|------|------|-------|---------|--------|------|
| dida-118607 | authentic | authentic | 1 | 23 | 14 | Dome | 35.704, 139.753 | 5 | 2026-10-23 |
| dida-3912 | authentic | authentic | 1 | 23 | 6 | Gracery | 35.695, 139.702 | 4 | 2026-10-23 |
| dida-526 | **placeholder** | **placeholder** | 0 | 0 | 0 | Metropolitan | 35.728, 139.708 | 3.5 | 2026-10-22 |
| dida-527 | authentic | authentic | 1 | 19 | 7 | (empty) | 35.697, 139.705 | 4 | 2026-10-23 |
| dida-529 | authentic | authentic | 1 | 24 | 9 | Hotel Sunroute | 35.687, 139.699 | 3.5 | 2026-10-23 |
| dida-5293 | authentic | authentic | 1 | 13 | 9 | Mitsui Garden Hotels | 35.660, 139.757 | 4 | 2026-10-23 |
| dida-5381 | **placeholder** | **placeholder** | 1 | 0 | 0 | Mitsui Garden Hotel | 35.670, 139.766 | 5 | 2026-10-23 |
| dida-5422 | **placeholder** | **placeholder** | 1 | 0 | 0 | Mitsui Garden Hotel | 35.712, 139.778 | 4 | 2026-10-23 |
| dida-616102 | authentic | authentic | 1 | 17 | 6 | JHAT | 35.552, 139.740 | 3 | 2026-10-23 |
| dida-617191 | authentic | authentic | 1 | 16 | 8 | Mitsui Garden Hotels | 35.625, 139.725 | 4 | 2026-10-23 |

### Santorini (6)

| ID | Description | Long Desc | Images | Amen | Tags | Brand | Lat/Lng | Rating | Sync |
|----|-------------|-----------|--------|------|------|-------|---------|--------|------|
| dida-1599868 | authentic | authentic | 1 | 25 | 6 | (empty) | 36.433, 25.423 | 3.5 | 2026-10-23 |
| dida-187024 | authentic | authentic | 1 | 17 | 8 | (empty) | 36.419, 25.436 | 2 | 2026-10-23 |
| dida-47522 | authentic | authentic | 1 | 14 | 7 | (empty) | 36.418, 25.433 | 3 | 2026-10-23 |
| dida-49117 | authentic | authentic | 1 | 45 | 13 | Caldera Collection / Selected Hideaways | 36.395, 25.438 | 5 | 2026-10-23 |
| dida-49165 | authentic | authentic | 1 | 20 | 6 | (empty) | 36.423, 25.435 | 3 | 2026-10-23 |
| dida-49257 | **placeholder** | **placeholder** | 1 | 0 | 0 | (empty) | 36.416, 25.432 | 4 | 2026-10-23 |

### Marrakech (10)

| ID | Description | Long Desc | Images | Amen | Tags | Brand | Lat/Lng | Rating | Sync |
|----|-------------|-----------|--------|------|------|-------|---------|--------|------|
| dida-1001700 | **placeholder** | **placeholder** | 1 | 0 | 0 | (empty) | 31.626, -8.003 | 5 | 2026-10-23 |
| dida-1003490 | **placeholder** | **placeholder** | 0 | 0 | 0 | (empty) | 31.653, -8.020 | 3 | 2026-10-22 |
| dida-113332 | **placeholder** | **placeholder** | 0 | 0 | 0 | Sofitel | 31.622, -8.001 | 5 | 2026-10-23 |
| dida-1597849 | **placeholder** | **placeholder** | 1 | 0 | 0 | (empty) | 31.631, -8.012 | 4 | 2026-10-23 |
| dida-1716974 | authentic | authentic | 1 | 8 | 7 | (empty) | 31.631, -8.015 | 3 | 2026-10-23 |
| dida-233847 | authentic | authentic | 1 | 68 | 19 | Movenpick Living | 31.624, -8.015 | 5 | 2026-10-23 |
| dida-35156 | authentic | authentic | 1 | 44 | 18 | Es Saadi | 31.625, -8.011 | 5 | 2026-10-23 |
| dida-35158 | authentic | authentic | 1 | 31 | 17 | Kenzi Hotels | 31.622, -8.007 | 5 | 2026-10-23 |
| dida-35188 | authentic | authentic | 1 | 46 | 14 | (empty) | 31.630, -8.016 | 4 | 2026-10-23 |
| dida-35251 | authentic | authentic | 1 | 23 | 7 | (empty) | 31.638, -8.017 | 4 | 2026-10-23 |

### Sydney (10)

| ID | Description | Long Desc | Images | Amen | Tags | Brand | Lat/Lng | Rating | Sync |
|----|-------------|-----------|--------|------|------|-------|---------|--------|------|
| dida-1421807 | authentic | authentic | 1 | 30 | 9 | Doma Hotels | -33.866, 151.205 | 4 | 2026-10-23 |
| dida-15136 | **placeholder** | **placeholder** | 1 | 0 | 0 | Hyatt | -33.870, 151.204 | 5 | 2026-10-23 |
| dida-15170 | authentic | authentic | 1 | 53 | 20 | Shangri-La Hotels & Resorts | -33.861, 151.206 | 5 | 2026-10-23 |
| dida-15171 | authentic | authentic | 1 | 59 | 17 | Mercure | -33.884, 151.203 | 4.5 | 2026-10-23 |
| dida-15182 | authentic | authentic | 1 | 55 | 15 | Four Seasons | -33.862, 151.208 | 5 | 2026-10-23 |
| dida-15186 | authentic | authentic | 1 | 21 | 11 | Yeh's Group | -33.873, 151.204 | 4 | 2026-10-23 |
| dida-15218 | authentic | authentic | 1 | 19 | 11 | Accor Hotels | -33.874, 151.217 | 4 | 2026-10-23 |
| dida-1620799 | authentic | authentic | 1 | 26 | 10 | Citadines | -33.838, 151.209 | 4 | 2026-10-23 |
| dida-187570 | **placeholder** | **placeholder** | 1 | 0 | 0 | Great Southern | -33.881, 151.204 | 4 | 2026-10-23 |
| dida-290497 | **placeholder** | **placeholder** | 0 | 0 | 0 | Travelodge | -33.928, 151.186 | 5 | 2026-10-23 |

---

## 3. Description Authenticity

**Definition:** A "placeholder" description is one that merely restates the hotel name and location (e.g., "Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan") with no actual property content. An "authentic" description contains substantive supplier-provided text (Property Location, Area Attractions, Rec/Spa/Premium Amenities, Business/Other Amenities sections).

### Summary

| Status | Count | Coverage |
|--------|-------|----------|
| Authentic description | 25 | 69% |
| Placeholder description | 11 | 31% |
| **Total** | **36** | |

### Placeholder descriptions identified (11 records)

These descriptions are NOT successful enrichment — they are fallback strings containing only the hotel name and destination:

1. dida-1001700 — "Royal Mirage Deluxe Marrakech - Marrakech, Morocco"
2. dida-1003490 — "Riad Marrakech House - Marrakech, Morocco"
3. dida-113332 — "Sofitel Marrakech Palais Imperial & Spa - Marrakech, Morocco"
4. dida-1597849 — "Longue Vie Hôtels - Marrakech, Morocco"
5. dida-49257 — "Athina Luxury Suites - Santorini, Greece"
6. dida-15136 — "Hyatt Regency Sydney - Sydney, Australia"
7. dida-187570 — "Great Southern Hotel Sydney - Sydney, Australia"
8. dida-290497 — "Travelodge Hotel Sydney Airport - Sydney, Australia"
9. dida-526 — "Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan"
10. dida-5381 — "Millennium Mitsui Garden Hotel Tokyo/Ginza - Tokyo, Japan"
11. dida-5422 — "Mitsui Garden Hotel Ueno Tokyo - Tokyo, Japan"

Each placeholder description has a matching placeholder long_description (the same string wrapped in `<p></p>` tags). No invented supplier content was found — placeholders are clearly name-only fallbacks.

### Discrepancy with Phase 10 documentation

The Phase 10 doc claims 100% description and long-description coverage (36/36). This audit found only 25/36 (69%) have authentic descriptions. The 11 placeholder records were counted as "enriched" in the original report but do not contain actual supplier descriptions.

---

## 4. Images

### Summary

| Metric | Count |
|--------|-------|
| Properties with >=1 supplier image URL | 32 |
| Properties with 0 images | 4 |
| Total image URLs stored | 32 (1 per property with images) |

### Properties with zero images (4)

1. dida-1003490 (Riad Marrakech House, Marrakech)
2. dida-113332 (Sofitel Marrakech Palais Imperial & Spa, Marrakech)
3. dida-290497 (Travelodge Hotel Sydney Airport, Sydney)
4. dida-526 (Hotel Metropolitan Tokyo Ikebukuro, Tokyo)

### Image URL characteristics

All 32 stored image URLs share these properties:
- Domain: `image-cdn.rollinggo.cn`
- Source field: `"dida"`
- Rights confirmed: `true`
- Format: JSONB array with url, source, rights_confirmed fields

### URL accessibility (HTTP HEAD checks)

All 32 stored URLs were tested via HTTP HEAD. Results:

| HTTP Status | Count | Notes |
|-------------|-------|-------|
| 200 OK | 31 | Accessible |
| 404 Not Found | 1 | Broken URL |
| Intermittent timeout (000→200 on retry) | several | CDN latency, not broken |

**Broken URL (confirmed 404 on 3 consecutive attempts):**
- dida-35156 (Es Saadi Marrakech Resort Hotel): `https://image-cdn.rollinggo.cn/Image/MA/35156/Featured%20Image/f89be339_b.jpg`

Several URLs exhibited intermittent connection timeouts (HTTP 000) from this sandbox environment but returned 200 on retry with longer timeouts. These are attributed to network latency to the CDN, not broken URLs. No images were downloaded or replaced during this audit.

---

## 5. Two Unresolved Hotels

The Phase 10 doc identifies two properties that returned no data from the DIDA API. Their current stored state:

### dida-526 — Hotel Metropolitan Tokyo Ikebukuro

| Field | Stored Value |
|-------|--------------|
| Destination | Tokyo |
| Description | "Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan" (placeholder) |
| Long description | "<p>Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan</p>" (placeholder) |
| Images | 0 (empty array) |
| Amenities | 0 (empty array) |
| Tags | 0 (empty array) |
| Brand | "Metropolitan" |
| Latitude/Longitude | 35.728 / 139.708 |
| Rating | 3.5 |
| last_synced_at | 2026-10-22 06:00:00 UTC |
| is_active | false |
| booking_enabled | false |
| property_status | catalog |
| verification_status | needs_review |

### dida-1003490 — Riad Marrakech House

| Field | Stored Value |
|-------|--------------|
| Destination | Marrakech |
| Description | "Riad Marrakech House - Marrakech, Morocco" (placeholder) |
| Long description | "<p>Riad Marrakech House - Marrakech, Morocco</p>" (placeholder) |
| Images | 0 (empty array) |
| Amenities | 0 (empty array) |
| Tags | 0 (empty array) |
| Brand | (empty) |
| Latitude/Longitude | 31.653 / -8.020 |
| Rating | 3 |
| last_synced_at | 2026-10-22 06:00:00 UTC |
| is_active | false |
| booking_enabled | false |
| property_status | catalog |
| verification_status | needs_review |

Both properties retain their initial import data only. No supplier content was invented. Their `last_synced_at` timestamps (2026-10-22) predate the main enrichment batch (2026-10-23), confirming they were not enriched.

---

## 6. Prices and Provenance

### Properties table — price fields

All 36 non-Bali records have:
- `price_per_night`: populated (range $21.35–$618.96 USD)
- `currency`: "USD"
- `price_display_mode`: "check_availability" (correctly signals prices are indicative, not bookable)

No dedicated "stale-price" or "indicative-price" label column exists on the properties table. The `price_display_mode = 'check_availability'` value is the only signal that prices are not live-bookable rates.

### supplier_property_keys — price provenance

The `supplier_property_keys` table stores the original DIDA API payload including `priceLowest` and `currency` for all 36 records. However, price provenance metadata is severely incomplete:

| Provenance Field | Non-Bali (36) | Bali pilot (10) |
|-----------------|---------------|-----------------|
| priceLowest | 36/36 | 10/10 |
| currency | 36/36 | 10/10 |
| checkInDate | **0/36** | 10/10 |
| stayNights | **0/36** | 10/10 |
| retrievedAt | **0/36** | 10/10 |
| provenanceStatus | **0/36** | 10/10 |
| priceType | **0/36** | 10/10 |

Query: `SELECT ... FROM supplier_property_keys WHERE supplier_name='dida' AND property_id IN (...36 non-Bali IDs...)`

### Finding: Price provenance gap

The `dida_price_provenance_repair` migration (20261021225420) added provenance fields (checkInDate, stayNights, retrievedAt, provenanceStatus, priceType) only to the 10 Bali pilot records. The 36 non-Bali records imported in Phase 9 and enriched in Phase 10 received no equivalent provenance repair. Their prices have no recorded search date, stay length, or retrieval timestamp, and no explicit indicative/stale-price label.

The Bali pilot records all show:
- checkInDate: "2026-11-15"
- stayNights: "2"
- provenanceStatus: "recovered_from_source_url"
- priceType: "indicative_search_result"

The non-Bali records have none of these fields. No prices were refreshed during this audit.

---

## 7. Migrations

### Local files vs. applied migrations

| Metric | Count |
|--------|-------|
| Migration files on disk | 37 |
| Migrations applied in database | 36 |

All 36 applied migrations have a matching file on disk. One file on disk has no corresponding applied migration.

### Duplicate migration file not removed

**File:** `20261006120000_create_property_rooms_and_sync_queue.sql` (172 lines)
**Applied counterpart:** `20261007005151_create_property_rooms_and_sync_queue.sql` (165 lines)

The Phase 10 doc states "Duplicate migration files in supabase/migrations/" were removed during cleanup. However, this duplicate remains on disk. Diff comparison shows the two files are near-identical (same CREATE TABLE, same RLS policies) with minor comment differences. The applied version (20261007005151) is the one the database used; the 20261006120000 version is genuinely redundant and was never applied. It should have been deleted but was not.

No migration files were deleted or modified during this audit.

### Santorini enrichment migration

The Phase 10 doc lists one migration file as modified: `20261024111916_20261024120001_dida_enrich_santorini.sql.sql`. Inspection confirms it contains UPDATE statements for 6 Santorini properties with full descriptions, amenities, tags, images, coordinates, ratings, and safety-clause WHERE predicates (`WHERE id = 'dida-<id>' AND supplier_name = 'dida'`). The content matches the stored database records.

Note: Only the Santorini enrichment was persisted as a migration file. Enrichment for Tokyo, Marrakech, and Sydney was applied via `execute_sql` MCP tool without corresponding migration files on disk, per the Phase 10 doc's methodology description.

---

## 8. Scope and Security — Edge Functions

### Deployed functions

26 edge functions are deployed and ACTIVE. The `dida-capability-test` function (used for Phase 10 enrichment via searchHotels/getHotelDetail modes) is deployed with `verifyJWT: true`.

### Deploy state

The `supabase/functions-deploy-state.json` file records all 26 functions with `hasChanged: false`. This is consistent with no functions being redeployed during or after Phase 10. The dida-capability-test function was already deployed before Phase 10 and was used as-is.

### Unrelated functions

No evidence of unrelated function changes. The deployed function list matches the on-disk source directories. No functions were redeployed, no secrets were changed, and no authentication was disabled during this audit.

### Verification limitation

The deploy-state file does not record deployment timestamps, so the exact last-deploy time of each function cannot be determined from this file alone. The `hasChanged: false` flags indicate no pending undeployed changes, not that functions were unchanged during Phase 10 specifically.

---

## 9. Summary of Unresolved Issues

| # | Issue | Severity | Records Affected |
|---|-------|----------|-----------------|
| 1 | Placeholder descriptions counted as enriched | Medium | 11 of 36 records |
| 2 | Price provenance missing for non-Bali records | Medium | 36 of 36 non-Bali records |
| 3 | Broken image URL (404) | Low | 1 record (dida-35156) |
| 4 | Zero images for 4 properties | Low | dida-1003490, dida-113332, dida-290497, dida-526 |
| 5 | Two unresolved hotels with no supplier data | Known | dida-526, dida-1003490 |
| 6 | Duplicate migration file not removed | Low | 20261006120000_create_property_rooms_and_sync_queue.sql |
| 7 | No explicit stale/indicative price label for non-Bali | Low | 36 records (mitigated by price_display_mode='check_availability') |

### Issues NOT found

- No safety flags were violated — all 46 DIDA records remain inactive, unbookable, catalog status, needs review.
- No Hotelbeds records were modified.
- No database writes occurred during this audit.
- No supplier API calls were made during this audit.
- No invented supplier content was detected — placeholders are clearly name-only fallbacks, not fabricated descriptions.

---

## 10. Audit Limitations

1. **Image accessibility:** HTTP HEAD checks were performed from a sandboxed environment. Intermittent timeouts (HTTP 000) occurred for some CDN URLs but resolved to 200 on retry. One URL (dida-35156) returned a consistent 404 across 3 attempts and is reported as broken. All other 31 URLs returned 200 on at least one attempt.
2. **Edge function deployment timestamps:** The deploy-state file records change status, not deployment history. Exact Phase 10 deployment timing could not be determined.
3. **Price freshness:** No price-refresh or booking/price-confirmation tools were called. Price values and provenance are reported as stored; no determination of current market accuracy was made.
4. **Enrichment SQL for non-Santorini destinations:** Tokyo, Marrakech, and Sydney enrichment was applied via `execute_sql` (not `apply_migration`), so no on-disk migration files exist for those updates. Database content was verified directly but the original SQL statements are not reproducible from files.
