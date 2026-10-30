/*
# DIDA Catalog Expansion — Santorini (6 hotels)

## Phase 9: DIDA Catalog Expansion
## Destination: Santorini, Greece (dest-santorini)

## Data Source
DIDA MCP searchHotels API queried for "Santorini Greece" with
checkInDate 2026-11-15, 2 nights, 2 adults, size=10.
Search conducted and validated during Phase 5A (2026-10-21).
DIDA returned 6 of 10 requested — small island inventory.

## Geographic Validation
All 6 hotels have areaCode "GR" and coordinates within Santorini bounds
(lat 36.3-36.5, lon 25.2-25.6). 100% valid match rate.

## Duplicate Check
Database query confirmed zero existing properties within the Santorini area.
No cross-supplier duplicates found.

## Safety
- All properties: is_active=false, booking_enabled=false,
  property_status='catalog', supplier_status='not_connected',
  verification_status='needs_review'
- ON CONFLICT (id) DO NOTHING — idempotent
- ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING — idempotent
- No existing records modified or deleted
- Images: '[]' — to be populated via getHotelDetail enrichment pass.
- Descriptions/amenities: minimal — to be enriched via getHotelDetail.

## Price Provenance
Prices are search-time values from DIDA searchHotels for checkInDate 2026-11-15,
2 nights, 2 adults, USD. Not guaranteed booking prices.
*/

-- ─── Hotel 1: Golden Star ────────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-187024',
  'Golden Star',
  'dida-187024-golden-star',
  NULL,
  'Golden Star - Santorini, Greece',
  '<p>Golden Star - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Fira',
  36.419,
  25.436,
  54.17,
  'USD',
  2,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=187024&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '187024',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-187024',
  'dida',
  '187024',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 187024, "name": "Golden Star", "areaCode": "GR", "starRating": 2, "priceLowest": 54.17, "currency": "USD", "latitude": 36.419, "longitude": 25.436, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 2: Galatia Villas ─────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-49165',
  'Galatia Villas',
  'dida-49165-galatia-villas',
  NULL,
  'Galatia Villas - Santorini, Greece',
  '<p>Galatia Villas - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Fira',
  36.423,
  25.435,
  30.71,
  'USD',
  3,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=49165&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '49165',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-49165',
  'dida',
  '49165',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 49165, "name": "Galatia Villas", "areaCode": "GR", "starRating": 3, "priceLowest": 30.71, "currency": "USD", "latitude": 36.423, "longitude": 25.435, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 3: Central Fira ───────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-47522',
  'Central Fira',
  'dida-47522-central-fira',
  NULL,
  'Central Fira - Santorini, Greece',
  '<p>Central Fira - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Fira',
  36.418,
  25.433,
  41.61,
  'USD',
  3,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=47522&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '47522',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-47522',
  'dida',
  '47522',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 47522, "name": "Central Fira", "areaCode": "GR", "starRating": 3, "priceLowest": 41.61, "currency": "USD", "latitude": 36.418, "longitude": 25.433, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 4: CILON Suites ───────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1599868',
  'CILON Suites',
  'dida-1599868-cilon-suites',
  NULL,
  'CILON Suites - Santorini, Greece',
  '<p>CILON Suites - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Imerovigli',
  36.433,
  25.423,
  213.34,
  'USD',
  3.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1599868&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1599868',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-1599868',
  'dida',
  '1599868',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 1599868, "name": "CILON Suites", "areaCode": "GR", "starRating": 3.5, "priceLowest": 213.34, "currency": "USD", "latitude": 36.433, "longitude": 25.423, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 5: Volcano View Hotel Santorini ───────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-49117',
  'Volcano View Hotel Santorini',
  'dida-49117-volcano-view-hotel-santorini',
  NULL,
  'Volcano View Hotel Santorini - Santorini, Greece',
  '<p>Volcano View Hotel Santorini - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Fira',
  36.395,
  25.438,
  618.96,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=49117&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '49117',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-49117',
  'dida',
  '49117',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 49117, "name": "Volcano View Hotel Santorini", "areaCode": "GR", "starRating": 5, "priceLowest": 618.96, "currency": "USD", "latitude": 36.395, "longitude": 25.438, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 6: Athina Luxury Suites ───────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-49257',
  'Athina Luxury Suites',
  'dida-49257-athina-luxury-suites',
  NULL,
  'Athina Luxury Suites - Santorini, Greece',
  '<p>Athina Luxury Suites - Santorini, Greece</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-santorini',
  'santorini',
  'Santorini',
  'Greece',
  'Santorini',
  'Fira',
  36.416,
  25.432,
  220.65,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=49257&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '49257',
  'dida',
  '2026-10-22 06:00:00+00',
  ARRAY[]::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-49257',
  'dida',
  '49257',
  'dest-santorini',
  'Santorini Greece',
  'city',
  '{"hotelId": 49257, "name": "Athina Luxury Suites", "areaCode": "GR", "starRating": 4, "priceLowest": 220.65, "currency": "USD", "latitude": 36.416, "longitude": 25.432, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;
