/*
# DIDA Catalog Expansion — Marrakech (10 hotels)

## Phase 9: DIDA Catalog Expansion
## Destination: Marrakech, Morocco (dest-marrakech)

## Data Source
DIDA MCP searchHotels API queried for "Marrakech Morocco" with
checkInDate 2026-11-15, 2 nights, 2 adults, size=10.
Search conducted and validated during Phase 5A (2026-10-21).

## Geographic Validation
All 10 hotels have areaCode "MA" and coordinates within Marrakech bounds
(lat 31.5-31.8, lon -8.1 to -7.9). 100% valid match rate.

## Duplicate Check
Database query confirmed zero existing properties within the Marrakech area.
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

-- ─── Hotel 1: Mövenpick Hotel Mansour Eddahbi Marrakech ──────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-233847',
  'Mövenpick Hotel Mansour Eddahbi Marrakech',
  'dida-233847-movenpick-hotel-mansour-eddahbi-marrakech',
  'Mövenpick',
  'Mövenpick Hotel Mansour Eddahbi Marrakech - Marrakech, Morocco',
  '<p>Mövenpick Hotel Mansour Eddahbi Marrakech - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Avenue Mohamed VI',
  31.624,
  -8.015,
  223.50,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=233847&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '233847',
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
  'dida-233847',
  'dida',
  '233847',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 233847, "name": "Mövenpick Hotel Mansour Eddahbi Marrakech", "areaCode": "MA", "starRating": 5, "priceLowest": 223.50, "currency": "USD", "latitude": 31.624, "longitude": -8.015, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 2: Riad Marrakech House ───────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1003490',
  'Riad Marrakech House',
  'dida-1003490-riad-marrakech-house',
  NULL,
  'Riad Marrakech House - Marrakech, Morocco',
  '<p>Riad Marrakech House - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'No 1 AV Abdelkarim Al Khattabi',
  31.653,
  -8.020,
  21.35,
  'USD',
  3,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1003490&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1003490',
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
  'dida-1003490',
  'dida',
  '1003490',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 1003490, "name": "Riad Marrakech House", "areaCode": "MA", "starRating": 3, "priceLowest": 21.35, "currency": "USD", "latitude": 31.653, "longitude": -8.020, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 3: Kenzi Rose Garden ──────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-35158',
  'Kenzi Rose Garden',
  'dida-35158-kenzi-rose-garden',
  'Kenzi',
  'Kenzi Rose Garden - Marrakech, Morocco',
  '<p>Kenzi Rose Garden - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Avenue du Président Kennedy',
  31.622,
  -8.007,
  125.83,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=35158&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '35158',
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
  'dida-35158',
  'dida',
  '35158',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 35158, "name": "Kenzi Rose Garden", "areaCode": "MA", "starRating": 5, "priceLowest": 125.83, "currency": "USD", "latitude": 31.622, "longitude": -8.007, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 4: Hotel Mont Gueliz ──────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-35251',
  'Hotel Mont Gueliz',
  'dida-35251-hotel-mont-gueliz',
  NULL,
  'Hotel Mont Gueliz - Marrakech, Morocco',
  '<p>Hotel Mont Gueliz - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  '10-12 Avenue Mohamed V Gueliz',
  31.638,
  -8.017,
  47.17,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=35251&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '35251',
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
  'dida-35251',
  'dida',
  '35251',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 35251, "name": "Hotel Mont Gueliz", "areaCode": "MA", "starRating": 4, "priceLowest": 47.17, "currency": "USD", "latitude": 31.638, "longitude": -8.017, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 5: Hotel Safia ────────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1716974',
  'Hotel Safia',
  'dida-1716974-hotel-safia',
  NULL,
  'Hotel Safia - Marrakech, Morocco',
  '<p>Hotel Safia - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  '18 Av. Hassan II',
  31.631,
  -8.015,
  59.66,
  'USD',
  3,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1716974&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1716974',
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
  'dida-1716974',
  'dida',
  '1716974',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 1716974, "name": "Hotel Safia", "areaCode": "MA", "starRating": 3, "priceLowest": 59.66, "currency": "USD", "latitude": 31.631, "longitude": -8.015, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 6: Grand Plaza ────────────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-35188',
  'Grand Plaza',
  'dida-35188-grand-plaza',
  NULL,
  'Grand Plaza - Marrakech, Morocco',
  '<p>Grand Plaza - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Angle Avenue Mohammed VI, et Avenue Hassan II',
  31.630,
  -8.016,
  134.43,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=35188&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '35188',
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
  'dida-35188',
  'dida',
  '35188',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 35188, "name": "Grand Plaza", "areaCode": "MA", "starRating": 4, "priceLowest": 134.43, "currency": "USD", "latitude": 31.630, "longitude": -8.016, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 7: Sofitel Marrakech Palais Imperial & Spa ────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-113332',
  'Sofitel Marrakech Palais Imperial & Spa',
  'dida-113332-sofitel-marrakech-palais-imperial-spa',
  'Sofitel',
  'Sofitel Marrakech Palais Imperial & Spa - Marrakech, Morocco',
  '<p>Sofitel Marrakech Palais Imperial & Spa - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Rue Harroun Errachid, Hivernage',
  31.622,
  -8.001,
  301.52,
  'USD',
  5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=113332&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '113332',
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
  'dida-113332',
  'dida',
  '113332',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 113332, "name": "Sofitel Marrakech Palais Imperial & Spa", "areaCode": "MA", "starRating": 5, "priceLowest": 301.52, "currency": "USD", "latitude": 31.622, "longitude": -8.001, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 8: Novotel Marrakech Hivernage ────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-35156',
  'Novotel Marrakech Hivernage',
  'dida-35156-novotel-marrakech-hivernage',
  'Novotel',
  'Novotel Marrakech Hivernage - Marrakech, Morocco',
  '<p>Novotel Marrakech Hivernage - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Rue Haroun Errachid, Hivernage',
  31.622,
  -8.001,
  109.18,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=35156&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '35156',
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
  'dida-35156',
  'dida',
  '35156',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 35156, "name": "Novotel Marrakech Hivernage", "areaCode": "MA", "starRating": 4, "priceLowest": 109.18, "currency": "USD", "latitude": 31.622, "longitude": -8.001, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 9: Royal Mirage Deluxe Marrakech ──────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1001700',
  'Royal Mirage Deluxe Marrakech',
  'dida-1001700-royal-mirage-deluxe-marrakech',
  NULL,
  'Royal Mirage Deluxe Marrakech - Marrakech, Morocco',
  '<p>Royal Mirage Deluxe Marrakech - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Rue Paris, Quartier Hivernage',
  31.626,
  -8.003,
  115.79,
  'USD',
  4.5,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1001700&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1001700',
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
  'dida-1001700',
  'dida',
  '1001700',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 1001700, "name": "Royal Mirage Deluxe Marrakech", "areaCode": "MA", "starRating": 4.5, "priceLowest": 115.79, "currency": "USD", "latitude": 31.626, "longitude": -8.003, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 10: Longue Vie Hôtels ─────────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1597849',
  'Longue Vie Hôtels',
  'dida-1597849-longue-vie-hotels',
  NULL,
  'Longue Vie Hôtels - Marrakech, Morocco',
  '<p>Longue Vie Hôtels - Marrakech, Morocco</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-marrakech',
  'marrakech',
  'Marrakech',
  'Morocco',
  'Marrakech',
  'Avenue Hassan II',
  31.631,
  -8.012,
  173.41,
  'USD',
  4,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  '[]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1597849&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1597849',
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
  'dida-1597849',
  'dida',
  '1597849',
  'dest-marrakech',
  'Marrakech Morocco',
  'city',
  '{"hotelId": 1597849, "name": "Longue Vie Hôtels", "areaCode": "MA", "starRating": 4, "priceLowest": 173.41, "currency": "USD", "latitude": 31.631, "longitude": -8.012, "source": "dida_search_phase5a", "importPhase": "phase9"}'::jsonb,
  '2026-10-22 06:00:00+00',
  '2026-10-22 06:00:00+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;
