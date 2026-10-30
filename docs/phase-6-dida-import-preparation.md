# ELVORA STAY — PHASE 6: DIDA IMPORT PREPARATION AND DATA-RIGHTS VERIFICATION

**Date:** 2026-10-21  
**Phase:** 6 (Read-only audit, no imports, no supplier calls, no code changes)  
**Status:** Complete

---

## 1. PHASE 5A EVIDENCE REVIEW

### 1.1 Destinations Searched

The Phase 5A report at `docs/phase-5a-dida-search-testing.md` documents five destinations:

| # | Elvora ID | Name | DIDA Place | Hotels Returned |
|---|---|---|---|---|
| 1 | dest-bali | Bali | Denpasar Indonesia | 10 |
| 2 | dest-tokyo | Tokyo | Tokyo Japan | 10 |
| 3 | dest-santorini | Santorini | Santorini Greece | 6 |
| 4 | dest-marrakech | Marrakech | Marrakech Morocco | 10 |
| 5 | dest-sydney | Sydney | Sydney Australia | 10 |

### 1.2 Report Completeness Assessment

| Criterion | Finding |
|---|---|
| Per-hotel results with hotel IDs, names, coordinates, areaCode, prices | **Yes** — all 46 hotels listed individually with all fields |
| Country validation per hotel | **Yes** — every hotel's `areaCode` checked against expected country |
| Coordinate validation per hotel | **Yes** — every hotel's lat/lon checked against bounding boxes |
| Bounding boxes defensible | **Partially** — boxes were estimated from destination center ± ~0.15–0.5°, not from verified administrative boundaries. They are reasonable for city-level destinations but would need tightening for islands and regions. |
| Address verification | **Yes** — addresses listed and checked for consistency with destination |
| Duplicate detection | **Yes** — database query confirmed zero existing properties in the five search areas |
| Distinguishes valid matches from possible duplicates and needs-review | **Yes** — classification column used for every hotel |

### 1.3 Repeated Bali Request

The report discloses that 6 function calls were made (not 5). The 6th call was a re-fetch of Bali results with identical parameters. The first call's console output was truncated at 8,000 characters, showing only 2 of 8 hotels. The re-fetch returned 10 hotels (not 8), which means the second call may have returned slightly different results than the first — DIDA's search results are not guaranteed to be deterministic. This is a minor data-integrity concern: the report's Bali hotel table (10 hotels) is based on the second call, not the first.

**Unsupported claims:** The report states "100% valid match rate" based on 46 results. This is accurate for the 5 tested destinations but cannot be generalized to DIDA's global catalog. The report does not claim global coverage — it correctly limits its recommendation to "suitable for a future controlled catalog-import phase, with conditions."

---

## 2. DIDA/ROLLINGGO DATA-RIGHTS FINDINGS

### 2.1 Search Results

Two web searches were conducted:
1. `"RollingGo DIDA hotel API terms of service data rights licensing"` — no RollingGo-specific results found
2. `"site:rollinggo.ai terms conditions API agreement"` — zero results returned

The RollingGo website (rollinggo.ai) does not appear to have publicly indexed terms of service, API usage agreements, or data licensing documentation. No documentation was found in the project repository either — the DIDA adapter (`supabase/functions/_shared/dida-mcp.ts`) contains no references to terms of service, data usage rights, or licensing.

### 2.2 Data-Rights Assessment

| Use Case | Status | Notes |
|---|---|---|
| Storing hotel names and descriptions in Elvora Stay's database | **C — No conclusive documentation found** | No terms of service or API agreement found |
| Caching search results beyond the current request | **C — No conclusive documentation found** | |
| Displaying DIDA hotel information on a third-party customer-facing website | **C — No conclusive documentation found** | |
| Displaying DIDA hotel photographs | **C — No conclusive documentation found** | Images hosted on `image-cdn.rollinggo.cn` |
| Downloading and storing photographs locally | **C — No conclusive documentation found** | |
| Resizing, cropping, transforming, or optimizing photographs | **C — No conclusive documentation found** | |
| Displaying supplier-provided prices | **C — No conclusive documentation found** | |
| Displaying supplier-provided amenities and ratings | **C — No conclusive documentation found** | |
| Using returned booking URLs | **C — No conclusive documentation found** | Booking URLs point to rollinggo.ai |
| Using supplier data for commercial hotel discovery | **C — No conclusive documentation found** | |

**A = Explicitly documented permission; B = Explicitly documented restriction; C = No conclusive documentation found.**

### 2.3 Conclusion

**No DIDA/RollingGo data-rights documentation was found.** Missing documentation must NOT be interpreted as permission. Until explicit written permission is obtained from DIDA/RollingGo, Elvora Stay must not:
- Display DIDA hotel data on customer-facing pages
- Display, download, or transform DIDA hotel images
- Use DIDA booking URLs commercially
- Present DIDA prices as bookable rates

### 2.4 Questions That Must Be Sent to DIDA/RollingGo

The following questions must be answered in writing before any commercial use:

1. Does the API key agreement permit storing hotel names, descriptions, addresses, coordinates, amenities, and star ratings in a third-party database?
2. Does the agreement permit caching search results for more than 24 hours?
3. May DIDA hotel information be displayed on a customer-facing travel booking website?
4. May DIDA hotel images (hosted on image-cdn.rollinggo.cn) be displayed via hotlinking on a third-party site?
5. May DIDA hotel images be downloaded, resized, and stored locally?
6. May supplier-provided prices be displayed to end users as indicative rates?
7. May the returned booking URLs be used as affiliate links or within an iframe?
8. Is there a commercial booking flow (API-based) separate from the rollinggo.ai website?
9. What attribution or branding requirements apply when displaying DIDA hotel data?
10. What are the rate limits and quota restrictions on the API key?

**Do not contact the supplier on the user's behalf.** These questions are provided for the admin to send directly.

---

## 3. EXISTING DATABASE SCHEMA ANALYSIS

### 3.1 Properties Table — Key Columns

| Column | Type | Nullable | Default | Purpose for DIDA Import |
|---|---|---|---|---|
| id | text | NO | — | Primary key. Must be unique across Hotelbeds + DIDA. Hotelbeds uses text IDs like "hb-XXX". DIDA should use a distinct prefix like "dida-XXX". |
| name | text | NO | — | Hotel name from DIDA |
| slug | text | NO | — | URL slug, must be unique (UNIQUE constraint) |
| brand | text | YES | NULL | DIDA `brand` field |
| description | text | NO | — | DIDA HTML description (or stripped text) |
| long_description | text | NO | — | Extended description |
| property_type | text | NO | — | e.g., "hotel" |
| property_status | text | NO | 'catalog' | CHECK: catalog, bookable, coming_soon, archived |
| supplier_status | text | NO | 'not_connected' | |
| verification_status | text | NO | 'needs_review' | |
| booking_enabled | boolean | NO | false | |
| destination_id | text | YES | NULL | FK to destinations(id) ON DELETE SET NULL |
| country | text | NO | — | From DIDA areaCode or destination country |
| city | text | NO | — | From DIDA destination or address |
| latitude | double | YES | NULL | DIDA latitude |
| longitude | double | YES | NULL | DIDA longitude |
| address | text | YES | NULL | DIDA address |
| rating | double | YES | NULL | DIDA starRating |
| amenities | text[] | NO | '{}' | DIDA hotelAmenities |
| tags | text[] | NO | '{}' | DIDA tags |
| images | jsonb | NO | '[]' | DIDA imageUrl — **DO NOT POPULATE until image rights confirmed** |
| is_active | boolean | NO | true | **Must be set to false for DIDA imports** |
| supplier_hotel_code | text | YES | NULL | DIDA hotelId (as string) |
| supplier_name | text | YES | 'hotelbeds' | Set to "dida" for DIDA properties |
| last_synced_at | timestamptz | YES | NULL | Import timestamp |
| elvora_* fields | various | YES | NULL | Editorial override fields — do not populate during import |
| editorial_override | boolean | YES | false | Set to false on import |
| supplier_amenities | text[] | NO | '{}' | Raw DIDA amenities (separate from editorial) |
| amenities_override | boolean | NO | false | Set to false |

### 3.2 Key Constraints and Indexes

| Name | Type | Definition |
|---|---|---|
| properties_pkey | PK | PRIMARY KEY (id) |
| properties_slug_key | UNIQUE | UNIQUE (slug) |
| properties_property_status_check | CHECK | property_status IN ('catalog','bookable','coming_soon','archived') |
| properties_destination_id_fkey | FK | destination_id REFERENCES destinations(id) ON DELETE SET NULL |
| idx_properties_supplier_composite | UNIQUE | UNIQUE (supplier_name, supplier_hotel_code) WHERE supplier_hotel_code IS NOT NULL |
| properties_supplier_name_supplier_hotel_code_idx | UNIQUE | UNIQUE (supplier_name, supplier_hotel_code) WHERE supplier_name IS NOT NULL AND <> '' AND supplier_hotel_code IS NOT NULL AND <> '' |
| idx_properties_is_active | BTREE | Index on is_active |
| idx_properties_property_status | BTREE | Index on property_status |
| idx_properties_destination_id | BTREE | Index on destination_id |
| idx_properties_country | BTREE | Index on country |

### 3.3 RLS Policies on Properties

| Policy | Command | Predicate |
|---|---|---|
| public_select_properties | SELECT | `is_active = true OR jwt.role = 'admin'` |
| admin_insert_properties | INSERT | (admin only) |
| admin_update_properties | UPDATE | (admin only) |
| admin_delete_properties | DELETE | (admin only) |

**Critical finding:** The public SELECT policy gates on `is_active = true`. Setting `is_active = false` on DIDA imports will hide them from all non-admin users via RLS. The frontend hooks (`use-properties.ts`) also filter on `.eq('is_active', true)` in every query. No frontend query filters on `property_status`, so `property_status = 'catalog'` is a secondary safeguard but not the primary gate.

### 3.4 supplier_property_keys Table

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| property_id | text | NO | — (FK to properties(id) ON DELETE CASCADE) |
| supplier_name | text | NO | — |
| supplier_hotel_code | text | NO | — |
| supplier_destination_id | text | YES | NULL |
| supplier_place | text | YES | NULL |
| supplier_place_type | text | YES | NULL |
| supplier_payload | jsonb | YES | NULL |
| first_seen_at | timestamptz | NO | now() |
| last_seen_at | timestamptz | NO | now() |

**Unique constraint:** (supplier_name, supplier_hotel_code) — prevents duplicate supplier identities.

### 3.5 Supplier Identity and Idempotency Design

**Problem:** `properties.supplier_name` + `properties.supplier_hotel_code` duplicates the identity information in `supplier_property_keys`. Both have unique constraints on the same pair.

**Solution:** The import should:
1. Check `supplier_property_keys` first (by supplier_name='dida' + supplier_hotel_code=hotelId). If a row exists, the hotel has already been imported — update `last_seen_at` only, do not create a new property.
2. If no supplier_property_keys row exists, check `properties` by (supplier_name='dida', supplier_hotel_code=hotelId) as a safety net.
3. If neither exists, insert into both `properties` and `supplier_property_keys` in a single transaction.
4. The `supplier_payload` column in `supplier_property_keys` stores the raw DIDA response for that hotel (minus secrets). This should be the only place raw payloads are kept — `properties` should hold only structured fields.

**Idempotency:** Re-running the import for the same destination should:
- Find existing DIDA properties via `supplier_property_keys`
- Update `last_seen_at` and `supplier_payload` (fresh search data)
- Update structured fields in `properties` ONLY if `editorial_override = false` (admin has not manually edited)
- Never overwrite `elvora_*` fields, `elvora_images`, or any field where `editorial_override = true`

### 3.6 DIDA vs Hotelbeds Property ID Collision Prevention

Hotelbeds properties use IDs like "hb-XXXXX" (text). DIDA properties should use a distinct prefix: "dida-{hotelId}" (e.g., "dida-57700"). The `supplier_name` column ("dida" vs "hotelbeds") and the unique constraint on `(supplier_name, supplier_hotel_code)` provide a second layer of protection.

The `properties_slug_key` UNIQUE constraint requires unique slugs. DIDA imports should generate slugs as "dida-{hotelId}-{normalized-name}" to avoid collisions with Hotelbeds slugs.

---

## 4. CROSS-SUPPLIER DUPLICATE DETECTION DESIGN

### 4.1 Staged Matching Process

**Stage 1: Exact Supplier-ID Match**  
Query `supplier_property_keys` for (supplier_name='dida', supplier_hotel_code=hotelId). If found, this is a re-import, not a duplicate.  
Also check if the DIDA hotelId coincidentally matches a Hotelbeds supplier_hotel_code — extremely unlikely given different ID formats, but check anyway.

**Stage 2: Strong Geographic + Name Match**  
For each DIDA hotel, find Hotelbeds properties in the same destination (or within 1 km) with:
- Coordinate distance ≤ 0.2 km (200 meters)
- Normalized name similarity ≥ 0.85 (using a normalized Levenshtein or Jaccard similarity on lowercased, punctuation-stripped names)
- Same star rating (± 0.5 stars)

Classification: **possible_duplicate** — flag for human review. Do not merge.

**Stage 3: Possible Match (Human Review)**  
- Coordinate distance ≤ 1.0 km AND name similarity ≥ 0.60, OR
- Coordinate distance ≤ 0.5 km AND same brand, OR
- Same address (normalized) AND same city

Classification: **needs_review** — flag for human review.

**Stage 4: No Likely Match**  
If no Hotelbeds property falls within any of the above thresholds, classify as **no_match** — safe to import as a new property.

### 4.2 Coordinate-Distance Thresholds

| Threshold | Rationale |
|---|---|
| 0.2 km (200m) | Same building or adjacent buildings. Resorts with multiple wings may span 200m. |
| 0.5 km | Same city block or nearby streets. Different hotels with similar names could exist here. |
| 1.0 km | Nearby but likely different properties. Useful for airports where multiple hotels cluster. |

**Edge cases:**
- **Resorts:** Large resorts may have coordinates pointing to different buildings. Use 0.5 km threshold with name similarity.
- **Airports:** Multiple airport hotels cluster within 1 km. Require name similarity ≥ 0.85 even at 0.2 km.
- **Missing coordinates:** If either property lacks coordinates, fall back to address + city + name matching only. Flag as `needs_review`.
- **Coordinates at city center (default):** Some suppliers default to city center when exact coordinates are unknown. If multiple hotels share identical coordinates, require name similarity for disambiguation.

### 4.3 Name Normalization

```
normalize(name):
  1. Lowercase
  2. Remove punctuation (.,'",-,&)
  3. Remove common hotel suffixes: "hotel", "resort", "spa", "by ihg", "by accor", "by hilton", "by marriott"
  4. Remove whitespace duplicates
  5. Trim
```

### 4.4 Required Indexes (for future implementation, do NOT create now)

| Proposed Index | Purpose |
|---|---|
| GIST index on properties USING (point(longitude, latitude)) | For efficient geographic range queries |
| BTREE index on properties (lower(name)) | For name-based lookup |
| BTREE index on properties (destination_id, supplier_name) | For filtering by destination + supplier |

The existing `idx_properties_destination_id` and `idx_properties_supplier_name` indexes partially cover these needs but a GIST point index would be needed for efficient coordinate-distance queries.

### 4.5 Duplicate Handling Rules

- **Never automatically merge** a DIDA property with a Hotelbeds property
- Flagged duplicates (`possible_duplicate` or `needs_review`) should set `verification_status = 'needs_review'` and remain `is_active = false`
- An admin must manually review and decide: merge, keep both, or reject the DIDA import
- The `supplier_property_keys` table should still record the DIDA hotel ID even for flagged duplicates, to prevent re-importing

---

## 5. PROPOSED IMPORT RECORD AND UNPUBLISHED INITIAL STATE

### 5.1 Mapping DIDA Search Result to Properties Row

| DIDA Field | Properties Column | Notes |
|---|---|---|
| hotelId | id (as "dida-{hotelId}") | Prefixed to avoid Hotelbeds collision |
| hotelId | supplier_hotel_code | Raw DIDA ID as string |
| "dida" | supplier_name | |
| name | name | |
| name → slugified | slug (as "dida-{hotelId}-{slug}") | Unique slug |
| brand | brand | |
| description (HTML) | description | May need HTML stripping |
| description | long_description | |
| "hotel" | property_type | |
| starRating | rating | |
| hotelAmenities | amenities + supplier_amenities | Both columns |
| tags | tags | |
| areaCode | country | **Verify areaCode is ISO 3166-1 alpha-2** |
| address | address | |
| destinationId (DIDA internal) | city (derived) | DIDA's destinationId is not a city name — use the search place |
| latitude | latitude | |
| longitude | longitude | |
| imageUrl | images | **DO NOT POPULATE until rights confirmed** — store as empty array |
| bookingUrl | source_url | Store for reference, do not use as booking link |
| price.lowestPrice | price_per_night | Search-time price only — do not present as guaranteed |
| "USD" | currency | |

### 5.2 Unpublished Initial State

| Column | Value | Effect |
|---|---|---|
| is_active | **false** | Hidden from public via RLS policy and all frontend queries |
| property_status | **'catalog'** | CHECK constraint allows this value; signals not yet bookable |
| booking_enabled | **false** | No booking flow available |
| verification_status | **'needs_review'** | Requires admin review before activation |
| supplier_status | **'not_connected'** | No live supplier connection established |
| editorial_override | **false** | No editorial overrides — all fields are raw supplier data |
| images | **'[]' (empty)** | No images until licensing confirmed |

**How this prevents customer visibility:**
1. RLS policy `public_select_properties` only allows `is_active = true` for non-admin users
2. Frontend hooks all filter `.eq('is_active', true)`
3. Even if RLS were bypassed, `property_status = 'catalog'` is not 'bookable'
4. `booking_enabled = false` prevents any booking attempt
5. Empty `images` array means no images would display even if the property were visible

### 5.3 Existing vs Proposed Columns

All columns used in the import record are **existing columns** in the `properties` table. No new columns need to be created. No schema modifications are required for the import.

### 5.4 supplier_property_keys Record

| Column | Value |
|---|---|
| property_id | The new properties.id ("dida-{hotelId}") |
| supplier_name | "dida" |
| supplier_hotel_code | hotelId (as string) |
| supplier_destination_id | DIDA internal destinationId |
| supplier_place | The DIDA place used for the search (e.g., "Denpasar Indonesia") |
| supplier_place_type | "city" |
| supplier_payload | Full DIDA hotel JSON (minus any secrets) |
| first_seen_at | now() |
| last_seen_at | now() |

---

## 6. IMAGE AND CONTENT HANDLING POLICY

### 6.1 Current Image Schema

The `properties.images` column is a `jsonb` array. The `elvora_images` column is a separate `jsonb` for editorial overrides. The `property_rooms.room_image` column stores a single image URL per room.

There is no column or field that distinguishes image source (Hotelbeds vs DIDA vs editorial upload). Images are stored as URL strings in the JSON array.

### 6.2 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Overwriting existing Hotelbeds images | High | DIDA imports should only insert new properties — never update existing Hotelbeds properties' images |
| Mixing DIDA photos into a Hotelbeds property | High | Duplicate detection must flag same-property matches before any image import |
| Broken external image URLs | Medium | DIDA image URLs are on `image-cdn.rollinggo.cn` — if the CDN goes down, images break. No local storage mitigates this. |
| Hotlinking restrictions | Medium | The CDN may block third-party hotlinking via Referer checks. This is untested. |
| Image licensing | **High** | **No licensing documentation found.** Do not display images until rights are confirmed. |
| Supplier image attribution | Unknown | No attribution requirements documented. |
| Storing full supplier payloads indefinitely | Low | `supplier_payload` in `supplier_property_keys` stores raw JSON. This is acceptable — it contains no secrets and is admin-only via RLS. |

### 6.3 Recommended Safe Image-Handling Policy

**Pending written supplier permission:**

1. **Do not populate the `images` column** for DIDA properties. Leave it as an empty array `[]`.
2. **Store the DIDA `imageUrl` in `supplier_payload`** (in `supplier_property_keys`) for reference, but do not surface it in the properties table.
3. **Do not download, resize, or cache DIDA images** locally.
4. **Do not hotlink DIDA images** on customer-facing pages.
5. **When permission is obtained:** Populate `images` with the DIDA image URL, tagged with a source indicator (e.g., `{"url": "...", "source": "dida", "rights_confirmed": true}`). Consider adding a `source` field to each image object in the JSON array to distinguish Hotelbeds, DIDA, and editorial images.
6. **Never overwrite `elvora_images`** during import — that column is for editorial overrides only.

### 6.4 Distinguishing Image Sources (future enhancement)

The current schema cannot distinguish image sources within the `images` JSON array. A proposed (but not yet implemented) approach:
- Structure each image object as `{"url": "...", "source": "hotelbeds|dida|editorial", "rights_status": "confirmed|unconfirmed"}`
- This does not require schema changes (jsonb is flexible) but does require import logic to tag images correctly
- The existing `elvora_images` column already provides a separate editorial override path

---

## 7. DESTINATION COUNTRY VALIDATION STRATEGY

### 7.1 Current State

All 143 destinations have `country_code = NULL`. The `country` text field is populated for all destinations but is not an ISO code.

### 7.2 DIDA areaCode Semantics

Phase 5A results show `areaCode` values like "ID", "JP", "GR", "MA", "AU" — these appear to be ISO 3166-1 alpha-2 country codes. However, this has not been confirmed by official DIDA documentation. The field is named `areaCode`, not `countryCode`, which leaves open the possibility that it could represent a broader region code in some cases.

**Recommendation:** Treat `areaCode` as a likely ISO country code but verify against the destination's expected country before accepting. Do not assume `areaCode` is always an ISO 3166-1 alpha-2 code without official confirmation.

### 7.3 Country Code Population Strategy

| Destination Type | Strategy | Risk |
|---|---|---|
| Clearly identifiable city destinations (e.g., Tokyo, Sydney) | Derive ISO code from `country` text field using a deterministic mapping (Japan→JP, Australia→AU) | Low |
| Islands within one country (e.g., Bali→Indonesia/ID, Santorini→Greece/GR) | Derive from sovereign state | Low |
| Multi-country regions (e.g., Caribbean, Patagonia) | **BLOCKED** — cannot assign a single country code. Admin must split or redefine. | High |
| Ambiguous names (e.g., Charleston, Austin) | Derive from `country` text field + coordinates verification | Medium |
| Territories (e.g., Cayman Islands, Puerto Rico) | Use ISO 3166-1 alpha-2 where assigned (KY, PR). For territories without unique codes, use the sovereign state's code. | Medium |

### 7.4 Validation Rules for Future Imports

1. If the destination has a `country_code`, use it to validate DIDA `areaCode`. Reject if they don't match.
2. If the destination has no `country_code`, derive the expected ISO code from the `country` text field using a curated mapping table. Log a warning that the destination's `country_code` should be populated.
3. If the DIDA `areaCode` does not match the expected country code, reject the hotel as `wrong_country`.
4. If the DIDA `areaCode` is not a recognized ISO 3166-1 alpha-2 code, flag as `needs_review`.
5. Always validate coordinates against the destination's bounding box (when available) in addition to country code.

---

## 8. FUTURE CONTROLLED IMPORT ROLLOUT

### 8.1 Pilot Plan

**Pilot destination:** Bali (dest-bali)  
**Rationale:** 
- Zero existing properties (no duplicate detection needed)
- Phase 5A confirmed 10 DIDA hotels with 100% geographic validation
- Prior testing confirmed "Denpasar Indonesia" returns correct Bali hotels
- High-value destination for Elvora Stay's catalog

**Pilot scope:** 10 hotels (one searchHotels call, size=10)

### 8.2 Pilot Execution Steps

| Step | Action | Safety Check |
|---|---|---|
| 1 | Populate `dida_destination_map` with Bali mapping (destination_id, dida_place, dida_place_type, verified_country_code, bounding box) | Admin approval required |
| 2 | Run a single searchHotels call for "Denpasar Indonesia" | Same as Phase 5A — read-only search |
| 3 | Validate every returned hotel against country code (ID) and bounding box | Reject any out-of-bounds results |
| 4 | Check for duplicates against existing properties (none expected for Bali) | Cross-supplier matching |
| 5 | Insert each hotel into `properties` with is_active=false, property_status='catalog', booking_enabled=false, verification_status='needs_review' | Unpublished by default |
| 6 | Insert corresponding `supplier_property_keys` records | Idempotency tracking |
| 7 | Do NOT populate `images` column | Image rights unconfirmed |
| 8 | Admin reviews imported records in admin panel | Manual QA |
| 9 | Admin activates selected properties (is_active=true) one at a time | Gradual rollout |
| 10 | Verify activated properties appear correctly on customer-facing site | Visual QA |

### 8.3 Idempotency

Re-running the pilot import should:
- Find existing DIDA properties via `supplier_property_keys` (by supplier_name='dida' + supplier_hotel_code)
- Update `last_seen_at` and `supplier_payload` only
- Update structured fields in `properties` only if `editorial_override = false`
- Never create duplicate property rows

### 8.4 Failure Reporting

- Every hotel that fails validation should be logged with the reason (wrong_country, outside_bounds, possible_duplicate, needs_review)
- Failed records should NOT be inserted into `properties` — they should be recorded in `supplier_property_keys` with `verification_status = 'needs_review'` (or a new status field if needed) for admin review
- The import function should return a summary: X accepted, Y rejected (with reasons), Z flagged for review

### 8.5 Rollback

- Delete all properties where `supplier_name = 'dida'` and `destination_id = 'dest-bali'`
- The `supplier_property_keys` CASCADE delete will automatically remove corresponding key records
- No Hotelbeds data is affected
- No bookings are affected (booking_enabled = false)
- No customer-facing changes occurred (is_active = false throughout)

### 8.6 Expansion Criteria

Expand to additional destinations only after the pilot passes:
- All 10 Bali properties imported successfully
- Admin has reviewed and activated at least 5 properties
- No customer complaints about data quality
- Geographic validation caught any wrong-country results
- Image rights clarification received from DIDA/RollingGo (or images remain empty)
- Country codes populated for at least the next batch of destinations

### 8.7 Expansion Order (recommended)

1. Bali (pilot) — 10 hotels
2. Tokyo — 10 hotels, zero existing properties
3. Marrakech — 10 hotels, zero existing properties
4. Santorini — 6 hotels, zero existing properties
5. Sydney — 10 hotels, zero existing properties
6. Then proceed through the 74 "READY" destinations from Phase 4

---

## 9. DATABASE COUNTS — BEFORE AND AFTER

| Table | Before Phase 6 | After Phase 6 | Changed? |
|---|---|---|---|
| destinations | 143 | 143 | No |
| properties | 4,236 | 4,236 | No |
| properties (hotelbeds) | 4,236 | 4,236 | No |
| property_rooms | 180 | 180 | No |
| bookings | 0 | 0 | No |
| supplier_property_keys | 0 | 0 | No |
| dida_destination_map | 0 | 0 | No |

| Hotelbeds Setting | Before | After | Changed? |
|---|---|---|---|
| quota_paused | true | true | No |
| queue_running | false | false | No |

---

## 10. FILES INSPECTED AND FILES CHANGED

### Files Inspected (read-only)

| File | Purpose |
|---|---|
| `docs/phase-5a-dida-search-testing.md` | Phase 5A report — reviewed for evidence completeness |
| `supabase/functions/_shared/dida-mcp.ts` | DIDA MCP adapter — reviewed for security, no-write guarantees |
| `supabase/functions/dida-capability-test/index.ts` | Test function — reviewed in Phase 5A, confirmed unchanged |
| `supabase/config.toml` | Verified verify_jwt = true for dida-capability-test |
| `supabase/migrations/20261020160609_20261020120000_create_dida_supplier_catalog_tables.sql` | Phase 2 migration — reviewed for schema definitions |
| `src/hooks/use-properties.ts` | Frontend property queries — reviewed for is_active filtering |
| `src/lib/stay-search.ts` | Search logic — reviewed for property_status filtering |
| Live database schema for `properties`, `property_rooms`, `supplier_property_keys`, `dida_destination_map` via information_schema queries |
| Live database constraints, indexes, and RLS policies via pg_constraint, pg_indexes, pg_policy queries |

### Files Changed

**No files were changed.** This phase was strictly read-only: database queries, source-code inspection, web searches, and analysis only. No files were created, modified, or deleted (with the exception of this report file).

---

## 11. UNRESOLVED RISKS AND DECISIONS REQUIRING ADMIN APPROVAL

### 11.1 Blocking Decisions (must be resolved before any import)

1. **DIDA data rights are unconfirmed.** No terms of service, API agreement, or data licensing documentation was found for RollingGo/DIDA. All 10 data-rights questions in Section 2.4 must be answered in writing before any DIDA data is displayed commercially. **Admin must contact DIDA/RollingGo directly.**

2. **ISO country codes missing for all 143 destinations.** The `country_code` column is NULL for every destination. The geographic validation algorithm depends on ISO country codes. Admin should populate these before imports begin.

3. **DIDA `areaCode` semantics unconfirmed.** Phase 5A results show values that look like ISO 3166-1 alpha-2 codes, but this has not been confirmed by official documentation. Admin should verify with DIDA.

4. **Image licensing unconfirmed.** DIDA image URLs must not be displayed, downloaded, or transformed until licensing is verified. The `images` column should remain empty for all DIDA imports until rights are confirmed.

5. **Booking capability unverified.** DIDA booking URLs point to rollinggo.ai, not an Elvora booking flow. `booking_enabled` must remain `false` for all DIDA properties until a booking integration is explicitly authorized and built.

### 11.2 Risks

1. **DIDA search results may not be deterministic.** The repeated Bali search returned 10 hotels (first call showed 8 before truncation). Re-imports may return different results. The `supplier_property_keys` table provides idempotency, but new hotels may appear and existing ones may disappear between searches.

2. **No pagination.** DIDA returns max 20 results per call. Large destinations will require multiple search places. This increases API call volume.

3. **HTML descriptions.** DIDA returns HTML-formatted descriptions. These must be sanitized before storage to prevent XSS if ever rendered on the frontend. The `description` column currently stores Hotelbeds descriptions (format unknown — should be checked before DIDA import).

4. **Price volatility.** DIDA prices are search-time only (for specific dates, occupancy, and currency). They should not be stored as permanent property prices. The `price_per_night` column should either be left NULL or clearly marked as indicative.

5. **Cross-supplier duplicates untested.** The five Phase 5A destinations had zero existing properties. Duplicate detection against Hotelbeds properties (for the 12 destinations with existing inventory) has not been tested with real data.

6. **No DIDA API rate limits documented.** Unknown how many calls per minute/hour are allowed. The pilot should use a single call to minimize risk.

### 11.3 Decisions Requiring Admin Approval

1. **Approve the pilot plan** (Section 8) — Bali, 10 hotels, unpublished initial state
2. **Contact DIDA/RollingGo** with the 10 data-rights questions (Section 2.4)
3. **Populate ISO country codes** for the 143 destinations (or at least the pilot destination)
4. **Confirm the DIDA property ID prefix** ("dida-{hotelId}") is acceptable
5. **Confirm the slug format** ("dida-{hotelId}-{normalized-name}") is acceptable
6. **Decide whether to populate `price_per_night`** with search-time prices or leave NULL
7. **Decide whether DIDA descriptions (HTML) should be stored as-is or stripped to plain text**
8. **Approve the cross-supplier duplicate detection thresholds** (Section 4.2)
9. **Decide whether to proceed with the import after data rights are confirmed**

---

**Phase 6 is complete. Stopping here. No hotels, rooms, images, rates, or supplier mappings have been imported. No database records were created, modified, or deleted. No supplier API calls were made. No code changes were made. No Edge Functions were deployed.**
