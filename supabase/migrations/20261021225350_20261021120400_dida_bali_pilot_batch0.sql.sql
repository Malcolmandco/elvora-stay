/*
# DIDA Bali Pilot — Batch 0: Retroactive Migration for execute_sql Inserts

## Purpose
Two DIDA properties (dida-57700 and dida-62214) were inserted via execute_sql
during the first batch of the Phase 7 pilot, before the import switched to
apply_migration for batches 1-4. This migration retroactively captures those
two records in a permanent migration file so that a full database rebuild from
migrations alone reproduces all 10 DIDA pilot properties.

## Safety
- ON CONFLICT (id) DO NOTHING on properties — if the records already exist
  (as they do in the current environment), this migration is a no-op.
- ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING on
  supplier_property_keys — same idempotent guarantee.
- No records are deleted, updated, or overwritten. Existing data is preserved
  exactly as-is.
- All safety settings maintained: is_active=false, booking_enabled=false,
  property_status='catalog', supplier_status='not_connected',
  verification_status='needs_review'.

## Data Source
DIDA MCP searchHotels API queried for "Denpasar Indonesia" with
checkInDate 2026-11-15, 2 nights, 2 adults. Data verified against live
database records on 2026-10-21.
*/

-- ─── Hotel 1: Aston Denpasar Hotel & Convention Center ────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-57700',
  'Aston Denpasar Hotel & Convention Center',
  'dida-57700-aston-denpasar-hotel-convention-center',
  'Aston Archipelago',
  'Property Location With a stay at Aston Denpasar Hotel & Convention Center, you''ll be centrally located in Denpasar, within a 15-minute drive of Seminyak Square and Kuta Beach. This family-friendly hotel is 6.1 mi (9.9 km) from Seminyak Beach and 7.1 mi (11.4 km) from Sanur Beach. Area Attraction Distances are displayed to the nearest 0.1 mile and kilometer. Gatot Subroto - 0.1 km / 0.1 mi Badung Market - 2.5 km / 1.5 mi Bali Museum - 3.3 km / 2 mi Consulate General Republic Democratic Timor Leste - 7 km / 4.4 mi Sanur Port - 9.1 km / 5.6 mi Sanur Marina - 9.3 km / 5.8 mi Finns Tennis - 9.4 km / 5.8 mi Canggu Square - 9.4 km / 5.9 mi TAKSU Bali Gallery - 9.5 km / 5.9 mi Sunset Point Shopping Centre - 9.6 km / 6 mi Seminyak Village - 9.7 km / 6 mi Eat Street - 9.7 km / 6 mi Seminyak Square - 9.8 km / 6.1 mi Seminyak Beach - 9.9 km / 6.1 mi Petitenget Temple - 10 km / 6.2 mi The preferred airport for Aston Denpasar Hotel & Convention Center is Ngurah Rai Intl. Airport (DPS) - 17.7 km / 11 mi Rec, Spa, Premium Amenities Dip into one of the 3 outdoor pools or enjoy other recreational amenities, which include a fitness center. Additional amenities at this hotel include complimentary wireless internet access, concierge services, and free babysitting. Guests can catch a ride to nearby destinations on the area shuttle (surcharge). Business, Other Amenities Featured amenities include a business center, complimentary newspapers in the lobby, and dry cleaning/laundry services. This hotel has 12 meeting rooms available for events. A roundtrip airport shuttle is provided for a surcharge (available 24 hours), and free valet parking is available onsite.',
  '<p><b>Property Location</b><br/>With a stay at Aston Denpasar Hotel & Convention Center, you''ll be centrally located in Denpasar, within a 15-minute drive of Seminyak Square and Kuta Beach.  This family-friendly hotel is 6.1 mi (9.9 km) from Seminyak Beach and 7.1 mi (11.4 km) from Sanur Beach.</p><p><b>Area Attraction</b><br/>Distances are displayed to the nearest 0.1 mile and kilometer. <br /> <p>Gatot Subroto - 0.1 km / 0.1 mi <br /> Badung Market - 2.5 km / 1.5 mi <br /> Bali Museum - 3.3 km / 2 mi <br /> Consulate General Republic Democratic Timor Leste - 7 km / 4.4 mi <br /> Sanur Port - 9.1 km / 5.6 mi <br /> Sanur Marina - 9.3 km / 5.8 mi <br /> Finns Tennis - 9.4 km / 5.8 mi <br /> Canggu Square - 9.4 km / 5.9 mi <br /> TAKSU Bali Gallery - 9.5 km / 5.9 mi <br /> Sunset Point Shopping Centre - 9.6 km / 6 mi <br /> Seminyak Village - 9.7 km / 6 mi <br /> Eat Street - 9.7 km / 6 mi <br /> Seminyak Square - 9.8 km / 6.1 mi <br /> Seminyak Beach - 9.9 km / 6.1 mi <br /> Petitenget Temple - 10 km / 6.2 mi <br /> </p><p>The preferred airport for Aston Denpasar Hotel & Convention Center is Ngurah Rai Intl. Airport (DPS) - 17.7 km / 11 mi </p></p><p><b>Rec, Spa, Premium Amenities</b><br/>Dip into one of the 3 outdoor pools or enjoy other recreational amenities, which include a fitness center. Additional amenities at this hotel include complimentary wireless internet access, concierge services, and free babysitting. Guests can catch a ride to nearby destinations on the area shuttle (surcharge).</p><p><b>Business, Other Amenities</b><br/>Featured amenities include a business center, complimentary newspapers in the lobby, and dry cleaning/laundry services. This hotel has 12 meeting rooms available for events. A roundtrip airport shuttle is provided for a surcharge (available 24 hours), and free valet parking is available onsite.</p>',
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
  'Jl. Gatot Subroto, Barat No. 283',
  -8.639268,
  115.206164,
  32.62,
  'USD',
  4,
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Business Center','Conference Hall','Free Newspaper In Lobby','Wheelchair Access','Barbeque','Banquet Hall','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Room Wifi (Free)','Travel Ticket Office','No Smoking In Public Areas','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Paid Airport Pick-Up','Parking Area']::text[],
  ARRAY['International Chain','Independent hotel','Business center','Banquet hall','Children’s pool','Kids'' Facilities','Cots/Cribs Available','Outdoor Pool','Gym','Slippers provided in room','Hair dryer in room','Room Service','Family Rooms','Spa']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/57700/413b8aba_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=57700&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '57700',
  'dida',
  '2026-10-21 15:04:58.8486+00',
  ARRAY['Laundry Service','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','Spa','Dancing Hall','With Elevator','Front Desk Safe','Business Center','Conference Hall','Free Newspaper In Lobby','Wheelchair Access','Barbeque','Banquet Hall','Child Care','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Room Wifi (Free)','Travel Ticket Office','No Smoking In Public Areas','Restaurant','Barrier-Free Passage','Garden','Children''s Pool','Paid Airport Pick-Up','Parking Area']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-57700',
  'dida',
  '57700',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 57700, "name": "Aston Denpasar Hotel & Convention Center", "areaCode": "ID", "starRating": 4, "priceLowest": 32.62, "currency": "USD", "latitude": -8.639268, "longitude": 115.206164, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  '2026-10-21 15:04:58.8486+00',
  '2026-10-21 15:04:58.8486+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;

-- ─── Hotel 2: Sanur Resort Watujimbar ─────────────────────────────────────────

INSERT INTO properties (
  id, name, slug, brand, description, long_description, property_type,
  property_status, supplier_status, verification_status, booking_enabled,
  destination_id, destination_slug, destination_name, country, city, address,
  latitude, longitude, price_per_night, currency, rating,
  amenities, tags, is_active, images, source_url,
  supplier_hotel_code, supplier_name, last_synced_at,
  supplier_amenities, amenities_override, editorial_override
) VALUES (
  'dida-62214',
  'Sanur Resort Watujimbar',
  'dida-62214-sanur-resort-watujimbar',
  NULL,
  'Sanur Resort Watujimbar - Denpasar Bali',
  '<p>Sanur Resort Watujimbar - Denpasar Bali</p>',
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
  'Jalan Danau Tamblingan No.99A',
  -8.691458,
  115.262529,
  57.63,
  'USD',
  4,
  ARRAY['Laundry Service','Car Rental','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Banquet Hall','Bicycle Rental Service','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Beach Sun Umbrella','Child Care (Fee Based)','Room Wifi (Free)','Travel Ticket Office','Gift Shop','Designated Smoking Area','Terrace','Restaurant','Airport Shuttle','Garden','Children''s Pool','Beach/Pool Parasol','Poolside Bar','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Golf Course Landscape','Snack Bar','Full Service Spa','Parking Area','Beach Club','Breakfast Provided']::text[],
  ARRAY['International Chain','Independent hotel','Public Beach','Banquet hall','Children’s pool','Kids'' Facilities','Outdoor Pool','Gym','Free Wi-Fi','Slippers provided in room','Electric kettle in room','Hair dryer in room','Bicycle Rental','Room Service','Rooms with double bed available','Twin rooms available','Spa']::text[],
  false,
  '[{"url": "https://image-cdn.rollinggo.cn/Image/ID/62214/Featured%20Image/7713392_85_b.jpg", "source": "dida", "rights_confirmed": true}]'::jsonb,
  'https://rollinggo.ai/pages/hotel/detail/index?id=62214&checkInDate=2026-11-15&checkOutDate=2026-11-17&roomCount=1&adultCount=2&childCount=0&childAgeDetails=&utm_source=0A0PKI',
  '62214',
  'dida',
  '2026-10-21 15:04:58.8486+00',
  ARRAY['Laundry Service','Car Rental','Concierge Service','Luggage Storage','Valet Parking','Front Desk (24 Hours)','With Elevator','Front Desk Safe','Conference Hall','Café','Bar','Banquet Hall','Bicycle Rental Service','Wedding Service','Outdoor Swimming Pool','Fitness Facilities','Laundry Facilities','Beach Sun Umbrella','Child Care (Fee Based)','Room Wifi (Free)','Travel Ticket Office','Gift Shop','Designated Smoking Area','Terrace','Restaurant','Airport Shuttle','Garden','Children''s Pool','Beach/Pool Parasol','Poolside Bar','Beach Towels','Paid Airport Pick-Up','Lounge Chair','Golf Course Landscape','Snack Bar','Full Service Spa','Parking Area','Beach Club','Breakfast Provided']::text[],
  false,
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_property_keys (
  property_id, supplier_name, supplier_hotel_code, supplier_destination_id,
  supplier_place, supplier_place_type, supplier_payload, first_seen_at, last_seen_at
) VALUES (
  'dida-62214',
  'dida',
  '62214',
  'dest-bali',
  'Denpasar Indonesia',
  'city',
  '{"hotelId": 62214, "name": "Sanur Resort Watujimbar", "areaCode": "ID", "starRating": 4, "priceLowest": 57.63, "currency": "USD", "latitude": -8.691458, "longitude": 115.262529, "source": "dida_search_pilot", "importPhase": "phase7"}'::jsonb,
  '2026-10-21 15:04:58.8486+00',
  '2026-10-21 15:04:58.8486+00'
) ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING;
