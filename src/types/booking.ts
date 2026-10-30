export type BookingStatus =
  | 'draft'
  | 'availability_checked'
  | 'payment_pending'
  | 'payment_processing'
  | 'payment_paid'
  | 'payment_failed'
  | 'supplier_booking_pending'
  | 'supplier_booking_failed'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface AvailableRoom {
  roomId: string;
  roomName: string;
  rateId: string;
  supplierOfferId: string;
  mealPlan: string;
  cancellationPolicy: string;
  maxGuests: number;
  bedType: string;
  currency: string;
  pricePerNight: number;
  subtotal: number;
  taxes: number;
  total: number;
  supplier: string;
  supplierPropertyId: string;
  priceTimestamp: string;
  adults?: number;
  children?: number;
  rooms?: number;
  boardCode?: string;
  rateType?: string;
  paymentType?: string;
  cancellationPolicies?: Array<{ amount: number; currency: string; fromDate: string; amountType: string }>;
  restrictions?: string[];
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'no_supplier' | 'supplier_not_configured' | 'supplier_error' | 'no_availability' | 'internal_error';
  message: string;
  rooms: AvailableRoom[];
  currency?: string;
}

export interface CatalogRoom {
  id: string;
  propertyId: string;
  supplierRoomCode: string;
  roomName: string;
  roomType: string;
  roomCharacteristic: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  facilities: string[];
  roomImage: string | null;
  pricePerNight: number;
  currency: string;
  priceSource: string;
  priceSyncedAt: string | null;
  displayOrder: number;
}

export interface SelectedRoom {
  roomId: string;
  roomName: string;
  rateId: string;
  supplierOfferId: string;
  supplier: string;
  supplierPropertyId: string;
  mealPlan: string;
  cancellationPolicy: string;
  currency: string;
  subtotal: number;
  taxes: number;
  total: number;
  priceTimestamp: string;
  roomSnapshot?: {
    roomId: string;
    supplierRoomCode: string;
    roomName: string;
    pricePerNight: number;
    currency: string;
  };
}

export interface BookingDraft {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  propertyImage: string;
  destinationName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  adults: number;
  children: number;
  rooms: number;
  selectedRoom: SelectedRoom | null;
}

export interface BookingRecord {
  id: string;
  reference: string;
  user_id: string;
  booking_type: string;
  property_id: string | null;
  property_name: string | null;
  property_image: string | null;
  destination_name: string | null;
  supplier: string | null;
  supplier_property_id: string | null;
  supplier_offer_id: string | null;
  supplier_booking_reference: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number;
  rooms: number;
  room_name: string | null;
  room_details: Record<string, unknown>;
  meal_plan: string | null;
  cancellation_policy: string | null;
  currency: string;
  subtotal: number;
  taxes: number;
  total: number;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_transaction_id: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_metadata: Record<string, unknown>;
  booking_status: BookingStatus;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  price_timestamp: string | null;
  created_at: string;
  updated_at: string;
}
