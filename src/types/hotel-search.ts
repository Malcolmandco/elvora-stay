export interface HotelImage {
  url: string;
  typeCode: string;
  typeDescription?: string;
}

export interface HotelCancellationPolicy {
  amount: number;
  currency: string;
  fromDate: string;
  amountType: string;
}

export interface HotelRoomRate {
  rateKey: string;
  rateType: 'BOOKABLE' | 'RECHECK';
  paymentType: 'AT_WEB' | 'AT_HOTEL';
  boardName: string;
  boardCode: string;
  price: number;
  netPrice: number;
  currency: string;
  cancellationPolicies: HotelCancellationPolicy[];
  rooms: number;
  adults: number;
  children: number;
}

export interface HotelRoom {
  roomName: string;
  roomCode: string;
  rates: HotelRoomRate[];
}

export interface HotelSearchResult {
  supplier: 'hotelbeds' | 'duffel';
  supplierHotelCode: string;
  hotelName: string;
  category: string;
  categoryCode: string;
  destinationCode: string;
  destinationName: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  images: HotelImage[];
  description: string;
  amenities: string[];
  roomName: string;
  boardName: string;
  boardCode: string;
  rateKey: string;
  rateType: 'BOOKABLE' | 'RECHECK';
  paymentType: 'AT_WEB' | 'AT_HOTEL';
  price: number;
  netPrice: number;
  currency: string;
  cancellationPolicies: HotelCancellationPolicy[];
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
}

export interface HotelSearchRequest {
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childrenAges: number[];
}

export interface HotelSearchResponse {
  results: HotelSearchResult[];
  total: number;
  currency: string;
  error?: string;
}

export interface DestinationSuggestion {
  type: 'destination';
  name: string;
  country: string;
  countryCode: string;
  destinationCode: string;
  displayName: string;
}

export interface DestinationSearchResponse {
  suggestions: DestinationSuggestion[];
  error?: string;
}

export interface CheckRateResponse {
  valid: boolean;
  hotel?: Record<string, unknown>;
  rooms?: Array<Record<string, unknown>>;
  error?: string;
}
