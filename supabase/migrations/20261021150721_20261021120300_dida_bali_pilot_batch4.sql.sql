/*
# DIDA Bali Pilot Import — Phase 7 (Batch 4: hotels 9-10 of 10)

Imports the final 2 DIDA hotels for the Bali pilot:
- dida-1554833: Bestah Coliving (3.5 stars, $19.17/night)
- dida-56161: City of Aventus Hotel - Denpasar (4 stars, $21.28/night)

Completes the 10-hotel pilot. Same safety constraints: is_active=false,
booking_enabled=false, property_status='catalog'. ON CONFLICT DO NOTHING.
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
  'dida-1554833',
  'Bestah Coliving',
  'dida-1554833-bestah-coliving',
  'Zuzu HS',
  'Bestah Coliving in Denpasar, a coliving space in the Renon area. Features include shared kitchen, coworking space, and communal areas.',
  '<p>Bestah Coliving in Denpasar, a coliving space in the Renon area. Features include shared kitchen, coworking space, and communal areas.</p>',
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
  'Jl. Tukad Yeh Sungi I, Renon, Denpasar, Selatan',
  -8.678085,
  115.236473,
  19.17,
  'USD',
  3.5,
  ARRAY['Laundry Service','Luggage Storage','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Café','Bar','Wheelchair Access','Bicycle Rental Service','Outdoor Swimming Pool','Laundry Facilities','Room Wifi (Free)','Designated Smoking Area','Restaurant','Parking Area']::text[],
  ARRAY['Independent hotel','Outdoor Pool','Free Wi-Fi','Hair dryer in room']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/6/Image/1554833/a25c2a72.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=1554833&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '1554833',
  'dida',
  now(),
  ARRAY['Laundry Service','Luggage Storage','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Café','Bar','Wheelchair Access','Bicycle Rental Service','Outdoor Swimming Pool','Laundry Facilities','Room Wifi (Free)','Designated Smoking Area','Restaurant','Parking Area']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-1554833',
  'dida',
  '1554833',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 1554833, "name": "Bestah Coliving", "areaCode": "ID", "starRating": 3.5, "priceLowest": 19.17, "currency": "USD", "latitude": -8.678085, "longitude": 115.236473, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
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
  'dida-56161',
  'City of Aventus Hotel - Denpasar',
  'dida-56161-city-of-aventus-hotel-denpasar',
  NULL,
  'City of Aventus Hotel in Denpasar, centrally located on Teuku Umar street. Features include outdoor pool, restaurant, and modern accommodations.',
  '<p>City of Aventus Hotel in Denpasar, centrally located on Teuku Umar street. Features include outdoor pool, restaurant, and modern accommodations.</p>',
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
  'Jl. Teuku Umar No.74, Denpasar Barat',
  -8.679848,
  115.203662,
  21.28,
  'USD',
  4,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Wheelchair Access','Outdoor Swimming Pool','Fitness Facilities','Room Wifi (Free)','Travel Ticket Office','Restaurant','Barrier-Free Passage','Garden']::text[],
  ARRAY['Independent hotel','Outdoor Pool','Free Wi-Fi','Hair dryer in room','Room Service','Family Rooms']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/v2/56161/hotel/default/6/image/e3237597_z.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=56161&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '56161',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Wheelchair Access','Outdoor Swimming Pool','Fitness Facilities','Room Wifi (Free)','Travel Ticket Office','Restaurant','Barrier-Free Passage','Garden']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-56161',
  'dida',
  '56161',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 56161, "name": "City of Aventus Hotel - Denpasar", "areaCode": "ID", "starRating": 4, "priceLowest": 21.28, "currency": "USD", "latitude": -8.679848, "longitude": 115.203662, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  now(),
  now()
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;