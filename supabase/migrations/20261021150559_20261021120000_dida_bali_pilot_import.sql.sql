/*
# DIDA Bali Pilot Import — Phase 7

## Purpose
Imports 8 DIDA supplier hotels for the Bali (Denpasar) pilot. Two hotels
(dida-57700, dida-62214) were inserted via execute_sql in a prior batch;
this migration adds the remaining 8 of the 10 approved pilot properties.

## Data Source
DIDA MCP searchHotels API (https://mcp.rollinggo.ai/mcp) queried for
"Denpasar Indonesia" with checkInDate 2026-11-15, 2 nights, 2 adults.
All hotels passed geographic validation (areaCode="ID", coordinates within
Bali bounding box). Written data-use permission received from DIDA/RollingGo.

## Safety
- All properties: is_active=false (hidden from public), booking_enabled=false,
  property_status='catalog', supplier_status='not_connected',
  verification_status='needs_review'.
- No booking workflows, no booking links, no price comparison UI changes.
- supplier_property_keys entries added for idempotent re-import detection.
- ON CONFLICT DO NOTHING on both properties.id and supplier_property_keys
  unique constraint ensures idempotency.
*/

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-212171',
  'ARTOTEL Sanur Bali',
  'dida-212171-artotel-sanur-bali',
  'ArtOtel by Radisson',
  'ARTOTEL Sanur Bali - a spa hotel in Denpasar''s Sanur area, within 5-minute walk of Mertasari Beach and Sanur Beach. Features full-service spa, outdoor pool, restaurant, and complimentary area shuttle.',
  '<p>ARTOTEL Sanur Bali - a spa hotel in Denpasar''s Sanur area, within 5-minute walk of Mertasari Beach and Sanur Beach. Features full-service spa, outdoor pool, restaurant, and complimentary area shuttle.</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-bali',
  'bali',
  'Bali',
  'Indonesia',
  'Denpasar',
  'Jl. Kusuma Sari No.1, Sanur',
  -8.705514,
  115.260804,
  95.44,
  'USD',
  4,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Shuttle','Front Desk (24 Hours)','Spa','With Elevator','Business Center','Conference Hall','Bar','Wheelchair Access','Bicycle Rental Service','Outdoor Swimming Pool','Laundry Facilities','Child Care (Fee Based)','Room Wifi (Free)','Designated Smoking Area','Terrace','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Paid Airport Pick-Up','Snack Bar','Full Service Spa','Breakfast Provided']::text[],
  ARRAY['Local Chain','Independent hotel','Business center','Banquet hall','Children’s pool','Kids'' Facilities','Cots/Cribs Available','Outdoor Pool','Slippers provided in room','Electric kettle in room','Hair dryer in room','Room Service','Rooms with double bed available','Twin rooms available','Premium Stay']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/212171/Featured%20Image/14654774_19_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=212171&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '212171',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Shuttle','Front Desk (24 Hours)','Spa','With Elevator','Business Center','Conference Hall','Bar','Wheelchair Access','Bicycle Rental Service','Outdoor Swimming Pool','Laundry Facilities','Child Care (Fee Based)','Room Wifi (Free)','Designated Smoking Area','Terrace','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Paid Airport Pick-Up','Snack Bar','Full Service Spa','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-212171',
  'dida',
  '212171',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 212171, "name": "ARTOTEL Sanur Bali", "areaCode": "ID", "starRating": 4, "priceLowest": 95.44, "currency": "USD", "latitude": -8.705514, "longitude": 115.260804, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  now(),
  now()
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-1427078',
  'Holiday Inn Bali Sanur by IHG',
  'dida-1427078-holiday-inn-bali-sanur-by-ihg',
  'Holiday Inn',
  'Holiday Inn Bali Sanur by IHG in Denpasar (Sanur), within 15-minute drive of Sanur Beach. Features outdoor pool, 24-hour fitness center, restaurant, and free self parking.',
  '<p>Holiday Inn Bali Sanur by IHG in Denpasar (Sanur), within 15-minute drive of Sanur Beach. Features outdoor pool, 24-hour fitness center, restaurant, and free self parking.</p>',
  'hotel',
  'catalog',
  'not_connected',
  'needs_review',
  false,
  'dest-bali',
  'bali',
  'Bali',
  'Indonesia',
  'Denpasar',
  'JALAN KESUMA SARI NO. 4 SANUR - DENPASAR',
  -8.705688,
  115.260713,
  77.13,
  'USD',
  4,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Front Desk (24 Hours)','Fishing','With Elevator','Front Desk Safe','Conference Hall','Bar','Wheelchair Access','Multilingual Staff','Outdoor Swimming Pool','Reception Hall','Fitness Center','Laundry Facilities','Towel Replacement','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Snorkeling','No Smoking In Public Areas','Computer','Terrace','Restaurant','Bedding Change: 1 Guest 1 Change','Barrier-Free Passage','Garden','Outdoor Furniture','Beach/Pool Parasol','The Lobby Tv','Paid Airport Pick-Up','Lounge Chair','Surfing Lessons','Swimming Pool','Parking Area','Breakfast Provided']::text[],
  ARRAY['International Chain','Independent hotel','Kids'' Facilities','Cots/Cribs Available','Outdoor Pool','Gym','Slippers provided in room','Electric kettle in room','Hair dryer in room','Room Service','Rooms with double bed available']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/v2/1427078/hotel/default/6/image/3d2c77e2_z.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1427078&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1427078',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Front Desk (24 Hours)','Fishing','With Elevator','Front Desk Safe','Conference Hall','Bar','Wheelchair Access','Multilingual Staff','Outdoor Swimming Pool','Reception Hall','Fitness Center','Laundry Facilities','Towel Replacement','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Snorkeling','No Smoking In Public Areas','Computer','Terrace','Restaurant','Bedding Change: 1 Guest 1 Change','Barrier-Free Passage','Garden','Outdoor Furniture','Beach/Pool Parasol','The Lobby Tv','Paid Airport Pick-Up','Lounge Chair','Surfing Lessons','Swimming Pool','Parking Area','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-1427078',
  'dida',
  '1427078',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 1427078, "name": "Holiday Inn Bali Sanur by IHG", "areaCode": "ID", "starRating": 4, "priceLowest": 77.13, "currency": "USD", "latitude": -8.705688, "longitude": 115.260713, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  now(),
  now()
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;