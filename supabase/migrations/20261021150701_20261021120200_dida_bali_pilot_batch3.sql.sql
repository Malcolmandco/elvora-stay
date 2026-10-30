/*
# DIDA Bali Pilot Import — Phase 7 (Batch 3: hotels 7-8 of 10)

Imports 2 more DIDA hotels for the Bali pilot:
- dida-57875: MarsCity Hotel (3 stars, $14.82/night)
- dida-152719: Maya Sanur Resort & Spa (5 stars, $183.70/night)

Same safety constraints: is_active=false, booking_enabled=false,
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
  'dida-57875',
  'MarsCity Hotel',
  'dida-57875-marscity-hotel',
  NULL,
  'MarsCity Hotel in Denpasar, located in the Sidakarya area. Features include restaurant, outdoor pool, and fitness facilities.',
  '<p>MarsCity Hotel in Denpasar, located in the Sidakarya area. Features include restaurant, outdoor pool, and fitness facilities.</p>',
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
  'Jl. Kerta Dalem, Sidakarya',
  -8.69811,
  115.234057,
  14.82,
  'USD',
  3,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Multilingual Staff','Banquet Hall','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Public Swimming Pool','Room Wifi (Free)','Travel Ticket Office','Gift Shop','Designated Smoking Area','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach/Pool Parasol','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Snack Bar','Parking Area','Breakfast Provided']::text[],
  ARRAY['Independent hotel','Banquet hall','Children''s pool','Kids'' Facilities','Outdoor Pool','Gym','Hair dryer in room','Room Service']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/57875/Featured%20Image/67a1faeb_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=57875&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '57875',
  'dida',
  now(),
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Multilingual Staff','Banquet Hall','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Public Swimming Pool','Room Wifi (Free)','Travel Ticket Office','Gift Shop','Designated Smoking Area','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach/Pool Parasol','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Snack Bar','Parking Area','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-57875',
  'dida',
  '57875',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 57875, "name": "MarsCity Hotel", "areaCode": "ID", "starRating": 3, "priceLowest": 14.82, "currency": "USD", "latitude": -8.69811, "longitude": 115.234057, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
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
  'dida-152719',
  'Maya Sanur Resort & Spa',
  'dida-152719-maya-sanur-resort-spa',
  NULL,
  'Maya Sanur Resort & Spa in Denpasar (Sanur), a luxury resort near Sanur Beach. Features full-service spa, outdoor pool, beach access, and fine dining.',
  '<p>Maya Sanur Resort &amp; Spa in Denpasar (Sanur), a luxury resort near Sanur Beach. Features full-service spa, outdoor pool, beach access, and fine dining.</p>',
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
  'Jl. Danau Tamblingan No. 89M Batujimbar',
  -8.697549,
  115.26352,
  183.7,
  'USD',
  5,
  ARRAY['Laundry Service','Car Rental','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Business Center','Conference Hall','Café','Bar','Wheelchair Access','Multilingual Staff','Bicycle Rental Service','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Beach Sun Umbrella','Child Care (Fee Based)','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Gift Shop','Designated Smoking Area','Terrace','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach/Pool Parasol','Poolside Bar','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Breakfast Provided']::text[],
  ARRAY['Independent hotel','Public Beach','Banquet hall','Children’s pool','Kids'' Facilities','Cots/Cribs Available','Outdoor Pool','Gym','Free Wi-Fi','Slippers provided in room','Electric kettle in room','Hair dryer in room','Bicycle Rental','Room Service','Rooms with double bed available','Spa']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/152719/Featured%20Image/9725575_161_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=152719&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '152719',
  'dida',
  now(),
  ARRAY['Laundry Service','Car Rental','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Business Center','Conference Hall','Café','Bar','Wheelchair Access','Multilingual Staff','Bicycle Rental Service','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Beach Sun Umbrella','Child Care (Fee Based)','Room Wifi (Free)','Full-Time Doorman','Travel Ticket Office','Gift Shop','Designated Smoking Area','Terrace','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Beach/Pool Parasol','Poolside Bar','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-152719',
  'dida',
  '152719',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 152719, "name": "Maya Sanur Resort & Spa", "areaCode": "ID", "starRating": 5, "priceLowest": 183.7, "currency": "USD", "latitude": -8.697549, "longitude": 115.26352, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  now(),
  now()
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;