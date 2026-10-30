/*
# Replace Stripe-specific fields with provider-neutral payment fields

## Changes
- Rename `payment_intent_id` → `payment_reference` (stores any provider's transaction/reference ID)
- Add `payment_provider` (text, nullable — e.g. 'stripe', 'paypal', etc.)
- Add `payment_transaction_id` (text, nullable — provider transaction ID)
- Add `payment_amount` (numeric, nullable — amount charged by provider)
- Add `payment_currency` (text, nullable — currency of payment)
- Add `payment_metadata` (jsonb, default '{}' — provider-specific metadata)

## Safety
- Does NOT drop any booking data
- `payment_intent_id` values are preserved in `payment_reference`
- All new columns are nullable so existing rows are unaffected
*/

-- Add provider-neutral payment columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_transaction_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount numeric(12,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_currency text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_metadata jsonb DEFAULT '{}'::jsonb;

-- Migrate payment_intent_id data into payment_reference, then drop the Stripe column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference text;
UPDATE bookings SET payment_reference = payment_intent_id WHERE payment_intent_id IS NOT NULL AND payment_reference IS NULL;
ALTER TABLE bookings DROP COLUMN IF EXISTS payment_intent_id;

CREATE INDEX IF NOT EXISTS bookings_payment_reference_idx ON bookings(payment_reference);
CREATE INDEX IF NOT EXISTS bookings_payment_provider_idx ON bookings(payment_provider);