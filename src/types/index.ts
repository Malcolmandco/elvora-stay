export type PropertyType =
  | 'Hotel'
  | 'Resort'
  | 'Villa'
  | 'Private Residence'
  | 'Apartment'
  | 'Boutique Hotel'
  | 'Lodge'
  | 'Cabin'
  | 'Safari Lodge'
  | 'Island Resort'
  | 'Beach Resort'
  | 'Mountain Resort'
  | 'Urban Hotel'
  | 'Wellness Retreat'
  | 'Luxury Estate';

export type PropertyStatus = 'catalog' | 'bookable' | 'coming_soon';

export type SupplierStatus = 'not_connected' | 'connected';

export type VerificationStatus = 'verified' | 'needs_review';

export type PriceDisplayMode = 'bookable' | 'check_availability' | 'hidden';

export type PropertyTag =
  | 'Luxury'
  | 'Beachfront'
  | 'Villa'
  | 'Resort'
  | 'Hotel'
  | 'Island'
  | 'Mountain'
  | 'City'
  | 'Featured'
  | 'New'
  | 'Popular'
  | 'Family'
  | 'Romantic'
  | 'Secluded'
  | 'Ocean View'
  | 'Oceanfront'
  | 'Infinity Pool'
  | 'Private Pool'
  | 'Waterfront'
  | 'Desert'
  | 'Coastal'
  | 'Nature'
  | 'Wellness'
  | 'Golf'
  | 'Design'
  | 'Urban'
  | 'Ski'
  | 'Winter'
  | 'Overwater'
  | 'Forest'
  | 'Safari'
  | 'Spa'
  | 'Hawaii'
  | 'California'
  | 'Miami'
  | 'New York'
  | 'Bali'
  | 'Maldives'
  | 'Bora Bora'
  | 'Dubai'
  | 'Greece'
  | 'Italy'
  | 'France'
  | 'Japan'
  | 'Kyoto'
  | 'Caribbean'
  | 'Mexico'
  | 'Africa'
  | 'Thailand'
  | 'Switzerland';

export type CollectionTag =
  | 'Beachfront'
  | 'Private Villas'
  | 'City Icons'
  | 'Secluded Retreats'
  | 'Mountain Escapes'
  | 'Island Getaways';

export type Amenity =
  | 'WiFi'
  | 'Pool'
  | 'Private Pool'
  | 'Infinity Pool'
  | 'Spa'
  | 'Gym'
  | 'Air Conditioning'
  | 'Kitchen'
  | 'Beach Access'
  | 'Ocean View'
  | 'Mountain View'
  | 'Concierge'
  | 'Chef'
  | 'Driver'
  | 'Housekeeping'
  | 'Parking'
  | 'Wine Cellar'
  | 'Home Theater'
  | 'Garden'
  | 'Terrace'
  | 'Hot Tub'
  | 'Sauna'
  | 'Fireplace'
  | 'Beachfront'
  | 'Waterfront'
  | 'Elevator'
  | 'Security'
  | 'Laundry'
  | 'Restaurant'
  | 'Bar'
  | 'Water Sports'
  | 'Diving'
  | 'Breakfast'
  | 'Golf'
  | 'Tennis'
  | 'Kids Club'
  | 'Business Center'
  | 'Airport Shuttle'
  | 'Pet Friendly'
  | 'Ski Access'
  | 'Helipad';

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
}

export interface AmenityInfo {
  name: Amenity;
  icon: string;
}

export interface Review {
  id: string;
  propertyId: string;
  guestName: string;
  guestInitials: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
}

export type LocationStatus = 'resolved' | 'needs_review';

export interface Property {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  description: string;
  longDescription: string;
  propertyType: PropertyType;
  propertyStatus: PropertyStatus;
  supplierStatus: SupplierStatus;
  verificationStatus: VerificationStatus;
  bookingEnabled: boolean;
  supplierName?: string;
  supplierPropertyId?: string;
  lastVerifiedAt?: string | null;
  sourceUrl?: string;
  website?: string;
  priceDisplayMode: PriceDisplayMode;
  destinationSlug: string;
  destinationName: string;
  destinationId?: string;
  country: string;
  city: string;
  region?: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationStatus?: LocationStatus;
  pricePerNight: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number | null;
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: Amenity[];
  tags: PropertyTag[];
  collections: CollectionTag[];
  featured: boolean;
  isActive: boolean;
  images: PropertyImage[];
  video?: string;
  houseRules: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    damagePolicy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode?: string;
  region?: string;
  continent?: string;
  parentDestinationId?: string;
  shortDescription: string;
  longDescription: string;
  image: string;
  imageAlt: string;
  stayCount: number;
  latitude: number | null;
  longitude: number | null;
  popular?: boolean;
  isActive?: boolean;
  // Editorial
  tagline?: string;
  editorialTitle?: string;
  editorialDescription?: string;
  travelStory?: string;
  bestTimeToVisit?: string;
  whyVisit?: string;
  highlights?: string[];
  experiences?: string[];
  localTips?: string[];
  // Media
  coverImage?: string;
  thumbnailImage?: string;
  ogImage?: string;
  // Classification
  destinationType?: string;
  tags?: string[];
  featured?: boolean;
  isNew?: boolean;
  displayOrder?: number;
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  // Status
  status?: 'published' | 'draft' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface Experience {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  imageAlt: string;
  duration: string;
  priceFrom: number;
  currency: string;
  category: string;
}

export interface Booking {
  id: string;
  reference: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pricePerNight: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  propertyId: string;
  customerId: string;
  createdAt: string;
}

export interface Availability {
  id: string;
  propertyId: string;
  date: string;
  isAvailable: boolean;
  priceOverride?: number;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  code: string;
  discountPercent: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}
