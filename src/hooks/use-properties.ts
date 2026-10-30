import { useEffect, useState, useRef, useCallback } from 'react';
import type { Property } from '@/types';
import { supabase } from '@/lib/supabase';

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
  tags: string[];
  collections: string[];
  featured: boolean;
  is_active: boolean;
  images: Property['images'];
  video: string | null;
  house_rules: string[];
  policies: Property['policies'];
  supplier_hotel_code: string | null;
  supplier_name: string | null;
  source_url: string | null;
  website: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
  elvora_name: string | null;
  elvora_short_description: string | null;
  elvora_description: string | null;
  elvora_editorial_title: string | null;
  elvora_editorial_subtitle: string | null;
  elvora_editorial_description: string | null;
  elvora_images: Property['images'] | null;
  elvora_tags: string[] | null;
  elvora_amenities: string[] | null;
  elvora_featured: boolean | null;
  elvora_popular: boolean | null;
  elvora_new: boolean | null;
  elvora_property_status: string | null;
  elvora_booking_enabled: boolean | null;
  elvora_is_active: boolean | null;
  elvora_price_display: number | null;
  elvora_currency: string | null;
  elvora_phone: string | null;
  elvora_email: string | null;
  elvora_website: string | null;
  elvora_neighborhood: string | null;
  elvora_primary_image_index: number | null;
  editorial_override: boolean;
}

function eff<T>(elvora: T | null | undefined, base: T): T {
  if (elvora !== null && elvora !== undefined) return elvora;
  return base;
}

function mapProperty(row: PropertyRow): Property {
  const effectiveImages = (row.elvora_images && row.elvora_images.length > 0)
    ? row.elvora_images
    : (row.images ?? []);
  const primaryIdx = row.elvora_primary_image_index ?? 0;
  const orderedImages = primaryIdx > 0 && primaryIdx < effectiveImages.length
    ? [effectiveImages[primaryIdx], ...effectiveImages.slice(0, primaryIdx), ...effectiveImages.slice(primaryIdx + 1)]
    : effectiveImages;

  return {
    id: row.id,
    name: eff(row.elvora_name, row.name),
    slug: row.slug,
    brand: row.brand ?? undefined,
    description: eff(row.elvora_short_description, row.description),
    longDescription: eff(row.elvora_description, row.long_description),
    propertyType: row.property_type as Property['propertyType'],
    propertyStatus: eff(row.elvora_property_status, row.property_status) as Property['propertyStatus'],
    supplierStatus: row.supplier_status as Property['supplierStatus'],
    verificationStatus: row.verification_status as Property['verificationStatus'],
    bookingEnabled: eff(row.elvora_booking_enabled, row.booking_enabled),
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
    pricePerNight: row.elvora_price_display ?? row.price_per_night,
    currency: eff(row.elvora_currency, row.currency),
    rating: row.rating,
    reviewCount: row.review_count,
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    amenities: (row.amenities_override ? (row.elvora_amenities ?? []) : (row.supplier_amenities ?? row.amenities ?? [])) as Property['amenities'],
    tags: eff(row.elvora_tags, row.tags) as Property['tags'],
    collections: row.collections as Property['collections'],
    featured: eff(row.elvora_featured, row.featured),
    isActive: eff(row.elvora_is_active, row.is_active),
    images: orderedImages,
    video: row.video ?? undefined,
    houseRules: row.house_rules ?? [],
    policies: row.policies ?? { checkIn: '', checkOut: '', cancellation: '', damagePolicy: '' },
    sourceUrl: row.source_url ?? undefined,
    website: row.elvora_website ?? row.website ?? undefined,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplierName: row.supplier_name ?? undefined,
    supplierPropertyId: row.supplier_hotel_code ?? undefined,
  };
}

const PAGE_SIZE = 24;

export function usePaginatedProperties(destinationSlug?: string) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    pageRef.current = 0;
    setProperties([]);
    setHasMore(true);
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Resolve destination filter first
        let destFilter: { column: string; value: string | string[] } | null = null;

        if (destinationSlug) {
          const { data: dest } = await supabase
            .from('destinations')
            .select('id')
            .eq('slug', destinationSlug)
            .maybeSingle();

          if (dest) {
            const { data: children } = await supabase
              .from('destinations')
              .select('id')
              .eq('parent_destination_id', dest.id);
            const allIds = [dest.id, ...(children ?? []).map((c) => c.id)];
            destFilter = { column: 'destination_id', value: allIds };
          } else {
            destFilter = { column: 'destination_slug', value: destinationSlug };
          }
        }

        // Build count query
        let countQuery = supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Build data query
        let dataQuery = supabase
          .from('properties')
          .select('*')
          .eq('is_active', true)
          .order('featured', { ascending: false })
          .order('name', { ascending: true })
          .range(0, PAGE_SIZE - 1);

        if (destFilter) {
          if (Array.isArray(destFilter.value)) {
            countQuery = countQuery.in(destFilter.column, destFilter.value);
            dataQuery = dataQuery.in(destFilter.column, destFilter.value);
          } else {
            countQuery = countQuery.eq(destFilter.column, destFilter.value);
            dataQuery = dataQuery.eq(destFilter.column, destFilter.value);
          }
        }

        const { count } = await countQuery;
        const { data, error } = await dataQuery;

        if (cancelled) return;
        if (error) throw error;
        setTotalCount(count ?? 0);
        setProperties((data as PropertyRow[]).map(mapProperty));
        setHasMore((count ?? 0) > PAGE_SIZE);
        pageRef.current = 1;
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load properties');
        setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [destinationSlug]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = pageRef.current;
    const fromIdx = nextPage * PAGE_SIZE;
    const toIdx = fromIdx + PAGE_SIZE - 1;

    let query = supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('featured', { ascending: false })
      .order('name', { ascending: true })
      .range(fromIdx, toIdx);

    if (destinationSlug) {
      const { data: dest } = await supabase
        .from('destinations')
        .select('id')
        .eq('slug', destinationSlug)
        .maybeSingle();
      if (dest) {
        const { data: children } = await supabase
          .from('destinations')
          .select('id')
          .eq('parent_destination_id', dest.id);
        const allIds = [dest.id, ...(children ?? []).map((c) => c.id)];
        query = query.in('destination_id', allIds);
      } else {
        query = query.eq('destination_slug', destinationSlug);
      }
    }

    const { data, error } = await query;
    if (!error && data) {
      const newProps = (data as PropertyRow[]).map(mapProperty);
      setProperties((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newProps.filter((p) => !existingIds.has(p.id))];
      });
      pageRef.current = nextPage + 1;
      setHasMore(properties.length + newProps.length < totalCount);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, destinationSlug, properties.length, totalCount]);

  return { properties, loading, loadingMore, error, hasMore, totalCount, loadMore };
}

export function useAllProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('is_active', true)
          .order('featured', { ascending: false })
          .order('name', { ascending: true })
          .limit(200);

        if (cancelled) return;
        if (error) throw error;
        setProperties((data as PropertyRow[]).map(mapProperty));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load properties');
        setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { properties, loading, error };
}

export function useFeaturedProperties(limit = 6) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .eq('featured', true)
        .order('name', { ascending: true })
        .limit(limit);

      if (cancelled) return;
      if (!error && data) {
        setProperties((data as PropertyRow[]).map(mapProperty));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { properties, loading };
}

export function usePropertyBySlug(slug: string | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setProperty(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      let { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      // Fallback: try supplier_hotel_code (for live search links like /stays/6010)
      if (!data && !error) {
        const fallback = await supabase
          .from('properties')
          .select('*')
          .eq('supplier_hotel_code', slug)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setProperty(null);
      } else if (data) {
        setProperty(mapProperty(data as PropertyRow));
        setError(null);
      } else {
        setProperty(null);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return { property, loading, error };
}

export function useRelatedProperties(property: Property | null, limit = 3) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!property || !property.destinationSlug) {
        setProperties([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .eq('destination_slug', property.destinationSlug)
        .neq('id', property.id)
        .limit(limit);

      if (cancelled) return;
      if (!error && data) {
        setProperties((data as PropertyRow[]).map(mapProperty));
      } else {
        setProperties([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [property, limit]);

  return { properties, loading };
}
