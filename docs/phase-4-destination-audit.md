# ELVORA STAY — PHASE 4: READ-ONLY DESTINATION AUDIT AND DIDA MAPPING PLAN

**Date:** 2026-10-20  
**Phase:** 4 (Read-only audit, no writes, no supplier calls)  
**Status:** Complete

---

## 1. LIVE DESTINATION AND INVENTORY AUDIT

### 1.1 Baseline Counts (verified live)

| Metric | Value |
|---|---|
| Total destinations | 143 |
| Active destinations | 143 |
| Published destinations | 143 |
| Draft destinations | 0 |
| Total properties | 4,236 |
| Hotelbeds properties | 4,236 |
| Active properties | 4,236 |
| Property rooms | 180 |
| Bookings | 0 |
| supplier_property_keys rows | 0 |
| dida_destination_map rows | 0 |
| Hotelbeds quota_paused | true |
| Hotelbeds queue_running | false |

### 1.2 Inventory Category Definitions

| Category | Definition | Count |
|---|---|---|
| A | Destinations with 0 total properties | 131 |
| B | Destinations with properties but 0 active properties | 0 |
| C | Destinations with active properties but fewer than 50 | 0 |
| D | Destinations with 50 or more active properties | 12 |

**Thresholds:** Category C threshold = 1–49 active properties. Category D threshold = 50+ active properties. These thresholds are chosen because DIDA searchHotels returns a maximum of 20 results per call, and 50 properties represents a reasonable baseline inventory that would not urgently need supplemental DIDA supply.

### 1.3 Category D — Destinations with Existing Inventory (12 destinations)

| ID | Name | Country | Active Properties |
|---|---|---|---|
| dest-abu-dhabi | Abu Dhabi | United Arab Emirates | 173 |
| dest-algarve | Algarve | Portugal | 500 |
| dest-amalfi-coast | Amalfi Coast | Italy | 500 |
| dest-aruba | Aruba | Aruba | 83 |
| dest-athens | Athens | Greece | 300 |
| dest-bangkok | Bangkok | Thailand | 100 |
| dest-barcelona | Barcelona | Spain | 100 |
| dest-denver | Denver | United States | 380 |
| dest-dubai | Dubai | United Arab Emirates | 100 |
| dest-london | London | United Kingdom | 100 |
| dest-paris | Paris | France | 1,800 |
| dest-rome | Rome | Italy | 100 |

### 1.4 Category A — Destinations with Zero Properties (131 destinations)

All 131 destinations listed below have 0 total properties, 0 active properties, 0 Hotelbeds properties, and 0 DIDA properties. Every destination has coordinates (latitude and longitude are non-null for all 143).

| # | ID | Name | Country | Latitude | Longitude |
|---|---|---|---|---|---|
| 1 | dest-antigua | Antigua | Antigua and Barbuda | 17.0608 | -61.7964 |
| 2 | dest-aspen | Aspen | United States | 39.1911 | -106.8175 |
| 3 | dest-auckland | Auckland | New Zealand | -36.8485 | 174.7633 |
| 4 | dest-austin | Austin | United States | 30.2672 | -97.7431 |
| 5 | dest-austrian-alps | Austrian Alps | Austria | 47.2537 | 13.041 |
| 6 | dest-bahamas | Bahamas | Bahamas | 25.048 | -77.355 |
| 7 | dest-bali | Bali | Indonesia | -8.3405 | 115.092 |
| 8 | dest-barbados | Barbados | Barbados | 13.1939 | -59.5432 |
| 9 | dest-beverly-hills | Beverly Hills | United States | 34.0736 | -118.4004 |
| 10 | dest-big-island | Big Island | United States | 19.8968 | -155.5828 |
| 11 | dest-big-sur | Big Sur | United States | 36.2704 | -121.8081 |
| 12 | dest-bora-bora | Bora Bora | French Polynesia | -16.5004 | -151.7415 |
| 13 | dest-botswana | Botswana | Botswana | -22.3285 | 24.6849 |
| 14 | dest-bvi | British Virgin Islands | British Virgin Islands | 18.4207 | -64.6391 |
| 15 | dest-buenos-aires | Buenos Aires | Argentina | -34.6037 | -58.3816 |
| 16 | dest-cabo-san-lucas | Cabo San Lucas | Mexico | 22.8909 | -109.9124 |
| 17 | dest-cancun | Cancun | Mexico | 21.1619 | -86.8515 |
| 18 | dest-cannes | Cannes | France | 43.5528 | 7.0174 |
| 19 | dest-cape-town | Cape Town | South Africa | -33.9249 | 18.4241 |
| 20 | dest-capri | Capri | Italy | 40.5498 | 14.2437 |
| 21 | dest-caribbean | Caribbean | West Indies | 16.1696 | -62.5824 |
| 22 | dest-cartagena | Cartagena | Colombia | 10.391 | -75.4794 |
| 23 | dest-cayman-islands | Cayman Islands | Cayman Islands | 19.3133 | -81.2546 |
| 24 | dest-charleston | Charleston | United States | 32.7765 | -79.9311 |
| 25 | dest-costa-rica | Costa Rica | Costa Rica | 9.7489 | -83.7534 |
| 26 | dest-curacao | Curaçao | Curaçao | 12.1696 | -68.99 |
| 27 | dest-dallas | Dallas | United States | 32.7767 | -96.797 |
| 28 | dest-dom-rep | Dominican Republic | Dominican Republic | 18.7357 | -70.1627 |
| 29 | dest-dubrovnik | Dubrovnik | Croatia | 42.6507 | 18.0944 |
| 30 | dest-fiji | Fiji | Fiji | -16.5 | 179 |
| 31 | dest-florence | Florence | Italy | 43.7696 | 11.2558 |
| 32 | dest-florida-keys | Florida Keys | United States | 24.7 | -81 |
| 33 | dest-french-polynesia | French Polynesia | French Polynesia | -17.6797 | -149.4068 |
| 34 | dest-french-riviera | French Riviera | France | 43.2578 | 6.6394 |
| 35 | dest-gold-coast | Gold Coast | Australia | -28.0167 | 153.4 |
| 36 | dest-great-barrier-reef | Great Barrier Reef | Australia | -18.2871 | 147.6992 |
| 37 | dest-greek-islands | Greek Islands | Greece | 36 | 25 |
| 38 | dest-grenada | Grenada | Grenada | 12.1165 | -61.679 |
| 39 | dest-hawaii | Hawaii | United States | 19.8968 | -155.5828 |
| 40 | dest-hong-kong | Hong Kong | Hong Kong | 22.3193 | 114.1694 |
| 41 | dest-honolulu | Honolulu | United States | 21.3069 | -157.8583 |
| 42 | dest-houston | Houston | United States | 29.7604 | -95.3698 |
| 43 | dest-ibiza | Ibiza | Spain | 38.91 | 1.4326 |
| 44 | dest-jackson-hole | Jackson Hole | United States | 43.4799 | -110.7622 |
| 45 | dest-jamaica | Jamaica | Jamaica | 18.1096 | -77.2975 |
| 46 | dest-kauai | Kauai | United States | 22.1223 | -159.5291 |
| 47 | dest-kenya | Kenya | Kenya | -0.0236 | 37.9062 |
| 48 | dest-key-west | Key West | United States | 24.5551 | -81.78 |
| 49 | dest-koh-samui | Koh Samui | Thailand | 9.4378 | 100.0117 |
| 50 | dest-kyoto | Kyoto | Japan | 35.0116 | 135.7681 |
| 51 | dest-laguna-beach | Laguna Beach | United States | 33.5427 | -117.7854 |
| 52 | dest-lake-como | Lake Como | Italy | 46.016 | 9.2572 |
| 53 | dest-lake-tahoe | Lake Tahoe | United States | 39.0968 | -120.0324 |
| 54 | dest-las-vegas | Las Vegas | United States | 36.1699 | -115.1398 |
| 55 | dest-lisbon | Lisbon | Portugal | 38.7223 | -9.1393 |
| 56 | dest-los-angeles | Los Angeles | United States | 34.0522 | -118.2437 |
| 57 | dest-los-cabos | Los Cabos | Mexico | 22.8905 | -109.9167 |
| 58 | dest-madeira | Madeira | Portugal | 32.7607 | -16.9595 |
| 59 | dest-madrid | Madrid | Spain | 40.4168 | -3.7038 |
| 60 | dest-maldives | Maldives | Maldives | 3.2028 | 73.2207 |
| 61 | dest-malibu | Malibu | United States | 34.0259 | -118.7798 |
| 62 | dest-mallorca | Mallorca | Spain | 39.6953 | 3.0176 |
| 63 | dest-marrakech | Marrakech | Morocco | 31.6295 | -7.9811 |
| 64 | dest-marthas-vineyard | Martha's Vineyard | United States | 41.3866 | -70.6198 |
| 65 | dest-maui | Maui | United States | 20.7984 | -156.3319 |
| 66 | dest-mauritius | Mauritius | Mauritius | -20.3484 | 57.5522 |
| 67 | dest-medellin | Medellin | Colombia | 6.2442 | -75.5812 |
| 68 | dest-melbourne | Melbourne | Australia | -37.8136 | 144.9631 |
| 69 | dest-mexico-city | Mexico City | Mexico | 19.4326 | -99.1332 |
| 70 | dest-miami | Miami | United States | 25.7617 | -80.1918 |
| 71 | dest-miami-beach | Miami Beach | United States | 25.7907 | -80.13 |
| 72 | dest-milan | Milan | Italy | 45.4642 | 9.19 |
| 73 | dest-moab | Moab | United States | 38.5733 | -109.5498 |
| 74 | dest-monaco | Monaco | Monaco | 43.7384 | 7.4246 |
| 75 | dest-montenegro | Montenegro | Montenegro | 42.7087 | 19.3744 |
| 76 | dest-mykonos | Mykonos | Greece | 37.4467 | 25.3289 |
| 77 | dest-namibia | Namibia | Namibia | -22.9576 | 18.4904 |
| 78 | dest-nantucket | Nantucket | United States | 41.2835 | -70.0995 |
| 79 | dest-napa-valley | Napa Valley | United States | 38.5025 | -122.2654 |
| 80 | dest-new-orleans | New Orleans | United States | 29.9511 | -90.0715 |
| 81 | dest-new-york | New York City | United States | 40.7128 | -74.006 |
| 82 | dest-niseko | Niseko | Japan | 42.855 | 140.684 |
| 83 | dest-oahu | Oahu | United States | 21.4389 | -158.0001 |
| 84 | dest-oman | Oman | Oman | 23.588 | 58.3829 |
| 85 | dest-orlando | Orlando | United States | 28.5383 | -81.3792 |
| 86 | dest-palm-springs | Palm Springs | United States | 33.8303 | -116.5453 |
| 87 | dest-panama | Panama | Panama | 8.538 | -80.7821 |
| 88 | dest-park-city | Park City | United States | 40.6461 | -111.498 |
| 89 | dest-patagonia | Patagonia | Chile/Argentina | -49.3326 | -73.0273 |
| 90 | dest-phuket | Phuket | Thailand | 7.8804 | 98.3923 |
| 91 | dest-puerto-rico | Puerto Rico | Puerto Rico | 18.2208 | -66.5901 |
| 92 | dest-puerto-vallarta | Puerto Vallarta | Mexico | 20.6534 | -105.2253 |
| 93 | dest-punta-mita | Punta Mita | Mexico | 20.7781 | -105.5456 |
| 94 | dest-qatar | Qatar | Qatar | 25.3548 | 51.1839 |
| 95 | dest-queenstown | Queenstown | New Zealand | -45.0312 | 168.6626 |
| 96 | dest-rio | Rio de Janeiro | Brazil | -22.9068 | -43.1729 |
| 97 | dest-riviera-maya | Riviera Maya | Mexico | 20.2084 | -87.465 |
| 98 | dest-rwanda | Rwanda | Rwanda | -1.9403 | 29.8739 |
| 99 | dest-saint-tropez | Saint-Tropez | France | 43.2618 | 6.6387 |
| 100 | dest-san-diego | San Diego | United States | 32.7157 | -117.1611 |
| 101 | dest-santa-barbara | Santa Barbara | United States | 34.4208 | -119.6982 |
| 102 | dest-santorini | Santorini | Greece | 36.3932 | 25.4615 |
| 103 | dest-sao-paulo | Sao Paulo | Brazil | -23.5505 | -46.6333 |
| 104 | dest-sardinia | Sardinia | Italy | 40.1209 | 9.0129 |
| 105 | dest-saudi-arabia | Saudi Arabia | Saudi Arabia | 23.8859 | 45.0792 |
| 106 | dest-savannah | Savannah | United States | 32.0809 | -81.0912 |
| 107 | dest-scottsdale | Scottsdale | United States | 33.4942 | -111.9261 |
| 108 | dest-sedona | Sedona | United States | 34.8697 | -111.761 |
| 109 | dest-serengeti | Serengeti | Tanzania | -2.3333 | 34.8333 |
| 110 | dest-seychelles | Seychelles | Seychelles | -4.6796 | 55.492 |
| 111 | dest-sicily | Sicily | Italy | 37.6136 | 14.25 |
| 112 | dest-singapore | Singapore | Singapore | 1.3521 | 103.8198 |
| 113 | dest-sonoma | Sonoma | United States | 38.2919 | -122.4586 |
| 114 | dest-split | Split | Croatia | 43.5081 | 16.4402 |
| 115 | dest-st-barts | St. Barts | France | 17.9008 | -62.8485 |
| 116 | dest-st-lucia | St. Lucia | St. Lucia | 13.9094 | -60.9789 |
| 117 | dest-st-moritz | St. Moritz | Switzerland | 46.4983 | 9.8395 |
| 118 | dest-swiss-alps | Swiss Alps | Switzerland | 46.0966 | 7.2286 |
| 119 | dest-sydney | Sydney | Australia | -33.8688 | 151.2093 |
| 120 | dest-telluride | Telluride | United States | 37.9375 | -107.8123 |
| 121 | dest-hamptons | The Hamptons | United States | 40.9634 | -72.239 |
| 122 | dest-tokyo | Tokyo | Japan | 35.6762 | 139.6503 |
| 123 | dest-tulum | Tulum | Mexico | 20.2114 | -87.4654 |
| 124 | dest-turks-caicos | Turks and Caicos | Turks and Caicos Islands | 21.694 | -71.7979 |
| 125 | dest-tuscany | Tuscany | Italy | 43.416 | 11 |
| 126 | dest-usvi | U.S. Virgin Islands | U.S. Virgin Islands | 18.3358 | -64.8963 |
| 127 | dest-vail | Vail | United States | 39.6403 | -106.3742 |
| 128 | dest-venice | Venice | Italy | 45.4408 | 12.3155 |
| 129 | dest-zanzibar | Zanzibar | Tanzania | -6.1659 | 39.2026 |
| 130 | dest-zermatt | Zermatt | Switzerland | 46.0207 | 7.7491 |
| 131 | dest-zion | Zion | United States | 37.2982 | -113.0263 |

---

## 2. GEOGRAPHIC DATA QUALITY FINDINGS

### 2.1 Missing Coordinates

**0 destinations** have missing coordinates. All 143 destinations have non-null latitude and longitude values.

### 2.2 Missing ISO Country Codes

**All 143 destinations** (100%) have `country_code = NULL`. Every destination has a `country` text field (e.g., "United States", "Italy", "France"), but no ISO 3166-1 alpha-2 code. This is a significant gap for geographic validation — DIDA hotel results will need to be checked against an expected ISO country code, and the current database cannot provide one without deriving it from the country name.

**Recommendation:** Admin should populate `country_code` for all destinations before DIDA hotel imports begin. The country name to ISO code mapping is deterministic for most entries but requires manual verification for edge cases like "West Indies" (dest-caribbean), "Chile/Argentina" (dest-patagonia), and territories like "French Polynesia", "Cayman Islands", etc.

### 2.3 Duplicate or Conflicting Destination Names

**0 duplicate names** found. All 143 destination names are unique.

**0 duplicate slugs** found. All slugs are unique.

### 2.4 Ambiguous Destination Names (require admin review)

| ID | Name | Country | Issue |
|---|---|---|---|
| dest-antigua | Antigua | Antigua and Barbuda | "Antigua" alone could resolve to Antigua Guatemala (Guatemala) in DIDA search. Must use "Antigua Antigua and Barbuda" or "St John's Antigua and Barbuda" to disambiguate. |
| dest-austin | Austin | United States | Austin, Texas is the likely intent, but Austin, Minnesota and Austin, British Columbia exist. Must use "Austin Texas" or "Austin United States". |
| dest-charleston | Charleston | United States | Charleston, South Carolina vs Charleston, West Virginia. Intent is likely SC (historic city). Must use "Charleston South Carolina". |
| dest-dallas | Dallas | United States | Dallas, Texas is the likely intent, but Dallas, Georgia and Dallas, Oregon exist. Must use "Dallas Texas". |
| dest-miami | Miami | United States | Miami, Florida vs Miami, Oklahoma. Must use "Miami Florida". |
| dest-patagonia | Patagonia | Chile/Argentina | Spans two countries. Country field "Chile/Argentina" is not a valid ISO country code. Requires admin decision on which country code to validate against, or whether to split into two destinations. |
| dest-caribbean | Caribbean | West Indies | "West Indies" is not an ISO country. The Caribbean spans dozens of countries. DIDA search for "Caribbean" will likely return ambiguous results. Requires admin decision on scope. |
| dest-big-island | Big Island | United States | "Big Island" is a colloquial name for Hawaii Island. DIDA may not recognize "Big Island" — may need "Hawaii Island United States" or "Hilo United States". |
| dest-hawaii | Hawaii | United States | Overlaps with dest-big-island (identical coordinates). "Hawaii" could resolve to the entire state or just the Big Island. Requires admin decision on scope. |

### 2.5 Overlapping/Related Destination Clusters

These clusters contain destinations that are geographically close or overlapping. DIDA searches for one may return hotels that belong to another. This requires careful bounding-box validation and possibly search-place coordination.

**Hawaii cluster (6 destinations, all 0 properties):**
- dest-hawaii, dest-big-island — identical coordinates (19.8968, -155.5828)
- dest-oahu, dest-honolulu — nearby (Oahu: 21.4389, -158.0001; Honolulu: 21.3069, -157.8583)
- dest-maui — separate island (20.7984, -156.3319)
- dest-kauai — separate island (22.1223, -159.5291)

**Mexico Cabo cluster (2 destinations, overlapping coords):**
- dest-cabo-san-lucas (22.8909, -109.9124)
- dest-los-cabos (22.8905, -109.9167) — Los Cabos is the municipality containing Cabo San Lucas

**Mexico Yucatan cluster (3 destinations):**
- dest-cancun (21.1619, -86.8515)
- dest-riviera-maya (20.2084, -87.465) — broad region
- dest-tulum (20.2114, -87.4654) — nearly identical coords to Riviera Maya

**Miami cluster (2 destinations):**
- dest-miami (25.7617, -80.1918)
- dest-miami-beach (25.7907, -80.13) — adjacent city

**French Riviera cluster (4 destinations):**
- dest-french-riviera (43.2578, 6.6394) — broad region
- dest-cannes (43.5528, 7.0174)
- dest-saint-tropez (43.2618, 6.6387)
- dest-monaco (43.7384, 7.4246) — separate country

**French Polynesia cluster (2 destinations):**
- dest-french-polynesia (-17.6797, -149.4068) — broad territory
- dest-bora-bora (-16.5004, -151.7415) — specific island within French Polynesia

**Greek cluster (4 destinations):**
- dest-greek-islands (36, 25) — extremely broad, center of the Aegean
- dest-mykonos (37.4467, 25.3289)
- dest-santorini (36.3932, 25.4615)
- dest-athens (300 properties already)

**Italy broad regions (8 destinations with 0 properties):**
- dest-tuscany, dest-sicily, dest-sardinia — entire regions
- dest-florence, dest-milan, dest-venice, dest-capri, dest-lake-como — cities/areas

**Caribbean islands cluster (16 destinations, all 0 properties except Aruba):**
- dest-caribbean — pan-regional
- 15 individual island nations/territories

**Africa safari cluster (7 destinations, all 0 properties):**
- dest-botswana, dest-kenya, dest-namibia, dest-rwanda — entire countries
- dest-serengeti, dest-zanzibar — regions within Tanzania
- dest-cape-town — city in South Africa

**Swiss/Austrian Alps cluster (4 destinations, all 0 properties):**
- dest-swiss-alps, dest-austrian-alps — broad mountain regions
- dest-zermatt, dest-st-moritz — specific towns

**US California cluster (10 destinations, all 0 properties):**
- dest-los-angeles, dest-beverly-hills, dest-malibu — overlapping LA area
- dest-san-diego, dest-santa-barbara, dest-laguna-beach, dest-big-sur, dest-palm-springs
- dest-napa-valley, dest-sonoma — overlapping wine country

---

## 3. PROPOSED DIDA DESTINATION-MAPPING STRATEGY

### 3.1 dida_destination_map Schema (as designed in Phase 2)

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| destination_id | text | NO | — | FK to destinations(id) ON DELETE CASCADE |
| dida_place | text | NO | — | The "place" string to send to DIDA searchHotels |
| dida_place_type | text | NO | — | The "placeType" value (city, airport, etc.) |
| dida_destination_id | text | YES | NULL | DIDA's internal destination ID if returned |
| verified_country_code | text | YES | NULL | ISO 3166-1 alpha-2 country code for validation |
| verified_lat_min | double | YES | NULL | Bounding box south edge |
| verified_lat_max | double | YES | NULL | Bounding box north edge |
| verified_lon_min | double | YES | NULL | Bounding box west edge |
| verified_lon_max | double | YES | NULL | Bounding box east edge |
| verification_status | text | NO | 'unverified' | Status of this mapping |
| last_searched_at | timestamptz | YES | NULL | When last DIDA search was performed |
| last_result_count | integer | YES | NULL | Hotels returned in last search |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Unique constraint:** (destination_id, dida_place, dida_place_type) — prevents duplicate mappings.  
**Multiple mappings per destination allowed** — one Elvora destination can map to multiple DIDA search places.

### 3.2 Proposed Mapping Plan for Category A Destinations

Each mapping below specifies the primary DIDA search place and placeType. Mappings are classified as:
- **READY** — sufficient data for a controlled test in a later authorized phase
- **REVIEW** — requires admin approval or additional geographic data before testing
- **BLOCKED** — poor candidate until underlying ambiguity is resolved

#### 3.2.1 READY — City-Level Destinations with Unambiguous Names (74 destinations)

These are cities or specific towns with coordinates and country data sufficient for DIDA search. The proposed DIDA place follows the pattern "CityName Country" per DIDA's documented place format.

| # | Elvora ID | Name | Country | DIDA Place | placeType | Additional Searches | Ready? |
|---|---|---|---|---|---|---|---|
| 1 | dest-auckland | Auckland | New Zealand | Auckland New Zealand | city | — | READY |
| 2 | dest-austin | Austin | United States | Austin Texas | city | — | READY |
| 3 | dest-buenos-aires | Buenos Aires | Argentina | Buenos Aires Argentina | city | — | READY |
| 4 | dest-cabo-san-lucas | Cabo San Lucas | Mexico | Cabo San Lucas Mexico | city | — | READY |
| 5 | dest-cancun | Cancun | Mexico | Cancun Mexico | city | — | READY |
| 6 | dest-cannes | Cannes | France | Cannes France | city | — | READY |
| 7 | dest-cape-town | Cape Town | South Africa | Cape Town South Africa | city | — | READY |
| 8 | dest-cartagena | Cartagena | Colombia | Cartagena Colombia | city | — | READY |
| 9 | dest-charleston | Charleston | United States | Charleston South Carolina | city | — | READY |
| 10 | dest-dallas | Dallas | United States | Dallas Texas | city | — | READY |
| 11 | dest-dubrovnik | Dubrovnik | Croatia | Dubrovnik Croatia | city | — | READY |
| 12 | dest-florence | Florence | Italy | Florence Italy | city | — | READY |
| 13 | dest-hong-kong | Hong Kong | Hong Kong | Hong Kong | city | — | READY |
| 14 | dest-houston | Houston | United States | Houston Texas | city | — | READY |
| 15 | dest-kyoto | Kyoto | Japan | Kyoto Japan | city | — | READY |
| 16 | dest-lisbon | Lisbon | Portugal | Lisbon Portugal | city | — | READY |
| 17 | dest-las-vegas | Las Vegas | United States | Las Vegas Nevada | city | — | READY |
| 18 | dest-los-angeles | Los Angeles | United States | Los Angeles California | city | Beverly Hills California, Malibu California | READY |
| 19 | dest-madrid | Madrid | Spain | Madrid Spain | city | — | READY |
| 20 | dest-marrakech | Marrakech | Morocco | Marrakech Morocco | city | — | READY |
| 21 | dest-medellin | Medellin | Colombia | Medellin Colombia | city | — | READY |
| 22 | dest-melbourne | Melbourne | Australia | Melbourne Australia | city | — | READY |
| 23 | dest-mexico-city | Mexico City | Mexico | Mexico City Mexico | city | — | READY |
| 24 | dest-miami | Miami | United States | Miami Florida | city | — | READY |
| 25 | dest-milan | Milan | Italy | Milan Italy | city | — | READY |
| 26 | dest-monaco | Monaco | Monaco | Monaco | city | — | READY |
| 27 | dest-new-orleans | New Orleans | United States | New Orleans Louisiana | city | — | READY |
| 28 | dest-new-york | New York City | United States | New York United States | city | — | READY |
| 29 | dest-orlando | Orlando | United States | Orlando Florida | city | — | READY |
| 30 | dest-phuket | Phuket | Thailand | Phuket Thailand | city | — | READY |
| 31 | dest-puerto-vallarta | Puerto Vallarta | Mexico | Puerto Vallarta Mexico | city | — | READY |
| 32 | dest-rio | Rio de Janeiro | Brazil | Rio de Janeiro Brazil | city | — | READY |
| 33 | dest-sao-paulo | Sao Paulo | Brazil | Sao Paulo Brazil | city | — | READY |
| 34 | dest-san-diego | San Diego | United States | San Diego California | city | — | READY |
| 35 | dest-santa-barbara | Santa Barbara | United States | Santa Barbara California | city | — | READY |
| 36 | dest-savannah | Savannah | United States | Savannah Georgia | city | — | READY |
| 37 | dest-scottsdale | Scottsdale | United States | Scottsdale Arizona | city | — | READY |
| 38 | dest-sedona | Sedona | United States | Sedona Arizona | city | — | READY |
| 39 | dest-singapore | Singapore | Singapore | Singapore | city | — | READY |
| 40 | dest-split | Split | Croatia | Split Croatia | city | — | READY |
| 41 | dest-tokyo | Tokyo | Japan | Tokyo Japan | city | — | READY |
| 42 | dest-venice | Venice | Italy | Venice Italy | city | — | READY |
| 43 | dest-sydney | Sydney | Australia | Sydney Australia | city | — | READY |
| 44 | dest-koh-samui | Koh Samui | Thailand | Koh Samui Thailand | city | — | READY |
| 45 | dest-ibiza | Ibiza | Spain | Ibiza Spain | city | — | READY |
| 46 | dest-mallorca | Mallorca | Spain | Mallorca Spain | city | Palma de Mallorca Spain | READY |
| 47 | dest-mykonos | Mykonos | Greece | Mykonos Greece | city | — | READY |
| 48 | dest-santorini | Santorini | Greece | Santorini Greece | city | — | READY |
| 49 | dest-capri | Capri | Italy | Capri Italy | city | — | READY |
| 50 | dest-lake-como | Lake Como | Italy | Como Italy | city | — | READY |
| 51 | dest-beverly-hills | Beverly Hills | United States | Beverly Hills California | city | — | READY |
| 52 | dest-malibu | Malibu | United States | Malibu California | city | — | READY |
| 53 | dest-laguna-beach | Laguna Beach | United States | Laguna Beach California | city | — | READY |
| 54 | dest-palm-springs | Palm Springs | United States | Palm Springs California | city | — | READY |
| 55 | dest-napa-valley | Napa Valley | United States | Napa California | city | — | READY |
| 56 | dest-sonoma | Sonoma | United States | Sonoma California | city | — | READY |
| 57 | dest-aspen | Aspen | United States | Aspen Colorado | city | — | READY |
| 58 | dest-vail | Vail | United States | Vail Colorado | city | — | READY |
| 59 | dest-telluride | Telluride | United States | Telluride Colorado | city | — | READY |
| 60 | dest-park-city | Park City | United States | Park City Utah | city | — | READY |
| 61 | dest-jackson-hole | Jackson Hole | United States | Jackson Wyoming | city | — | READY |
| 62 | dest-lake-tahoe | Lake Tahoe | United States | Lake Tahoe California | city | South Lake Tahoe California | READY |
| 63 | dest-key-west | Key West | United States | Key West Florida | city | — | READY |
| 64 | dest-nantucket | Nantucket | United States | Nantucket Massachusetts | city | — | READY |
| 65 | dest-marthas-vineyard | Martha's Vineyard | United States | Martha's Vineyard Massachusetts | city | — | READY |
| 66 | dest-hamptons | The Hamptons | United States | The Hamptons New York | city | — | READY |
| 67 | dest-zermatt | Zermatt | Switzerland | Zermatt Switzerland | city | — | READY |
| 68 | dest-st-moritz | St. Moritz | Switzerland | St. Moritz Switzerland | city | — | READY |
| 69 | dest-niseko | Niseko | Japan | Niseko Japan | city | — | READY |
| 70 | dest-zion | Zion | United States | Zion National Park Utah | point_of_interest | — | READY |
| 71 | dest-moab | Moab | United States | Moab Utah | city | — | READY |
| 72 | dest-big-sur | Big Sur | United States | Big Sur California | point_of_interest | — | READY |
| 73 | dest-honolulu | Honolulu | United States | Honolulu Hawaii | city | — | READY |
| 74 | dest-madeira | Madeira | Portugal | Funchal Portugal | city | — | READY |

#### 3.2.2 REVIEW — Broad Regions/Islands Requiring Multiple Search Locations (42 destinations)

These destinations are countries, large islands, or broad regions. A single DIDA search place is insufficient. They require multiple search locations and admin-approved bounding boxes.

| # | Elvora ID | Name | Country | Primary DIDA Place | placeType | Additional Searches Needed | Status |
|---|---|---|---|---|---|---|---|
| 1 | dest-bali | Bali | Indonesia | Denpasar Indonesia | city | Ubud Indonesia, Seminyak Indonesia, Canggu Indonesia | REVIEW |
| 2 | dest-bahamas | Bahamas | Bahamas | Nassau Bahamas | city | Paradise Island Bahamas, Freeport Bahamas | REVIEW |
| 3 | dest-barbados | Barbados | Barbuda | Bridgetown Barbados | city | — | REVIEW |
| 4 | dest-bora-bora | Bora Bora | French Polynesia | Bora Bora French Polynesia | city | — | REVIEW |
| 5 | dest-botswana | Botswana | Botswana | Maun Botswana | city | Gaborone Botswana, Chobe Botswana | REVIEW |
| 6 | dest-bvi | British Virgin Islands | British Virgin Islands | Tortola BVI | city | Virgin Gorda BVI | REVIEW |
| 7 | dest-caribbean | Caribbean | West Indies | — | — | REQUIRES ADMIN DECISION: too broad, no single country code | BLOCKED |
| 8 | dest-cayman-islands | Cayman Islands | Cayman Islands | George Town Cayman Islands | city | — | REVIEW |
| 9 | dest-costa-rica | Costa Rica | Costa Rica | San Jose Costa Rica | city | Liberia Costa Rica, Tamarindo Costa Rica | REVIEW |
| 10 | dest-curacao | Curaçao | Curaçao | Willemstad Curaçao | city | — | REVIEW |
| 11 | dest-dom-rep | Dominican Republic | Dominican Republic | Punta Cana Dominican Republic | city | Santo Domingo Dominican Republic | REVIEW |
| 12 | dest-fiji | Fiji | Fiji | Nadi Fiji | city | Denarau Fiji, Suva Fiji | REVIEW |
| 13 | dest-florida-keys | Florida Keys | United States | Key Largo Florida | city | Marathon Florida | REVIEW |
| 14 | dest-french-polynesia | French Polynesia | French Polynesia | Papeete French Polynesia | city | Bora Bora French Polynesia, Moorea French Polynesia | REVIEW |
| 15 | dest-french-riviera | French Riviera | France | Nice France | city | Cannes France, Saint-Tropez France, Monaco | REVIEW |
| 16 | dest-gold-coast | Gold Coast | Australia | Gold Coast Australia | city | — | REVIEW |
| 17 | dest-great-barrier-reef | Great Barrier Reef | Australia | Cairns Australia | city | Port Douglas Australia, Whitsundays Australia | REVIEW |
| 18 | dest-greek-islands | Greek Islands | Greece | — | — | REQUIRES ADMIN DECISION: too broad, needs island-by-island approach | BLOCKED |
| 19 | dest-grenada | Grenada | Grenada | St George's Grenada | city | — | REVIEW |
| 20 | dest-hawaii | Hawaii | United States | Honolulu Hawaii | city | REVIEW: overlaps with dest-big-island, dest-oahu, dest-maui, dest-kauai | REVIEW |
| 21 | dest-jamaica | Jamaica | Jamaica | Montego Bay Jamaica | city | Kingston Jamaica, Negril Jamaica, Ocho Rios Jamaica | REVIEW |
| 22 | dest-kenya | Kenya | Kenya | Nairobi Kenya | city | Maasai Mara Kenya, Mombasa Kenya | REVIEW |
| 23 | dest-maldives | Maldives | Maldives | Male Maldives | city | REVIEW: hotels spread across many atolls, bounding box very large | REVIEW |
| 24 | dest-mauritius | Mauritius | Mauritius | Port Louis Mauritius | city | — | REVIEW |
| 25 | dest-montenegro | Montenegro | Montenegro | Kotor Montenegro | city | Budva Montenegro, Tivat Montenegro | REVIEW |
| 26 | dest-namibia | Namibia | Namibia | Windhoek Namibia | city | Sossusvlei Namibia | REVIEW |
| 27 | dest-oman | Oman | Oman | Muscat Oman | city | Salalah Oman | REVIEW |
| 28 | dest-panama | Panama | Panama | Panama City Panama | city | — | REVIEW |
| 29 | dest-patagonia | Patagonia | Chile/Argentina | — | — | REQUIRES ADMIN DECISION: spans two countries, no valid single country code | BLOCKED |
| 30 | dest-puerto-rico | Puerto Rico | Puerto Rico | San Juan Puerto Rico | city | — | REVIEW |
| 31 | dest-punta-mita | Punta Mita | Mexico | Punta Mita Mexico | city | — | REVIEW |
| 32 | dest-qatar | Qatar | Qatar | Doha Qatar | city | — | REVIEW |
| 33 | dest-queenstown | Queenstown | New Zealand | Queenstown New Zealand | city | — | REVIEW |
| 34 | dest-riviera-maya | Riviera Maya | Mexico | Playa del Carmen Mexico | city | Tulum Mexico | REVIEW |
| 35 | dest-rwanda | Rwanda | Rwanda | Kigali Rwanda | city | — | REVIEW |
| 36 | dest-saint-tropez | Saint-Tropez | France | Saint-Tropez France | city | — | REVIEW |
| 37 | dest-saudi-arabia | Saudi Arabia | Saudi Arabia | Riyadh Saudi Arabia | city | Jeddah Saudi Arabia, Mecca Saudi Arabia | REVIEW |
| 38 | dest-serengeti | Serengeti | Tanzania | Serengeti Tanzania | point_of_interest | — | REVIEW |
| 39 | dest-seychelles | Seychelles | Seychelles | Mahe Seychelles | city | Praslin Seychelles | REVIEW |
| 40 | dest-sicily | Sicily | Italy | Palermo Italy | city | Catania Italy, Taormina Italy | REVIEW |
| 41 | dest-sardinia | Sardinia | Italy | Cagliari Italy | city | Olbia Italy, Alghero Italy | REVIEW |
| 42 | dest-tuscany | Tuscany | Italy | Florence Italy | city | Siena Italy, Pisa Italy, Lucca Italy | REVIEW |
| 43 | dest-tulum | Tulum | Mexico | Tulum Mexico | city | — | REVIEW |
| 44 | dest-turks-caicos | Turks and Caicos | Turks and Caicos Islands | Providenciales Turks and Caicos | city | — | REVIEW |
| 45 | dest-usvi | U.S. Virgin Islands | U.S. Virgin Islands | Charlotte Amalie USVI | city | St. John USVI | REVIEW |
| 46 | dest-antigua | Antigua | Antigua and Barbuda | St John's Antigua and Barbuda | city | — | REVIEW |
| 47 | dest-los-cabos | Los Cabos | Mexico | Los Cabos Mexico | city | REVIEW: overlaps with dest-cabo-san-lucas | REVIEW |
| 48 | dest-miami-beach | Miami Beach | United States | Miami Beach Florida | city | REVIEW: overlaps with dest-miami | REVIEW |
| 49 | dest-st-barts | St. Barts | France | Gustavia St. Barts | city | — | REVIEW |
| 50 | dest-st-lucia | St. Lucia | St. Lucia | Castries St. Lucia | city | — | REVIEW |
| 51 | dest-austrian-alps | Austrian Alps | Austria | Innsbruck Austria | city | Salzburg Austria, Hallstatt Austria | REVIEW |
| 52 | dest-swiss-alps | Swiss Alps | Switzerland | Interlaken Switzerland | city | Zermatt Switzerland, St. Moritz Switzerland | REVIEW |
| 53 | dest-big-island | Big Island | United States | Hilo Hawaii | city | Kona Hawaii | REVIEW |
| 54 | dest-maui | Maui | United States | Kahului Hawaii | city | Lahaina Hawaii, Wailea Hawaii | REVIEW |
| 55 | dest-kauai | Kauai | United States | Lihue Hawaii | city | Princeville Hawaii | REVIEW |
| 56 | dest-oahu | Oahu | United States | Honolulu Hawaii | city | REVIEW: overlaps with dest-honolulu | REVIEW |

#### 3.2.3 BLOCKED — Poor Candidates Until Ambiguity Resolved (3 destinations)

| # | Elvora ID | Name | Country | Issue |
|---|---|---|---|---|
| 1 | dest-caribbean | Caribbean | West Indies | "West Indies" is not an ISO country. The Caribbean spans 20+ countries. No single DIDA search or bounding box can represent it. Admin must decide: split into individual island destinations (already exists), or create sub-regional groupings. |
| 2 | dest-greek-islands | Greek Islands | Greece | Extremely broad — coordinates (36, 25) are the center of the Aegean Sea. Hundreds of islands across Greece. No single bounding box is meaningful. Admin must decide: use only specific island destinations (Mykonos, Santorini already exist), or define which island groups to include. |
| 3 | dest-patagonia | Patagonia | Chile/Argentina | Spans two countries. Country field "Chile/Argentina" is not a valid ISO country code. No single country_code can be used for validation. Admin must decide: split into Chilean Patagonia and Argentine Patagonia, or pick one country. |

---

## 4. GEOGRAPHIC VALIDATION ALGORITHM

### 4.1 Purpose

Before any DIDA-returned hotel is accepted as belonging to an Elvora destination, it must pass geographic validation. This algorithm prevents the "Bali search returns Greek hotels" problem discovered in earlier testing.

### 4.2 Algorithm

```
FUNCTION validateHotelBelongsToDestination(hotel, destination, mapping):
  // Step 1: Country code check
  IF mapping.verified_country_code IS NULL:
    RETURN REJECT("missing_country_code — admin must set country code before validation")
  
  IF hotel.country_code != mapping.verified_country_code:
    RETURN REJECT("country_mismatch — hotel is in a different country than expected")
  
  // Step 2: Coordinate bounding box check
  IF mapping.verified_lat_min IS NOT NULL AND mapping.verified_lat_max IS NOT NULL
     AND mapping.verified_lon_min IS NOT NULL AND mapping.verified_lon_max IS NOT NULL:
    
    IF hotel.latitude IS NULL OR hotel.longitude IS NULL:
      RETURN FLAG_FOR_REVIEW("missing_hotel_coordinates — cannot validate geographically")
    
    IF hotel.latitude < mapping.verified_lat_min
       OR hotel.latitude > mapping.verified_lat_max
       OR hotel.longitude < mapping.verified_lon_min
       OR hotel.longitude > mapping.verified_lon_max:
      RETURN REJECT("outside_bounding_box — hotel coordinates are outside the destination's validated area")
  
  // Step 3: Distance check from destination center (fallback when bounding box is null)
  IF bounding box is NULL AND destination.latitude IS NOT NULL AND destination.longitude IS NOT NULL:
    distance = haversine(hotel.latitude, hotel.longitude, destination.latitude, destination.longitude)
    IF distance > MAX_RADIUS_KM:
      RETURN REJECT("too_far_from_center — hotel is more than MAX_RADIUS_KM from destination center")
  
  // Step 4: Duplicate detection against existing properties
  FOR EACH existing_property IN properties WHERE destination_id = destination.id:
    IF existing_property.supplier_name = 'hotelbeds':
      // Check if this could be the same hotel
      name_similarity = fuzzyMatch(hotel.name, existing_property.name)
      coord_distance = haversine(hotel.latitude, hotel.longitude, existing_property.latitude, existing_property.longitude)
      
      IF name_similarity > 0.85 AND coord_distance < 0.5_km:
        RETURN FLAG_FOR_REVIEW("potential_duplicate — hotel may already exist as Hotelbeds property")
      
      IF coord_distance < 0.1_km AND (name_similarity > 0.5 OR same_supplier_code):
        RETURN FLAG_FOR_REVIEW("potential_duplicate — very close coordinates with similar name")
  
  RETURN ACCEPT("validated")
```

### 4.3 Bounding Box Establishment

For **cities** (point destinations with a specific center):  
- Use a radius-based bounding box: lat ± 0.15° (~16 km), lon ± 0.15° (~16 km at equator, less at higher latitudes)  
- Admin can tighten or widen based on city size

For **islands** (e.g., Bali, Barbados, Mykonos):  
- Admin must define the bounding box from the island's geographic extents  
- For Bali: lat_min=-8.85, lat_max=-8.06, lon_min=114.44, lon_max=115.71  
- For small islands (Barbados, Capri): use a tight box around the island's known extents  
- If island extents are unknown, classify as REVIEW — do not invent a boundary

For **broad regions** (e.g., Tuscany, Sicily, French Riviera):  
- Admin must define the bounding box from the region's administrative boundaries  
- These are typically larger than city boxes and may need to be generous to avoid rejecting legitimate hotels  
- If the region's boundaries are unclear, classify as REVIEW

For **entire countries** (e.g., Botswana, Kenya, Saudi Arabia):  
- Use the country's ISO bounding box (available from public geographic datasets)  
- These are very large and should be supplemented with specific city search places rather than relying on the country box alone  
- The country code check (Step 1) is the primary validation; the bounding box is secondary

For **multi-country regions** (Caribbean, Patagonia):  
- BLOCKED until admin resolves the single-country-code requirement or splits the destination

### 4.4 Duplicate Detection Rules

- **Never automatically merge or delete** existing Hotelbeds properties based on DIDA results
- Flag potential duplicates for admin review with: hotel name, coordinates, distance to existing property, and name similarity score
- A potential duplicate is flagged when:  
  - Name similarity > 0.85 AND coordinate distance < 0.5 km, OR  
  - Coordinate distance < 0.1 km AND name similarity > 0.5
- The `supplier_property_keys` table's UNIQUE constraint on (supplier_name, supplier_hotel_code) prevents duplicate imports from the same supplier, but cross-supplier duplicates (Hotelbeds vs DIDA) require manual review

### 4.5 Handling Islands and Large Regions

For islands, the bounding box should be defined generously enough to include all hotels on the island but tight enough to exclude hotels on nearby islands or the mainland. For example:
- **Bali** (lat -8.34, lon 115.09): box of lat -8.85 to -8.06, lon 114.44 to 115.71
- **Mykonos** (lat 37.45, lon 25.33): box of lat 37.40 to 37.50, lon 25.20 to 25.40
- **Santorini** (lat 36.39, lon 25.46): box of lat 36.34 to 36.47, lon 25.31 to 25.61

If a destination lacks sufficient geographic data to establish a reliable bounding box, it should be classified as requiring admin review rather than inventing a boundary. The `verified_lat_min/max` and `verified_lon_min/max` columns in `dida_destination_map` can be left NULL until admin approves the values.

---

## 5. COVERAGE AND SEARCH LIMITATIONS

### 5.1 DIDA searchHotels Limitations

| Limitation | Practical Impact | Handling Strategy |
|---|---|---|
| Maximum `size` of 20 per call | Each search returns at most 20 hotels. A destination like Bali may have hundreds of hotels. | Use multiple search places per destination (e.g., Denpasar, Ubud, Seminyak). De-duplicate across searches using the geographic validation algorithm. |
| No documented pagination | Cannot page through additional results beyond the first 20. | Same as above: use multiple targeted searches rather than relying on pagination. |
| Broad destination query may resolve to wrong country | "Bali" returned hotels in Greece in prior testing. "Denpasar Indonesia" returned Bali hotels correctly. | Always use "CityName Country" format for the `place` parameter. Never use bare destination names. Geographic validation rejects hotels in the wrong country. |
| DIDA's complete catalog coverage not established | Unknown whether DIDA covers all 131 empty destinations. Some destinations (e.g., Serengeti, Patagonia) may have few or no DIDA-listed hotels. | Each destination's first search is a controlled test. If 0 results are returned, the mapping is marked as `no_supply` for admin review. Do not assume coverage. |
| Image usage and licensing rights not verified | DIDA may return hotel images whose licensing terms are unknown. | Do not import or display DIDA hotel images until licensing is verified. This is a Phase 7+ concern. |
| Full DIDA booking capability not established | The `getHotelDetail` tool returns rates and room types, but whether a booking token or booking flow exists is unverified. | Do not attempt bookings through DIDA. Phase 4 does not test booking capability. This must be explicitly authorized in a later phase. |
| No session continuity | The DIDA MCP server did not return a session ID in Phase 3A testing. Each function invocation performs a fresh initialize + tools/list. | This is acceptable for search operations but may impact rate limits. Monitor for quota issues. |

### 5.2 DIDA placeType Selection Guidance

| placeType | When to Use | Risk |
|---|---|---|
| city | Default for all city-level destinations | Low risk when "CityName Country" format is used |
| airport | When searching near a specific airport (e.g., destinations centered on an airport) | Medium risk — may return airport hotels only, not city-center hotels |
| point_of_interest | For landmarks, national parks (e.g., Zion, Big Sur, Serengeti) | Medium risk — may return hotels near the POI but outside the intended destination area |
| district/county | For administrative regions (e.g., Tuscany, Algarve) | Higher risk — DIDA may not recognize all district names |
| hotel | When searching for a specific hotel by name | Not recommended for destination-level searches |
| train_station | When destination is centered on a train station | Not recommended for most Elvora destinations |
| subway_station | Not applicable | Not recommended |
| detailed address | Not applicable for destination-level searches | Not recommended |

---

## 6. PRIORITIZED DESTINATION ROLLOUT PLAN

### 6.1 Tier 1 — Ready for Controlled DIDA Search Testing (74 destinations)

These are city-level destinations with unambiguous names, coordinates, and a clear country. They can proceed to authorized DIDA search testing in Phase 5 with minimal risk.

**Selection criteria:**
- Specific city or town (not a country or broad region)
- Country is unambiguous
- Coordinates are present
- Name is unlikely to resolve to a different country in DIDA
- Proposed DIDA place follows "CityName Country" or "CityName State" format

**Top 20 recommended for first batch:**
1. dest-bali (via Denpasar Indonesia) — high-value destination, previously tested
2. dest-tokyo — major city, unambiguous
3. dest-sydney — major city, unambiguous
4. dest-singapore — city-state, unambiguous
5. dest-hong-kong — unambiguous
6. dest-lisbon — unambiguous
7. dest-madrid — unambiguous
8. dest-marrakech — unambiguous
9. dest-buenos-aires — unambiguous
10. dest-cape-town — unambiguous
11. dest-kyoto — unambiguous
12. dest-phuket — unambiguous
13. dest-dubrovnik — unambiguous
14. dest-split — unambiguous
15. dest-santorini — high-value, specific island
16. dest-mykonos — high-value, specific island
17. dest-ibiza — unambiguous
18. dest-mallorca — unambiguous
19. dest-florence — unambiguous
20. dest-venice — unambiguous

### 6.2 Tier 2 — Require Admin Approval or Additional Geographic Data (54 destinations)

These are broad regions, island nations, or destinations with overlapping geography. They need:
- Admin-approved bounding boxes
- Multiple search locations defined
- Country code populated in the destinations table
- Resolution of overlapping destination clusters

**Notable items requiring admin decisions:**
- **Hawaii cluster:** dest-hawaii and dest-big-island have identical coordinates. Admin must decide whether to merge, or define separate search strategies and bounding boxes for each.
- **Cabo cluster:** dest-cabo-san-lucas and dest-los-cabos overlap. Admin must decide search strategy.
- **Miami cluster:** dest-miami and dest-miami-beach are adjacent cities. Admin must decide if both need separate DIDA searches.
- **All 143 destinations:** country_code is NULL for every destination. Admin should populate ISO country codes before DIDA imports begin.

### 6.3 Tier 3 — Poor Candidates Until Ambiguity Resolved (3 destinations)

| ID | Name | Blocking Issue | Resolution Required |
|---|---|---|---|
| dest-caribbean | Caribbean | "West Indies" is not an ISO country; spans 20+ countries | Admin must split into individual island destinations or define sub-regional groupings with specific country codes |
| dest-greek-islands | Greek Islands | Coordinates are center of Aegean Sea; covers hundreds of islands | Admin must define which specific islands to include, or rely on existing individual island destinations (Mykonos, Santorini) |
| dest-patagonia | Patagonia | Country is "Chile/Argentina" — not a valid single ISO country code | Admin must split into Chilean Patagonia and Argentine Patagonia, or pick one country |

---

## 7. EXACT DATABASE COUNTS — BEFORE AND AFTER

| Table | Before Phase 4 | After Phase 4 | Changed? |
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

## 8. FILES INSPECTED AND FILES CHANGED

### Files Inspected (read-only)

| File | Purpose |
|---|---|
| `supabase/migrations/20261020160609_20261020120000_create_dida_supplier_catalog_tables.sql` | Phase 2 migration — created `dida_destination_map` and `supplier_property_keys` tables |
| `supabase/functions/_shared/dida-mcp.ts` | DIDA MCP client adapter (shared by edge functions) |
| `supabase/functions/dida-capability-test/index.ts` | DIDA capability test edge function |
| `supabase/config.toml` | Edge function configuration (verified verify_jwt = true) |
| Live database schema for `destinations`, `dida_destination_map` tables via information_schema queries |
| Live database RLS policies for `dida_destination_map` via pg_policy queries |
| Live database constraints and indexes for `dida_destination_map` via pg_constraint and pg_indexes queries |

### Files Changed

**No files were changed.** This phase was strictly read-only: database queries, source-code inspection, and analysis only. No files were created, modified, or deleted (with the exception of this report file).

---

## 9. CONFIRMATION

| Confirmation | Status |
|---|---|
| No DIDA searches were performed | Confirmed — no calls to the dida-capability-test function or DIDA MCP endpoint were made during this phase |
| No Hotelbeds requests were made | Confirmed — no Hotelbeds edge functions were invoked |
| No database rows were inserted, updated, or deleted | Confirmed — all counts identical before and after |
| Hotelbeds quota pause remains unchanged | Confirmed — quota_paused = true |
| Hotelbeds queue remains stopped | Confirmed — queue_running = false |
| Paymentgate and booking/payment code untouched | Confirmed — no Paymentgate, checkout, webhook, or booking files were modified |
| No Edge Functions were deployed | Confirmed — deploy_edge_functions was not called |
| No frontend files were changed | Confirmed — no files under `src/` were modified |
| API keys, credentials, tokens not exposed | Confirmed — no secrets were read or logged |

---

## 10. OUTSTANDING RISKS AND QUESTIONS REQUIRING ADMIN DECISIONS

### 10.1 Blocking Decisions

1. **ISO country codes missing for all 143 destinations.** The `country_code` column is NULL for every destination. The geographic validation algorithm requires an ISO 3166-1 alpha-2 country code to reject hotels in the wrong country. Admin should populate this column before DIDA imports begin. Most mappings are deterministic (e.g., "United States" → "US", "Italy" → "IT", "France" → "FR") but edge cases require manual review:
   - "West Indies" (dest-caribbean) — not a valid ISO country
   - "Chile/Argentina" (dest-patagonia) — not a valid single ISO country
   - Territories like "Cayman Islands", "Turks and Caicos Islands", "British Virgin Islands", "U.S. Virgin Islands" — these have ISO codes (KY, TC, VG, VI) but admin should verify

2. **Three BLOCKED destinations** (Caribbean, Greek Islands, Patagonia) cannot proceed without admin decisions on scope splitting.

3. **Overlapping destinations** (Hawaii cluster, Cabo cluster, Miami cluster, French Riviera cluster) need admin decisions on whether to search independently or consolidate.

### 10.2 Risks

1. **DIDA catalog coverage unknown.** Some destinations (especially safari destinations like Serengeti, remote islands like Bora Bora, and entire countries like Botswana) may have few or no DIDA-listed hotels. The first search for each destination is exploratory.

2. **No pagination.** DIDA returns max 20 results per call. Large destinations will require multiple targeted city searches and de-duplication. This increases API call volume and quota usage.

3. **No session continuity.** Each DIDA MCP invocation performs a fresh initialize + tools/list, adding overhead to every search call. Monitor for rate limiting.

4. **Image licensing unverified.** DIDA may return hotel images, but licensing terms are unknown. Do not import or display images until verified.

5. **Booking capability unverified.** Whether DIDA supports booking (beyond search and detail) is unknown. Do not assume booking is possible.

6. **Cross-supplier duplicate detection is manual.** Hotels returned by DIDA may already exist as Hotelbeds properties. The algorithm flags these for review but does not merge or delete. Admin must review flagged duplicates manually.

7. **Bounding box accuracy.** The proposed bounding boxes for islands and regions are estimates. Admin should verify and adjust them based on actual DIDA search results. Too-tight boxes will reject legitimate hotels; too-wide boxes will accept hotels in the wrong area.

### 10.3 Questions for Admin

1. Should the 12 Category D destinations (with existing Hotelbeds inventory) also be mapped for DIDA searches to supplement inventory, or should DIDA focus only on the 131 empty destinations?
2. Should overlapping destinations (e.g., Hawaii + Big Island, Cabo San Lucas + Los Cabos, Miami + Miami Beach) be consolidated or kept as separate destinations with independent DIDA searches?
3. Should country_code be populated as a separate admin task, or should it be part of the Phase 5 mapping workflow?
4. What is the acceptable DIDA API call budget per destination? (Each destination requires at minimum 2 calls: initialize + tools/list, plus 1 call per search place.)
5. Should the three BLOCKED destinations be split, redefined, or deactivated?

---

**Phase 4 is complete. Stopping here. No destination mappings have been written to the database. No DIDA searches have been performed. No hotels have been imported. No Phase 5 work has begun.**
