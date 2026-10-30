-- Enable booking for all Hotelbeds properties with valid supplier_hotel_code
-- These are the real stay inventory and should be bookable
UPDATE properties
SET booking_enabled = true,
    property_status = 'bookable'
WHERE supplier_name = 'hotelbeds'
  AND supplier_hotel_code IS NOT NULL;
