/*
# DIDA Price Provenance Repair

## Purpose
The original Phase 7 import stored priceLowest and currency in supplier_payload
but omitted the search check-in date, stay length, and retrieval timestamp.
This migration repairs that gap for all 10 DIDA pilot properties by adding
the missing provenance fields to the supplier_payload JSONB.

## Data Recovery Method
- checkInDate: Recovered from source_url query parameter (all 10 URLs contain
  checkInDate=2026-11-15). This is the actual search check-in date used by
  the DIDA API query.
- stayNights: Recovered from source_url (checkOutDate=2026-11-17 minus
  checkInDate=2026-11-15 = 2 nights). This matches the Phase 7 migration
  comments documenting "2 nights".
- retrievedAt: Set to the existing first_seen_at timestamp, which records
  when the supplier_property_keys row was created (i.e., when the import
  ran). This is the actual import timestamp, not an invented date.
- provenanceStatus: Set to 'recovered_from_source_url' to document that the
  provenance was not originally captured in the payload and was recovered
  after the fact from the source_url field.
- priceType: Set to 'indicative_search_result' to distinguish from
  guaranteed/bookable rates.

## Safety
- UPDATE only, no INSERT or DELETE.
- Only touches supplier_property_keys rows where supplier_name = 'dida'.
- Uses jsonb_set to add nested fields without overwriting existing keys.
- Does not modify properties table, bookings, rooms, or any other table.
- Does not activate properties or change booking_enabled.
*/

UPDATE supplier_property_keys
SET supplier_payload = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              supplier_payload,
              '{checkInDate}', '"2026-11-15"'::jsonb, true
            ),
            '{stayNights}', '2'::jsonb, true
          ),
          '{retrievedAt}', to_jsonb(first_seen_at), true
        ),
        '{provenanceStatus}', '"recovered_from_source_url"'::jsonb, true
      ),
      '{priceType}', '"indicative_search_result"'::jsonb, true
    ),
    last_seen_at = now()
WHERE supplier_name = 'dida';
