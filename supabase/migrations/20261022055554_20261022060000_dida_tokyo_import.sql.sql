/*
# DIDA Catalog Expansion — Tokyo (10 hotels)

## Phase 9: DIDA Catalog Expansion
## Destination: Tokyo, Japan (dest-tokyo)

## Data Source
DIDA MCP searchHotels API queried for "Tokyo Japan" with
checkInDate 2026-11-15, 2 nights, 2 adults, size=10.
Search conducted and validated during Phase 5A (2026-10-21).

## Geographic Validation
All 10 hotels have areaCode "JP" and coordinates within Tokyo bounds
(lat 35.5-35.8, lon 139.5-139.9). 100% valid match rate.

## Duplicate Check
Database query confirmed zero existing properties within the Tokyo area.
No cross-supplier duplicates found.

## Safety
- All properties: is_active=false, booking_enabled=false,
  property_status='catalog', supplier_status='not_connected',
  verification_status='needs_review'
- ON CONFLICT (id) DO NOTHING — idempotent
- ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING — idempotent
- No existing records modified or deleted
- Images: '[]' — image URLs not available from Phase 5A summary data.
  Will be populated via getHotelDetail in a future enrichment pass.
- Descriptions: minimal (hotel name + city) — full descriptions will be
  populated via getHotelDetail in a future enrichment pass.
- Amenities/tags: empty arrays — will be populated via getHotelDetail.

## Price Provenance
Prices are search-time values from DIDA searchHotels for checkInDate 2026-11-15,
2 nights, 2 adults, USD. Not guaranteed booking prices.
*/

-- ─── Hotel 1: Mitsui Garden Hotel Gotanda Tokyo ──────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-617191',
  'Mitsui Garden Hotel Gotanda Tokyo',
  'dida-617191-mitsui-garden-hotel-gotanda-tokyo',
  'Mitsui Garden Hotel',
  'Mitsui Garden Hotel Gotanda Tokyo - Tokyo, Japan',
  '<p>Mitsui Garden Hotel Gotanda Tokyo - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '2-2-6, Higashi-Gotanda, Shinagawa-ku',
  35.625,
  139.725,
  196.40,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=617191&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '617191',
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
  'dida-617191',
  'dida',
  '617191',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 617191, "name": "Mitsui Garden Hotel Gotanda Tokyo", "areaCode": "JP", "starRating": 4, "priceLowest": 196.40, "currency": "USD", "latitude": 35.625, "longitude": 139.725, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 2: Mitsui Garden Hotel Shiodome Italia-gai ────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-5293',
  'Mitsui Garden Hotel Shiodome Italia-gai',
  'dida-5293-mitsui-garden-hotel-shiodome-italia-gai',
  'Mitsui Garden Hotel',
  'Mitsui Garden Hotel Shiodome Italia-gai - Tokyo, Japan',
  '<p>Mitsui Garden Hotel Shiodome Italia-gai - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '2-14-24 Higashi-Shimbashi, Minato-ku',
  35.660,
  139.757,
  181.14,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=5293&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '5293',
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
  'dida-5293',
  'dida',
  '5293',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 5293, "name": "Mitsui Garden Hotel Shiodome Italia-gai", "areaCode": "JP", "starRating": 4, "priceLowest": 181.14, "currency": "USD", "latitude": 35.660, "longitude": 139.757, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 3: Hotel MONday Haneda Airport ────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-616102',
  'Hotel MONday Haneda Airport',
  'dida-616102-hotel-monday-haneda-airport',
  NULL,
  'Hotel MONday Haneda Airport - Tokyo, Japan',
  '<p>Hotel MONday Haneda Airport - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '3-6 Haginaka, Ota-ku',
  35.552,
  139.740,
  83.98,
  'USD',
  3,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=616102&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '616102',
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
  'dida-616102',
  'dida',
  '616102',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 616102, "name": "Hotel MONday Haneda Airport", "areaCode": "JP", "starRating": 3, "priceLowest": 83.98, "currency": "USD", "latitude": 35.552, "longitude": 139.740, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 4: Tokyo Dome Hotel ───────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-118607',
  'Tokyo Dome Hotel',
  'dida-118607-tokyo-dome-hotel',
  NULL,
  'Tokyo Dome Hotel - Tokyo, Japan',
  '<p>Tokyo Dome Hotel - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '1-3-61 Koraku, Bunkyo-ku',
  35.704,
  139.753,
  183.97,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=118607&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '118607',
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
  'dida-118607',
  'dida',
  '118607',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 118607, "name": "Tokyo Dome Hotel", "areaCode": "JP", "starRating": 5, "priceLowest": 183.97, "currency": "USD", "latitude": 35.704, "longitude": 139.753, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 5: Shinjuku Granbell Hotel ────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-527',
  'Shinjuku Granbell Hotel',
  'dida-527-shinjuku-granbell-hotel',
  NULL,
  'Shinjuku Granbell Hotel - Tokyo, Japan',
  '<p>Shinjuku Granbell Hotel - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '2-14-5 Kabuki-cho, Shinjuku',
  35.697,
  139.705,
  160.66,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=527&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '527',
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
  'dida-527',
  'dida',
  '527',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 527, "name": "Shinjuku Granbell Hotel", "areaCode": "JP", "starRating": 4, "priceLowest": 160.66, "currency": "USD", "latitude": 35.697, "longitude": 139.705, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 6: Hotel Sunroute Plaza Shinjuku ──────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-529',
  'Hotel Sunroute Plaza Shinjuku',
  'dida-529-hotel-sunroute-plaza-shinjuku',
  NULL,
  'Hotel Sunroute Plaza Shinjuku - Tokyo, Japan',
  '<p>Hotel Sunroute Plaza Shinjuku - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '2-3-1 Yoyogi, Shibuya',
  35.687,
  139.699,
  244.31,
  'USD',
  3.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=529&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '529',
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
  'dida-529',
  'dida',
  '529',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 529, "name": "Hotel Sunroute Plaza Shinjuku", "areaCode": "JP", "starRating": 3.5, "priceLowest": 244.31, "currency": "USD", "latitude": 35.687, "longitude": 139.699, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 7: Hotel Gracery Shinjuku ─────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-3912',
  'Hotel Gracery Shinjuku',
  'dida-3912-hotel-gracery-shinjuku',
  'Gracery',
  'Hotel Gracery Shinjuku - Tokyo, Japan',
  '<p>Hotel Gracery Shinjuku - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '1-19-1 Kabukicho, Shinjuku-ku',
  35.695,
  139.702,
  225.82,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=3912&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '3912',
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
  'dida-3912',
  'dida',
  '3912',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 3912, "name": "Hotel Gracery Shinjuku", "areaCode": "JP", "starRating": 4, "priceLowest": 225.82, "currency": "USD", "latitude": 35.695, "longitude": 139.702, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 8: Mitsui Garden Hotel Ueno Tokyo ─────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-5422',
  'Mitsui Garden Hotel Ueno Tokyo',
  'dida-5422-mitsui-garden-hotel-ueno-tokyo',
  'Mitsui Garden Hotel',
  'Mitsui Garden Hotel Ueno Tokyo - Tokyo, Japan',
  '<p>Mitsui Garden Hotel Ueno Tokyo - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '3-19-7 Higashi-ueno, Taito-ku',
  35.712,
  139.778,
  285.90,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=5422&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '5422',
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
  'dida-5422',
  'dida',
  '5422',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 5422, "name": "Mitsui Garden Hotel Ueno Tokyo", "areaCode": "JP", "starRating": 4, "priceLowest": 285.90, "currency": "USD", "latitude": 35.712, "longitude": 139.778, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 9: Hotel Metropolitan Tokyo Ikebukuro ─────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-526',
  'Hotel Metropolitan Tokyo Ikebukuro',
  'dida-526-hotel-metropolitan-tokyo-ikebukuro',
  'Metropolitan',
  'Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan',
  '<p>Hotel Metropolitan Tokyo Ikebukuro - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '1-6-1 Nishi-Ikebukuro, Toshima-ku',
  35.728,
  139.708,
  206.00,
  'USD',
  3.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=526&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '526',
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
  'dida-526',
  'dida',
  '526',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 526, "name": "Hotel Metropolitan Tokyo Ikebukuro", "areaCode": "JP", "starRating": 3.5, "priceLowest": 206.00, "currency": "USD", "latitude": 35.728, "longitude": 139.708, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 10: Millennium Mitsui Garden Hotel Tokyo/Ginza ────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-5381',
  'Millennium Mitsui Garden Hotel Tokyo/Ginza',
  'dida-5381-millennium-mitsui-garden-hotel-tokyo-ginza',
  'Mitsui Garden Hotel',
  'Millennium Mitsui Garden Hotel Tokyo/Ginza - Tokyo, Japan',
  '<p>Millennium Mitsui Garden Hotel Tokyo/Ginza - Tokyo, Japan</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-tokyo',
  'tokyo',
  'Tokyo',
  'Japan',
  'Tokyo',
  '5-11-1 Ginza, Chuo-ku',
  35.670,
  139.766,
  389.49,
  'USD',
  4.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=5381&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '5381',
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
  'dida-5381',
  'dida',
  '5381',
  'dest-tokyo',
  'Tokyo Japan',
  'city',
  '{"hotelId": 5381, "name": "Millennium Mitsui Garden Hotel Tokyo/Ginza", "areaCode": "JP", "starRating": 4.5, "priceLowest": 389.49, "currency": "USD", "latitude": 35.670, "longitude": 139.766, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;
