import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminStayRow {
  id: string;
  name: string;
  elvora_name: string | null;
  slug: string;
  brand: string | null;
  property_type: string;
  property_status: string;
  supplier_status: string;
  verification_status: string;
  booking_enabled: boolean;
  featured: boolean;
  is_active: boolean;
  editorial_override: boolean;
  destination_id: string | null;
  destination_name: string | null;
  destination_slug: string | null;
  country: string;
  city: string;
  images: { id: string; url: string; alt: string }[];
  elvora_images: { id: string; url: string; alt: string }[] | null;
  elvora_primary_image_index: number | null;
  supplier_name: string | null;
  supplier_hotel_code: string | null;
  last_synced_at: string | null;
  last_verified_at: string | null;
  source_url: string | null;
  price_per_night: number | null;
  elvora_price_display: number | null;
  currency: string;
  rating: number | null;
  amenities: string[];
  tags: string[];
  elvora_tags: string[];
  elvora_amenities: string[];
  supplier_amenities: string[] | null;
  amenities_override: boolean | null;
  elvora_featured: boolean | null;
  elvora_popular: boolean | null;
  elvora_new: boolean | null;
  elvora_property_status: string | null;
  elvora_booking_enabled: boolean | null;
  elvora_is_active: boolean | null;
  editorial_override_set: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminStayFilters {
  search: string;
  destination: string;
  country: string;
  propertyType: string;
  supplier: string;
  supplierStatus: string;
  status: string;
  featured: string;
  verification: string;
  sortBy: string;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: AdminStayFilters = {
  search: '',
  destination: '',
  country: '',
  propertyType: '',
  supplier: '',
  supplierStatus: '',
  status: 'active',
  featured: '',
  verification: '',
  sortBy: 'updated_desc',
  page: 1,
  pageSize: 25,
};

export function useAdminStays() {
  const [stays, setStays] = useState<AdminStayRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminStayFilters>(DEFAULT_FILTERS);

  const fetchStays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' });

      // Search
      if (filters.search) {
        const s = filters.search.trim();
        query = query.or(
          `name.ilike.%${s}%,city.ilike.%${s}%,destination_name.ilike.%${s}%,country.ilike.%${s}%,supplier_hotel_code.ilike.%${s}%`
        );
      }

      // Filters
      if (filters.destination) {
        query = query.eq('destination_id', filters.destination);
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.supplier) {
        query = query.eq('supplier_name', filters.supplier);
      }
      if (filters.supplierStatus) {
        query = query.eq('supplier_status', filters.supplierStatus);
      }
      if (filters.verification) {
        query = query.eq('verification_status', filters.verification);
      }
      if (filters.featured === 'true') {
        query = query.eq('featured', true);
      } else if (filters.featured === 'false') {
        query = query.eq('featured', false);
      }

      // Status filter — check both base and elvora override
      if (filters.status === 'active') {
        query = query.eq('is_active', true).neq('property_status', 'archived');
      } else if (filters.status === 'archived') {
        query = query.eq('property_status', 'archived');
      } else if (filters.status === 'featured') {
        query = query.eq('featured', true).eq('is_active', true);
      } else if (filters.status === 'bookable') {
        query = query.eq('booking_enabled', true).eq('is_active', true);
      } else if (filters.status === 'catalog') {
        query = query.eq('property_status', 'catalog').eq('is_active', true);
      } else if (filters.status === 'coming_soon') {
        query = query.eq('property_status', 'coming_soon').eq('is_active', true);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      } else if (filters.status === 'all') {
        // no filter
      }

      // Sorting
      switch (filters.sortBy) {
        case 'name_asc':
          query = query.order('name', { ascending: true });
          break;
        case 'name_desc':
          query = query.order('name', { ascending: false });
          break;
        case 'updated_desc':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'created_desc':
          query = query.order('created_at', { ascending: false });
          break;
        case 'synced_desc':
          query = query.order('last_synced_at', { ascending: false, nullsFirst: false });
          break;
        case 'destination_asc':
          query = query.order('destination_name', { ascending: true });
          break;
        case 'featured_first':
          query = query.order('featured', { ascending: false });
          break;
        case 'supplier_asc':
          query = query.order('supplier_name', { ascending: true });
          break;
        default:
          query = query.order('updated_at', { ascending: false });
      }

      // Pagination
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        setError(queryError.message);
      } else {
        setStays((data || []) as unknown as AdminStayRow[]);
        setTotal(count || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stays');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  const updateFilters = useCallback((updates: Partial<AdminStayFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates, page: updates.page ?? 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return { stays, total, loading, error, filters, updateFilters, resetFilters, refetch: fetchStays };
}

// Fetch a single property with all fields for the editor
export async function fetchStayForEditor(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// Fetch all destinations for dropdowns
export async function fetchDestinationsForAdmin() {
  const { data, error } = await supabase
    .from('destinations')
    .select('id, name, slug, country, is_active')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch all amenities from the library
export async function fetchAmenitiesLibrary() {
  const { data, error } = await supabase
    .from('amenities')
    .select('id, name, category, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch audit log for a property
export async function fetchAuditLog(propertyId: string) {
  const { data, error } = await supabase
    .from('property_audit_log')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

// Check if a property has bookings (for delete safety)
export async function checkPropertyBookings(propertyId: string) {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);

  if (error) throw new Error(error.message);
  return count || 0;
}

// Get effective value (elvora override if set, else base)
export function getEffective<T>(elvora: T | null | undefined, base: T): T {
  if (elvora !== null && elvora !== undefined) return elvora;
  return base;
}

// Get effective name
export function getEffectiveName(row: { name: string; elvora_name: string | null }): string {
  return getEffective(row.elvora_name, row.name);
}

// Get effective images
export function getEffectiveImages(row: {
  images: { id: string; url: string; alt: string }[];
  elvora_images: { id: string; url: string; alt: string }[] | null;
  elvora_primary_image_index: number | null;
}): { id: string; url: string; alt: string }[] {
  const imgs = row.elvora_images && row.elvora_images.length > 0 ? row.elvora_images : row.images;
  const primaryIdx = row.elvora_primary_image_index ?? 0;
  if (primaryIdx > 0 && primaryIdx < imgs.length) {
    return [imgs[primaryIdx], ...imgs.slice(0, primaryIdx), ...imgs.slice(primaryIdx + 1)];
  }
  return imgs;
}

// Get effective tags
export function getEffectiveTags(row: { tags: string[]; elvora_tags: string[] }): string[] {
  const t = row.elvora_tags && row.elvora_tags.length > 0 ? row.elvora_tags : row.tags;
  return t || [];
}

// Get effective amenities
export function getEffectiveAmenities(row: { amenities: string[]; elvora_amenities: string[]; supplier_amenities: string[] | null; amenities_override: boolean | null }): string[] {
  if (row.amenities_override) {
    return row.elvora_amenities && row.elvora_amenities.length > 0 ? row.elvora_amenities : [];
  }
  const supplier = row.supplier_amenities;
  if (supplier && supplier.length > 0) return supplier;
  const a = row.elvora_amenities && row.elvora_amenities.length > 0 ? row.elvora_amenities : row.amenities;
  return a || [];
}

// Get effective featured
export function getEffectiveFeatured(row: { featured: boolean; elvora_featured: boolean | null }): boolean {
  return getEffective(row.elvora_featured, row.featured);
}

// Get effective property status
export function getEffectiveStatus(row: { property_status: string; elvora_property_status: string | null }): string {
  return getEffective(row.elvora_property_status, row.property_status);
}

// Get effective is_active
export function getEffectiveActive(row: { is_active: boolean; elvora_is_active: boolean | null }): boolean {
  return getEffective(row.elvora_is_active, row.is_active);
}

// Get effective booking enabled
export function getEffectiveBooking(row: { booking_enabled: boolean; elvora_booking_enabled: boolean | null }): boolean {
  return getEffective(row.elvora_booking_enabled, row.booking_enabled);
}

// Update a property with audit logging
export async function updatePropertyWithAudit(
  propertyId: string,
  updates: Record<string, unknown>,
  previousData: Record<string, unknown>,
  adminEmail: string,
  adminId: string,
  action: string = 'edit'
) {
  // Compute changed fields for audit
  const changedFields: Record<string, { previous: unknown; new: unknown }> = {};
  for (const [key, newVal] of Object.entries(updates)) {
    const prevVal = previousData[key];
    if (JSON.stringify(prevVal) !== JSON.stringify(newVal)) {
      changedFields[key] = { previous: prevVal, new: newVal };
    }
  }

  // Set editorial_override if any elvora_ fields are being set
  const hasElvoraFields = Object.keys(updates).some((k) => k.startsWith('elvora_'));
  if (hasElvoraFields) {
    updates.editorial_override = true;
  }

  // Mirror effective elvora override values to base columns
  // so existing RLS policies and queries (.eq('featured', true), etc.) work correctly
  if (updates.elvora_featured !== undefined) {
    updates.featured = updates.elvora_featured;
  }
  if (updates.elvora_is_active !== undefined) {
    updates.is_active = updates.elvora_is_active;
  }
  if (updates.elvora_booking_enabled !== undefined) {
    updates.booking_enabled = updates.elvora_booking_enabled;
  }
  if (updates.elvora_property_status !== undefined && updates.elvora_property_status !== null) {
    updates.property_status = updates.elvora_property_status;
  }

  // Update the property
  const { error: updateError } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  if (updateError) throw new Error(updateError.message);

  // Insert audit log entry
  if (Object.keys(changedFields).length > 0) {
    const propertyName = (updates.elvora_name as string) || (previousData.name as string) || propertyId;
    await supabase.from('property_audit_log').insert({
      admin_user_email: adminEmail,
      admin_user_id: adminId,
      property_id: propertyId,
      property_name: propertyName,
      action,
      changed_fields: changedFields,
    });
  }

  return { changedFields };
}

// Create a new Elvora-curated property
export async function createCuratedProperty(
  data: {
    name: string;
    slug: string;
    destination_id: string;
    destination_slug: string;
    destination_name: string;
    property_type: string;
    description: string;
    country: string;
    city: string;
    images: { id: string; url: string; alt: string }[];
  },
  adminEmail: string,
  adminId: string
) {
  const newId = `elvora-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const insertData: Record<string, unknown> = {
    id: newId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    long_description: data.description,
    property_type: data.property_type,
    property_status: 'catalog',
    supplier_status: 'not_connected',
    verification_status: 'verified',
    booking_enabled: false,
    price_display_mode: 'check_availability',
    supplier_name: 'elvora',
    supplier_hotel_code: null,
    destination_id: data.destination_id,
    destination_slug: data.destination_slug,
    destination_name: data.destination_name,
    country: data.country,
    city: data.city,
    amenities: [],
    tags: [],
    collections: [],
    featured: false,
    is_active: true,
    images: data.images,
    house_rules: [],
    policies: { checkIn: '', checkOut: '', cancellation: '', damagePolicy: '' },
    elvora_name: data.name,
    editorial_override: true,
  };

  const { data: created, error } = await supabase
    .from('properties')
    .insert(insertData)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // Audit log
  await supabase.from('property_audit_log').insert({
    admin_user_email: adminEmail,
    admin_user_id: adminId,
    property_id: newId,
    property_name: data.name,
    action: 'create',
    changed_fields: { action: { previous: null, new: 'created curated property' } },
  });

  // Update destination stay count
  await updateDestinationStayCount(data.destination_id);

  return created;
}

// Duplicate a property
export async function duplicateProperty(
  sourceId: string,
  adminEmail: string,
  adminId: string
) {
  const { data: source, error: fetchError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!source) throw new Error('Source property not found');

  const newId = `elvora-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const sourceName = source.elvora_name || source.name;
  const copyName = `${sourceName} (Copy)`;
  const copySlug = `${source.slug}-copy-${Date.now().toString(36)}`;

  const { data: created, error } = await supabase
    .from('properties')
    .insert({
      ...source,
      id: newId,
      name: copyName,
      slug: copySlug,
      elvora_name: copyName,
      supplier_name: 'elvora',
      supplier_hotel_code: null,
      supplier_status: 'not_connected',
      verification_status: 'needs_review',
      editorial_override: true,
      featured: false,
      is_active: false,
      property_status: 'catalog',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('property_audit_log').insert({
    admin_user_email: adminEmail,
    admin_user_id: adminId,
    property_id: newId,
    property_name: copyName,
    action: 'duplicate',
    changed_fields: { source: { previous: null, new: sourceId } },
  });

  return created;
}

// Bulk update properties
export async function bulkUpdateProperties(
  propertyIds: string[],
  updates: Record<string, unknown>,
  adminEmail: string,
  adminId: string,
  action: string = 'bulk_edit'
) {
  const hasElvoraFields = Object.keys(updates).some((k) => k.startsWith('elvora_'));
  if (hasElvoraFields) {
    updates.editorial_override = true;
  }

  const { error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', propertyIds);

  if (error) throw new Error(error.message);

  // Audit log for each
  const logEntries = propertyIds.map((pid) => ({
    admin_user_email: adminEmail,
    admin_user_id: adminId,
    property_id: pid,
    property_name: pid,
    action,
    changed_fields: Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, { previous: null, new: v }])
    ),
  }));

  await supabase.from('property_audit_log').insert(logEntries);
}

// Update destination stay count
export async function updateDestinationStayCount(destinationId: string) {
  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .neq('property_status', 'archived');

  await supabase
    .from('destinations')
    .update({ stay_count: count || 0, updated_at: new Date().toISOString() })
    .eq('id', destinationId);
}

// Delete a property (with booking check)
export async function deleteProperty(
  propertyId: string,
  adminEmail: string,
  adminId: string
) {
  const bookingCount = await checkPropertyBookings(propertyId);
  if (bookingCount > 0) {
    throw new Error(`Cannot delete: property has ${bookingCount} active bookings. Archive instead.`);
  }

  const { data: prop } = await supabase
    .from('properties')
    .select('name, elvora_name, destination_id')
    .eq('id', propertyId)
    .maybeSingle();

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (error) throw new Error(error.message);

  await supabase.from('property_audit_log').insert({
    admin_user_email: adminEmail,
    admin_user_id: adminId,
    property_id: propertyId,
    property_name: prop?.elvora_name || prop?.name || propertyId,
    action: 'delete',
    changed_fields: {},
  });

  if (prop?.destination_id) {
    await updateDestinationStayCount(prop.destination_id);
  }
}

// Check for duplicate supplier identity
export async function checkDuplicateSupplier(supplierName: string, hotelCode: string) {
  const { count, error } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_name', supplierName)
    .eq('supplier_hotel_code', hotelCode);

  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}

// Check for duplicate name/address
export async function checkDuplicateName(name: string, address?: string) {
  let query = supabase
    .from('properties')
    .select('id, name, elvora_name, address, city')
    .ilike('name', name)
    .limit(5);

  if (address) {
    query = query.ilike('address', `%${address}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
