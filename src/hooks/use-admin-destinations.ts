import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminDestinationRow {
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
  cover_image: string | null;
  thumbnail_image: string | null;
  og_image: string | null;
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
  tagline: string | null;
  editorial_title: string | null;
  editorial_description: string | null;
  travel_story: string | null;
  best_time_to_visit: string | null;
  why_visit: string | null;
  highlights: string[] | null;
  experiences: string[] | null;
  local_tips: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDestinationFilters {
  search: string;
  status: string;
  sortBy: string;
}

const DEFAULT_FILTERS: AdminDestinationFilters = {
  search: '',
  status: 'all',
  sortBy: 'name_asc',
};

export function useAdminDestinations() {
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminDestinationFilters>(DEFAULT_FILTERS);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' });

      if (filters.search) {
        const s = filters.search.trim();
        query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%,country.ilike.%${s}%,region.ilike.%${s}%`);
      }

      switch (filters.status) {
        case 'published':
          query = query.eq('status', 'published');
          break;
        case 'draft':
          query = query.eq('status', 'draft');
          break;
        case 'archived':
          query = query.eq('status', 'archived');
          break;
        case 'featured':
          query = query.eq('is_featured', true);
          break;
        case 'popular':
          query = query.eq('is_popular', true);
          break;
        case 'new':
          query = query.eq('is_new', true);
          break;
        case 'has_stays':
          query = query.gt('stay_count', 0);
          break;
        case 'no_stays':
          query = query.eq('stay_count', 0);
          break;
        case 'all':
        default:
          break;
      }

      switch (filters.sortBy) {
        case 'name_asc':
          query = query.order('name', { ascending: true });
          break;
        case 'name_desc':
          query = query.order('name', { ascending: false });
          break;
        case 'most_stays':
          query = query.order('stay_count', { ascending: false });
          break;
        case 'least_stays':
          query = query.order('stay_count', { ascending: true });
          break;
        case 'featured_first':
          query = query.order('is_featured', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'updated_desc':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'display_order':
          query = query.order('display_order', { ascending: true, nullsFirst: false });
          break;
        default:
          query = query.order('name', { ascending: true });
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        setError(queryError.message);
      } else {
        setDestinations((data || []) as unknown as AdminDestinationRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch destinations');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const updateFilters = useCallback((updates: Partial<AdminDestinationFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    destinations,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refetch: fetchDestinations,
  };
}

export async function fetchDestinationForEditor(id: string): Promise<AdminDestinationRow> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Destination not found');
  return data as unknown as AdminDestinationRow;
}

export async function checkDestinationSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('destinations')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count || 0) === 0;
}

export async function createDestination(data: Record<string, unknown>): Promise<AdminDestinationRow> {
  const newId = `dest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const insertData: Record<string, unknown> = {
    id: newId,
    name: data.name,
    slug: data.slug,
    country: data.country,
    country_code: data.country_code || null,
    region: data.region || null,
    short_description: data.short_description || '',
    long_description: data.long_description || '',
    hero_image: data.hero_image || '',
    hero_image_alt: data.hero_image_alt || data.name,
    is_active: data.is_active ?? true,
    is_featured: data.is_featured ?? false,
    is_popular: data.is_popular ?? false,
    is_new: data.is_new ?? false,
    display_order: data.display_order ?? 0,
    status: data.status || 'draft',
    ...data,
  };

  delete insertData.created_at;
  delete insertData.updated_at;
  insertData.id = newId;

  const { data: created, error } = await supabase
    .from('destinations')
    .insert(insertData)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return created as unknown as AdminDestinationRow;
}

export async function updateDestination(
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('destinations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function bulkUpdateDestinations(
  ids: string[],
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('destinations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw new Error(error.message);
}

export async function deleteDestination(id: string): Promise<void> {
  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('destination_id', id)
    .eq('is_active', true);

  if (count && count > 0) {
    throw new Error(`This destination has ${count} stays attached to it. Archive it instead of deleting it.`);
  }

  const { error } = await supabase
    .from('destinations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function getDestinationStayStats(destinationId: string): Promise<{
  total: number;
  active: number;
  featured: number;
}> {
  const { count: total } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('destination_id', destinationId);

  const { count: active } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .neq('property_status', 'archived');

  const { count: featured } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .eq('featured', true);

  return {
    total: total || 0,
    active: active || 0,
    featured: featured || 0,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
