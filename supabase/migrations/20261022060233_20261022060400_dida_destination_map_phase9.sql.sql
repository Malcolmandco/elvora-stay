/*
# DIDA Destination Map — Phase 9

Populates dida_destination_map with the verified search places and
geographic validation bounds for the 5 validated destinations.
All entries use the validated search places from Phase 5A.
Geographic bounds are the same ones used for validation in Phase 5A.
*/

INSERT INTO dida_destination_map (
  destination_id, dida_place, dida_place_type,
  verified_country_code, verified_lat_min, verified_lat_max,
  verified_lon_min, verified_lon_max,
  verification_status, last_searched_at, last_result_count
) VALUES
  ('dest-bali', 'Denpasar Indonesia', 'city', 'ID', -8.85, -8.06, 114.44, 115.71, 'verified', '2026-10-21', 10),
  ('dest-tokyo', 'Tokyo Japan', 'city', 'JP', 35.5, 35.8, 139.5, 139.9, 'verified', '2026-10-21', 10),
  ('dest-santorini', 'Santorini Greece', 'city', 'GR', 36.3, 36.5, 25.2, 25.6, 'verified', '2026-10-21', 6),
  ('dest-marrakech', 'Marrakech Morocco', 'city', 'MA', 31.5, 31.8, -8.1, -7.9, 'verified', '2026-10-21', 10),
  ('dest-sydney', 'Sydney Australia', 'city', 'AU', -34.0, -33.7, 151.1, 151.3, 'verified', '2026-10-21', 10)
ON CONFLICT (destination_id, dida_place, dida_place_type) DO NOTHING;
