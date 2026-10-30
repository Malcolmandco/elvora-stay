import { useEffect, useState } from 'react';
import type { Destination, Property, PropertyImage } from '@/types';
import { supabase } from '@/lib/supabase';

interface DestinationRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  country_code: string | null;
  region: string | null;
  continent: string | null;
  parent_destination_id: string | null;
  short_description: string;
  long_description: string;
  hero_image: string;
  hero_image_alt: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_popular: boolean;
  is_new: boolean;
  stay_count: number;
  display_order: number;
  destination_type: string | null;
  tags: string[] | null;
  // Editorial
  tagline: string | null;
  editorial_title: string | null;
  editorial_description: string | null;
  travel_story: string | null;
  best_time_to_visit: string | null;
  why_visit: string | null;
  highlights: string[] | null;
  experiences: string[] | null;
  local_tips: string[] | null;
  // Media
  cover_image: string | null;
  thumbnail_image: string | null;
  og_image: string | null;
  // SEO
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  // Status
  status: string | null;
  created_at: string;
  updated_at: string;
}

function mapDestination(row: DestinationRow): Destination {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    countryCode: row.country_code ?? undefined,
    region: row.region ?? undefined,
    continent: row.continent ?? undefined,
    parentDestinationId: row.parent_destination_id ?? undefined,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    image: row.hero_image,
    imageAlt: row.hero_image_alt,
    latitude: row.latitude,
    longitude: row.longitude,
    stayCount: row.stay_count ?? 0,
    popular: row.is_popular,
    isActive: row.is_active,
    featured: row.is_featured,
    isNew: row.is_new ?? false,
    displayOrder: row.display_order ?? 0,
    destinationType: row.destination_type ?? undefined,
    tags: row.tags ?? [],
    tagline: row.tagline ?? undefined,
    editorialTitle: row.editorial_title ?? undefined,
    editorialDescription: row.editorial_description ?? undefined,
    travelStory: row.travel_story ?? undefined,
    bestTimeToVisit: row.best_time_to_visit ?? undefined,
    whyVisit: row.why_visit ?? undefined,
    highlights: row.highlights ?? [],
    experiences: row.experiences ?? [],
    localTips: row.local_tips ?? [],
    coverImage: row.cover_image ?? undefined,
    thumbnailImage: row.thumbnail_image ?? undefined,
    ogImage: row.og_image ?? undefined,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    seoKeywords: row.seo_keywords ?? [],
    ogTitle: row.og_title ?? undefined,
    ogDescription: row.og_description ?? undefined,
    status: (row.status as Destination['status']) ?? 'published',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/10490921/pexels-photo-10490921.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop';

function safeImage(url: string | null | undefined): string {
  return url && url.length > 0 ? url : FALLBACK_IMAGE;
}

export function mapDestinationSafe(row: Partial<DestinationRow>): Destination {
  return {
    id: row.id ?? '',
    name: row.name ?? 'Unknown',
    slug: row.slug ?? '',
    country: row.country ?? '',
    countryCode: row.country_code ?? undefined,
    region: row.region ?? undefined,
    continent: row.continent ?? undefined,
    parentDestinationId: row.parent_destination_id ?? undefined,
    shortDescription: row.short_description ?? '',
    longDescription: row.long_description ?? '',
    image: safeImage(row.hero_image),
    imageAlt: row.hero_image_alt ?? row.name ?? 'Destination',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    stayCount: row.stay_count ?? 0,
    popular: row.is_popular ?? false,
    isActive: row.is_active ?? true,
    featured: row.is_featured ?? false,
    isNew: row.is_new ?? false,
    displayOrder: row.display_order ?? 0,
    destinationType: row.destination_type ?? undefined,
    tags: row.tags ?? [],
    tagline: row.tagline ?? undefined,
    editorialTitle: row.editorial_title ?? undefined,
    editorialDescription: row.editorial_description ?? undefined,
    travelStory: row.travel_story ?? undefined,
    bestTimeToVisit: row.best_time_to_visit ?? undefined,
    whyVisit: row.why_visit ?? undefined,
    highlights: row.highlights ?? [],
    experiences: row.experiences ?? [],
    localTips: row.local_tips ?? [],
    coverImage: row.cover_image ?? undefined,
    thumbnailImage: row.thumbnail_image ?? undefined,
    ogImage: row.og_image ?? undefined,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    seoKeywords: row.seo_keywords ?? [],
    ogTitle: row.og_title ?? undefined,
    ogDescription: row.og_description ?? undefined,
    status: (row.status as Destination['status']) ?? 'published',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('name');

        if (cancelled) return;

        if (error) {
          throw error;
        }
        setError(null);
        setDestinations((data as DestinationRow[]).map(mapDestination));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load destinations');
        setDestinations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { destinations, loading, error };
}

export function useDestinationBySlug(slug: string | undefined) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setDestination(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setDestination(null);
      } else if (data) {
        setError(null);
        setDestination(mapDestination(data as DestinationRow));
      } else {
        setError(null);
        setDestination(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { destination, loading, error };
}

interface PropertyRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  long_description: string;
  property_type: string;
  property_status: string;
  supplier_status: string;
  verification_status: string;
  booking_enabled: boolean;
  price_display_mode: string;
  destination_id: string | null;
  destination_slug: string | null;
  destination_name: string | null;
  country: string;
  city: string;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number | null;
  currency: string;
  rating: number | null;
  review_count: number | null;
  max_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: string[];
  supplier_amenities: string[] | null;
  amenities_override: boolean | null;
  elvora_amenities: string[] | null;
  tags: string[];
  collections: string[];
  featured: boolean;
  is_active: boolean;
  images: PropertyImage[];
  video: string | null;
  house_rules: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    damagePolicy: string;
  };
  source_url: string | null;
  website: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand ?? undefined,
    description: row.description,
    longDescription: row.long_description,
    propertyType: row.property_type as Property['propertyType'],
    propertyStatus: row.property_status as Property['propertyStatus'],
    supplierStatus: row.supplier_status as Property['supplierStatus'],
    verificationStatus: row.verification_status as Property['verificationStatus'],
    bookingEnabled: row.booking_enabled,
    priceDisplayMode: row.price_display_mode as Property['priceDisplayMode'],
    destinationId: row.destination_id ?? undefined,
    destinationSlug: row.destination_slug ?? '',
    destinationName: row.destination_name ?? '',
    country: row.country,
    city: row.city,
    region: row.region ?? undefined,
    address: row.address ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
    pricePerNight: row.price_per_night,
    currency: row.currency,
    rating: row.rating,
    reviewCount: row.review_count,
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    amenities: (row.amenities_override ? (row.elvora_amenities ?? []) : (row.supplier_amenities ?? row.amenities ?? [])) as Property['amenities'],
    tags: row.tags as Property['tags'],
    collections: row.collections as Property['collections'],
    featured: row.featured,
    isActive: row.is_active,
    images: row.images ?? [],
    video: row.video ?? undefined,
    houseRules: row.house_rules ?? [],
    policies: row.policies ?? { checkIn: '', checkOut: '', cancellation: '', damagePolicy: '' },
    sourceUrl: row.source_url ?? undefined,
    website: row.website ?? undefined,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePropertiesByDestinationSlug(slug: string | undefined) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setProperties([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: dest } = await supabase
        .from('destinations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (cancelled) return;

      if (!dest) {
        setProperties([]);
        setLoading(false);
        return;
      }

      const { data: children } = await supabase
        .from('destinations')
        .select('id')
        .eq('parent_destination_id', dest.id);

      if (cancelled) return;

      const allIds = [dest.id, ...(children ?? []).map((c) => c.id)];

      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .in('destination_id', allIds)
        .eq('is_active', true)
        .order('featured', { ascending: false });

      if (cancelled) return;

      if (propError) {
        setError(propError.message);
        setProperties([]);
      } else {
        setError(null);
        setProperties((propData as PropertyRow[]).map(mapProperty));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { properties, loading, error };
}

export function useOtherDestinations(currentSlug: string | undefined, limit = 4) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from('destinations')
        .select('*')
        .neq('slug', currentSlug ?? '')
        .limit(limit * 3);

      const { data, error } = await query;
      if (cancelled) return;

      if (!error && data) {
        const mapped = (data as DestinationRow[])
          .map(mapDestination)
          .filter((d) => d.isActive !== false)
          .slice(0, limit);
        setDestinations(mapped);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSlug, limit]);

  return { destinations, loading };
}
