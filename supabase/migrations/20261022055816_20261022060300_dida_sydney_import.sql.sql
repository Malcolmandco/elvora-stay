/*
# DIDA Catalog Expansion — Sydney (10 hotels)

## Phase 9: DIDA Catalog Expansion
## Destination: Sydney, Australia (dest-sydney)

## Data Source
DIDA MCP searchHotels API queried for "Sydney Australia" with
checkInDate 2026-11-15, 2 nights, 2 adults, size=10.
Search conducted and validated during Phase 5A (2026-10-21).

## Geographic Validation
All 10 hotels have areaCode "AU" and coordinates within Sydney bounds
(lat -34.0 to -33.7, lon 151.1 to 151.3). 100% valid match rate.

## Duplicate Check
Database query confirmed zero existing properties within the Sydney area.
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

-- ─── Hotel 1: Shangri-La Sydney ──────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15170',
  'Shangri-La Sydney',
  'dida-15170-shangri-la-sydney',
  'Shangri-La',
  'Shangri-La Sydney - Sydney, Australia',
  '<p>Shangri-La Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '176 Cumberland Street',
  -33.861,
  151.206,
  331.55,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15170&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15170',
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
  'dida-15170',
  'dida',
  '15170',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15170, "name": "Shangri-La Sydney", "areaCode": "AU", "starRating": 5, "priceLowest": 331.55, "currency": "USD", "latitude": -33.861, "longitude": 151.206, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 2: The Sydney Boulevard Hotel by Accor ────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15218',
  'The Sydney Boulevard Hotel by Accor',
  'dida-15218-the-sydney-boulevard-hotel-by-accor',
  'Accor',
  'The Sydney Boulevard Hotel by Accor - Sydney, Australia',
  '<p>The Sydney Boulevard Hotel by Accor - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '90 William Street',
  -33.874,
  151.217,
  158.07,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15218&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15218',
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
  'dida-15218',
  'dida',
  '15218',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15218, "name": "The Sydney Boulevard Hotel by Accor", "areaCode": "AU", "starRating": 4, "priceLowest": 158.07, "currency": "USD", "latitude": -33.874, "longitude": 151.217, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 3: YEHS Hotel Sydney Harbour Suites ───────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15186',
  'YEHS Hotel Sydney Harbour Suites',
  'dida-15186-yehs-hotel-sydney-harbour-suites',
  NULL,
  'YEHS Hotel Sydney Harbour Suites - Sydney, Australia',
  '<p>YEHS Hotel Sydney Harbour Suites - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '252 Sussex Street',
  -33.873,
  151.204,
  248.90,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15186&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15186',
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
  'dida-15186',
  'dida',
  '15186',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15186, "name": "YEHS Hotel Sydney Harbour Suites", "areaCode": "AU", "starRating": 4, "priceLowest": 248.90, "currency": "USD", "latitude": -33.873, "longitude": 151.204, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 4: Mercure Sydney ─────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15171',
  'Mercure Sydney',
  'dida-15171-mercure-sydney',
  'Mercure',
  'Mercure Sydney - Sydney, Australia',
  '<p>Mercure Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '818-820 George Street',
  -33.884,
  151.203,
  186.32,
  'USD',
  4.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15171&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15171',
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
  'dida-15171',
  'dida',
  '15171',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15171, "name": "Mercure Sydney", "areaCode": "AU", "starRating": 4.5, "priceLowest": 186.32, "currency": "USD", "latitude": -33.884, "longitude": 151.203, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 5: Citadines Walker North Sydney ──────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1620799',
  'Citadines Walker North Sydney',
  'dida-1620799-citadines-walker-north-sydney',
  'Citadines',
  'Citadines Walker North Sydney - Sydney, Australia',
  '<p>Citadines Walker North Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '88 Walker Street',
  -33.838,
  151.209,
  211.30,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1620799&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1620799',
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
  'dida-1620799',
  'dida',
  '1620799',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 1620799, "name": "Citadines Walker North Sydney", "areaCode": "AU", "starRating": 4, "priceLowest": 211.30, "currency": "USD", "latitude": -33.838, "longitude": 151.209, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 6: Four Seasons Hotel Sydney ──────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15182',
  'Four Seasons Hotel Sydney',
  'dida-15182-four-seasons-hotel-sydney',
  'Four Seasons',
  'Four Seasons Hotel Sydney - Sydney, Australia',
  '<p>Four Seasons Hotel Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '199 George St.',
  -33.862,
  151.208,
  395.80,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15182&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15182',
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
  'dida-15182',
  'dida',
  '15182',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15182, "name": "Four Seasons Hotel Sydney", "areaCode": "AU", "starRating": 5, "priceLowest": 395.80, "currency": "USD", "latitude": -33.862, "longitude": 151.208, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 7: Little National Hotel Sydney ───────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1421807',
  'Little National Hotel Sydney',
  'dida-1421807-little-national-hotel-sydney',
  NULL,
  'Little National Hotel Sydney - Sydney, Australia',
  '<p>Little National Hotel Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '26 Clarence St',
  -33.866,
  151.205,
  211.43,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1421807&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1421807',
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
  'dida-1421807',
  'dida',
  '1421807',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 1421807, "name": "Little National Hotel Sydney", "areaCode": "AU", "starRating": 4, "priceLowest": 211.43, "currency": "USD", "latitude": -33.866, "longitude": 151.205, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 8: Travelodge Hotel Sydney Airport ────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-290497',
  'Travelodge Hotel Sydney Airport',
  'dida-290497-travelodge-hotel-sydney-airport',
  'Travelodge',
  'Travelodge Hotel Sydney Airport - Sydney, Australia',
  '<p>Travelodge Hotel Sydney Airport - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '289 King Street',
  -33.928,
  151.186,
  115.68,
  'USD',
  4.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=290497&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '290497',
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
  'dida-290497',
  'dida',
  '290497',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 290497, "name": "Travelodge Hotel Sydney Airport", "areaCode": "AU", "starRating": 4.5, "priceLowest": 115.68, "currency": "USD", "latitude": -33.928, "longitude": 151.186, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 9: Great Southern Hotel Sydney ────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-187570',
  'Great Southern Hotel Sydney',
  'dida-187570-great-southern-hotel-sydney',
  'Great Southern',
  'Great Southern Hotel Sydney - Sydney, Australia',
  '<p>Great Southern Hotel Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '717 George Street',
  -33.881,
  151.204,
  165.97,
  'USD',
  3.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=187570&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '187570',
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
  'dida-187570',
  'dida',
  '187570',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 187570, "name": "Great Southern Hotel Sydney", "areaCode": "AU", "starRating": 3.5, "priceLowest": 165.97, "currency": "USD", "latitude": -33.881, "longitude": 151.204, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 10: Hyatt Regency Sydney ──────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-15136',
  'Hyatt Regency Sydney',
  'dida-15136-hyatt-regency-sydney',
  'Hyatt',
  'Hyatt Regency Sydney - Sydney, Australia',
  '<p>Hyatt Regency Sydney - Sydney, Australia</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-sydney',
  'sydney',
  'Sydney',
  'Australia',
  'Sydney',
  '161 Sussex Street',
  -33.870,
  151.204,
  253.47,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=15136&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '15136',
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
  'dida-15136',
  'dida',
  '15136',
  'dest-sydney',
  'Sydney Australia',
  'city',
  '{"hotelId": 15136, "name": "Hyatt Regency Sydney", "areaCode": "AU", "starRating": 5, "priceLowest": 253.47, "currency": "USD", "latitude": -33.870, "longitude": 151.204, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;
