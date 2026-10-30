/*
# DIDA Bali Pilot Import — Phase 7 (Batch 2: hotels 5-6 of 10)

Imports 2 more DIDA hotels for the Bali pilot:
- dida-2547145: eL Hotel & Resort Bali Sanur (4 stars, $118.43/night)
- dida-57862: Hotel Neo Denpasar by ASTON (3 stars, $24.77/night)

Same safety constraints as batch 1: is_active=false, booking_enabled=false,
property_status='catalog'. ON CONFLICT DO NOTHING for idempotency.
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
  'dida-2547145',
  'eL Hotel & Resort Bali Sanur',
  'dida-2547145-el-hotel-resort-bali-sanur',
  NULL,
  'eL Hotel & Resort Bali Sanur in Denpasar (Sanur), within 15-minute drive of Sanur Beach and Waterbom Bali. Features 2 outdoor pools, 24-hour fitness center, bicycles to rent, and free valet parking.',
  '<p>eL Hotel &amp; Resort Bali Sanur in Denpasar (Sanur), within 15-minute drive of Sanur Beach and Waterbom Bali. Features 2 outdoor pools, 24-hour fitness center, bicycles to rent, and free valet parking.</p>',
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
  'Jl. Danau Tamblingan No.49,, Sanur, Denpasar Selatan,',
  -8.691904,
  115.264205,
  118.43,
  'USD',
  4,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Dancing Hall','Front Desk Safe','Conference Hall','Café','Bar','Wheelchair Access','Multilingual Staff','Bicycle Rental Service','Wedding Service','Outdoor Swimming Pool','Fitness Center','Entrance Ramp','Public Swimming Pool','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Designated Smoking Area','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach Bar','Wheelchair Accessible Restroom','Stair Handrail','Provide Wheelchairs On Site','Snack Bar','Parking Area','Offering Proposal/Romantic Package','Breakfast Provided']::text[],
  ARRAY['Independent hotel']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/v2/2547145/hotel/default/6/image/0f05f3c3_z.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=2547145&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '2547145',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Dancing Hall','Front Desk Safe','Conference Hall','Café','Bar','Wheelchair Access','Multilingual Staff','Bicycle Rental Service','Wedding Service','Outdoor Swimming Pool','Fitness Center','Entrance Ramp','Public Swimming Pool','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Designated Smoking Area','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach Bar','Wheelchair Accessible Restroom','Stair Handrail','Provide Wheelchairs On Site','Snack Bar','Parking Area','Offering Proposal/Romantic Package','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-2547145',
  'dida',
  '2547145',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 2547145, "name": "eL Hotel & Resort Bali Sanur", "areaCode": "ID", "starRating": 4, "priceLowest": 118.43, "currency": "USD", "latitude": -8.691904, "longitude": 115.264205, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
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
  'dida-57862',
  'Hotel Neo Denpasar by ASTON',
  'dida-57862-hotel-neo-denpasar-by-aston',
  'Hotel NEO',
  'Hotel Neo Denpasar by ASTON - centrally located in Denpasar, within 10-minute drive of Eat Street and Berawa Beach. Features outdoor pool, spa, and free valet parking.',
  '<p>Hotel Neo Denpasar by ASTON - centrally located in Denpasar, within 10-minute drive of Eat Street and Berawa Beach. Features outdoor pool, spa, and free valet parking.</p>',
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
  'Jalan Gatot Subroto Barat',
  -8.636382,
  115.192865,
  24.77,
  'USD',
  3,
  ARRAY['Laundry Service','Concierge Service','Express Check-In/Check-Out','Valet Parking','Front Desk (24 Hours)','Spa','With Elevator','Business Center','Conference Hall','Atm','Café','Bar','Free Newspaper In Lobby','Wheelchair Access','Banquet Hall','Outdoor Swimming Pool','Fitness Center','Laundry Facilities','Public Swimming Pool','Room Wifi (Free)','No Smoking In Public Areas','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','The Lobby Tv','Paid Airport Pick-Up','Lounge Chair','Wheelchair Accessible Restroom','Parking Area']::text[],
  ARRAY['International Chain','Independent hotel','Business center','Banquet hall','Children’s pool','Kids'' Facilities','Outdoor Pool','Gym','Slippers provided in room','Electric kettle in room','Hair dryer in room','Room Service','Spa']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/57862/Featured%20Image/8704730_13_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=57862&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '57862',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Express Check-In/Check-Out','Valet Parking','Front Desk (24 Hours)','Spa','With Elevator','Business Center','Conference Hall','Atm','Café','Bar','Free Newspaper In Lobby','Wheelchair Access','Banquet Hall','Outdoor Swimming Pool','Fitness Center','Laundry Facilities','Public Swimming Pool','Room Wifi (Free)','No Smoking In Public Areas','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','The Lobby Tv','Paid Airport Pick-Up','Lounge Chair','Wheelchair Accessible Restroom','Parking Area']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-57862',
  'dida',
  '57862',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 57862, "name": "Hotel Neo Denpasar by ASTON", "areaCode": "ID", "starRating": 3, "priceLowest": 24.77, "currency": "USD", "latitude": -8.636382, "longitude": 115.192865, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  now(),
  now()
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;