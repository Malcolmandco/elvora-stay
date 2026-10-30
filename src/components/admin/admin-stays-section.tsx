import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Edit, Eye, Copy, Archive, RotateCcw, Trash2,
  CheckSquare, Square, Star, Loader2, AlertTriangle, ChevronLeft,
  ChevronRight, Building2, X, Tag, MapPin, Sparkles, BedDouble,
  Database, RefreshCw, KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAdminStays, getEffectiveName, getEffectiveImages, getEffectiveStatus, getEffectiveActive, getEffectiveFeatured, bulkUpdateProperties, duplicateProperty, fetchDestinationsForAdmin, createCuratedProperty, checkDuplicateName, type AdminStayRow } from '@/hooks/use-admin-stays';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { supabase } from '@/lib/supabase';
import { StayEditor } from '@/components/admin/stay-editor';

type ViewMode = 'list' | 'editor' | 'create';

interface DestinationOption {
  id: string;
  name: string;
  slug: string;
  country: string;
}

interface AdminStaysSectionProps {
  initialDestinationSlug?: string;
  onClearDestFilter?: () => void;
  onOpenSyncCenter?: () => void;
}

export function AdminStaysSection({ initialDestinationSlug, onClearDestFilter, onOpenSyncCenter }: AdminStaysSectionProps = {}) {
  const { user } = useAdminAuth();
  const { stays, total, loading, error, filters, updateFilters, resetFilters, refetch } = useAdminStays();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [bulkDestination, setBulkDestination] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [destFilterApplied, setDestFilterApplied] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [syncingRooms, setSyncingRooms] = useState(false);
  const [roomSyncResult, setRoomSyncResult] = useState<string | null>(null);
  const [perPropSyncing, setPerPropSyncing] = useState<string | null>(null);
  const [perPropResult, setPerPropResult] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Array<{ id: string; label: string; environment: string; is_active: boolean; last_test_status: string | null }>>([]);
  const [showCredPicker, setShowCredPicker] = useState(false);
  const [credPickerCallback, setCredPickerCallback] = useState<((credentialId: string) => void) | null>(null);
  const [credPickerLabel, setCredPickerLabel] = useState('');

  const handleEnrichAmenities = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-amenities-enrich`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            batchSize: 50,
            maxCount: 200,
            onlyMissing: true,
            ...(filters.destination ? { destinationId: filters.destination } : {}),
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        setEnrichResult(`Error: ${data.error}`);
      } else {
        const { enriched, processed, noFacilities, rateLimited, status } = data;
        setEnrichResult(
          `${status}: ${enriched} enriched, ${processed} processed, ${noFacilities} without facilities` +
          (rateLimited ? ' (rate limited — resume later)' : '')
        );
        refetch();
      }
    } catch {
      setEnrichResult('Enrichment request failed');
    } finally {
      setEnriching(false);
    }
  };

  const handleSyncRooms = async (credentialId?: string) => {
    if (!credentialId) {
      setShowCredPicker(true);
      setCredPickerLabel('Sync Rooms');
      setCredPickerCallback((id: string) => handleSyncRooms(id));
      return;
    }
    setShowCredPicker(false);
    setSyncingRooms(true);
    setRoomSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-room-sync`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            batchSize: 5,
            maxCount: 5,
            credentialId,
            ...(filters.destination ? { destinationId: filters.destination } : {}),
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        setRoomSyncResult(`Error: ${data.error}`);
      } else {
        const { status, processed, totalRoomsFound, totalRoomsCreated, totalRoomsUpdated, totalPricesUpdated, errors, rateLimited } = data;
        setRoomSyncResult(
          `${status}: ${processed || 0} properties, ${totalRoomsFound || 0} rooms found, ${totalRoomsCreated || 0} created, ${totalRoomsUpdated || 0} updated, ${totalPricesUpdated || 0} prices updated` +
          (rateLimited ? ' (rate limited — resume later)' : '') +
          (errors && errors.length > 0 ? ` (${errors.length} warnings)` : '')
        );
      }
    } catch {
      setRoomSyncResult('Room sync request failed');
    } finally {
      setSyncingRooms(false);
    }
  };

  useEffect(() => {
    fetchDestinationsForAdmin().then((d) => {
      setDestinations(d as DestinationOption[]);
      if (initialDestinationSlug && !destFilterApplied) {
        const matched = (d as DestinationOption[]).find((dest) => dest.slug === initialDestinationSlug);
        if (matched) {
          updateFilters({ destination: matched.id, status: 'all' });
          setDestFilterApplied(true);
        }
      }
    }).catch(() => {});

    // Fetch credentials for room sync selection
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
          { method: 'POST', headers, body: JSON.stringify({ action: 'list' }) },
        );
        if (res.ok) {
          const data = await res.json();
          setCredentials(data.credentials || []);
        }
      } catch { /* ignore */ }
    })();
  }, [initialDestinationSlug]);

  const totalPages = Math.ceil(total / filters.pageSize);
  const pageStart = (filters.page - 1) * filters.pageSize + 1;
  const pageEnd = Math.min(filters.page * filters.pageSize, total);

  const allOnPageSelected = stays.length > 0 && stays.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        stays.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        stays.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async () => {
    if (!user || selectedIds.size === 0 || !bulkAction) return;
    const ids = Array.from(selectedIds);

    const isDestructive = ['archive', 'unfeature', 'remove_tag'].includes(bulkAction);

    if (isDestructive && !showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setBulkLoading(true);
    setBulkError(null);
    try {
      const adminEmail = user.email || 'admin';
      const adminId = user.id;

      switch (bulkAction) {
        case 'publish':
          await bulkUpdateProperties(ids, { elvora_is_active: true, elvora_property_status: 'catalog', editorial_override: true }, adminEmail, adminId, 'bulk_publish');
          break;
        case 'unpublish':
          await bulkUpdateProperties(ids, { elvora_is_active: false, editorial_override: true }, adminEmail, adminId, 'bulk_unpublish');
          break;
        case 'archive':
          await bulkUpdateProperties(ids, { elvora_property_status: 'archived', elvora_is_active: false, editorial_override: true }, adminEmail, adminId, 'bulk_archive');
          break;
        case 'feature':
          await bulkUpdateProperties(ids, { elvora_featured: true, editorial_override: true }, adminEmail, adminId, 'bulk_feature');
          break;
        case 'unfeature':
          await bulkUpdateProperties(ids, { elvora_featured: false, editorial_override: true }, adminEmail, adminId, 'bulk_unfeature');
          break;
        case 'change_destination':
          if (!bulkDestination) { setBulkError('Select a destination'); return; }
          const dest = destinations.find((d) => d.id === bulkDestination);
          if (!dest) { setBulkError('Invalid destination'); return; }
          await bulkUpdateProperties(ids, {
            destination_id: dest.id, destination_slug: dest.slug,
            destination_name: dest.name, country: dest.country,
          }, adminEmail, adminId, 'bulk_change_destination');
          break;
        case 'add_tag':
          if (!bulkTag.trim()) { setBulkError('Enter a tag'); return; }
          const { data: tagRows } = await supabase
            .from('properties')
            .select('id, elvora_tags, tags')
            .in('id', ids);
          if (tagRows) {
            for (const row of tagRows) {
              const currentTags = (row.elvora_tags && row.elvora_tags.length > 0) ? row.elvora_tags : row.tags || [];
              if (!currentTags.includes(bulkTag.trim())) {
                await supabase
                  .from('properties')
                  .update({ elvora_tags: [...currentTags, bulkTag.trim()], editorial_override: true, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
            await bulkUpdateProperties(ids, { editorial_override: true }, adminEmail, adminId, 'bulk_add_tag');
          }
          break;
      }

      setSelectedIds(new Set());
      setBulkAction(null);
      setShowBulkConfirm(false);
      setBulkDestination('');
      setBulkTag('');
      refetch();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    try {
      await duplicateProperty(id, user.email || 'admin', user.id);
      refetch();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const handleSyncPropertyRooms = async (propertyId: string, propertyName: string, credentialId?: string) => {
    if (!credentialId) {
      setShowCredPicker(true);
      setCredPickerLabel(`Sync Rooms — ${propertyName}`);
      setCredPickerCallback((id: string) => handleSyncPropertyRooms(propertyId, propertyName, id));
      return;
    }
    setShowCredPicker(false);
    setPerPropSyncing(propertyId);
    setPerPropResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-room-sync`,
        { method: 'POST', headers, body: JSON.stringify({ propertyId, credentialId }) }
      );
      const data = await response.json();
      if (data.error) {
        setPerPropResult(`Error syncing ${propertyName}: ${data.error}`);
      } else {
        setPerPropResult(`${propertyName}: ${data.roomsFound || 0} rooms found, ${data.roomsCreated || 0} created, ${data.roomsUpdated || 0} updated`);
        refetch();
      }
    } catch {
      setPerPropResult(`Failed to sync rooms for ${propertyName}`);
    } finally {
      setPerPropSyncing(null);
    }
  };

  const statusTabs = useMemo(() => [
    { value: 'active', label: 'All Stays' },
    { value: 'featured', label: 'Featured' },
    { value: 'archived', label: 'Archived' },
    { value: 'bookable', label: 'Bookable' },
    { value: 'catalog', label: 'Catalog' },
    { value: 'coming_soon', label: 'Coming Soon' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'all', label: 'Supplier Inventory' },
  ], []);

  if (viewMode === 'editor' && editingId) {
    return (
      <StayEditor
        stayId={editingId}
        onClose={() => { setViewMode('list'); setEditingId(null); }}
        onSaved={() => refetch()}
      />
    );
  }

  if (viewMode === 'create') {
    return (
      <CreateStayForm
        onClose={() => setViewMode('list')}
        onCreated={() => { setViewMode('list'); refetch(); }}
        destinations={destinations}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-light text-foreground">Stays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString()} properties{selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSyncCenter && (
            <button
              onClick={onOpenSyncCenter}
              className="inline-flex items-center gap-2 border border-primary px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-primary hover:bg-primary/10"
            >
              <Database className="h-4 w-4" strokeWidth={1.5} />
              Hotelbeds Sync Center
            </button>
          )}
          <button
            onClick={handleEnrichAmenities}
            disabled={enriching}
            className="inline-flex items-center gap-2 border border-accent px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-accent hover:bg-accent/10 disabled:opacity-40"
          >
            {enriching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
            Enrich Amenities
          </button>
          <button
            onClick={() => handleSyncRooms()}
            disabled={syncingRooms}
            className="inline-flex items-center gap-2 border border-accent px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-accent hover:bg-accent/10 disabled:opacity-40"
          >
            {syncingRooms ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <BedDouble className="h-4 w-4" strokeWidth={1.5} />}
            Sync Rooms
          </button>
          <button
            onClick={() => setViewMode('create')}
            className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Stay
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateFilters({ status: tab.value })}
            className={cn(
              'px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
              filters.status === tab.value
                ? 'bg-foreground text-background'
                : 'border border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enrichment result */}
      {enrichResult && (
        <div className="mt-4 flex items-center gap-2 border border-border bg-background p-3 text-sm text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
          {enrichResult}
          <button onClick={() => setEnrichResult(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Room sync result */}
      {roomSyncResult && (
        <div className="mt-4 flex items-center gap-2 border border-border bg-background p-3 text-sm text-foreground">
          <BedDouble className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
          {roomSyncResult}
          <button onClick={() => setRoomSyncResult(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Per-property sync result */}
      {perPropResult && (
        <div className="mt-4 flex items-center gap-2 border border-border bg-background p-3 text-sm text-foreground">
          <BedDouble className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
          {perPropResult}
          <button onClick={() => setPerPropResult(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Destination filter banner */}
      {initialDestinationSlug && destFilterApplied && (
        <div className="mt-4 flex items-center gap-2 border border-accent/30 bg-accent/5 p-3 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
          <span className="text-foreground">Filtered by destination: <strong>{destinations.find((d) => d.id === filters.destination)?.name || initialDestinationSlug}</strong></span>
          <button
            onClick={() => {
              updateFilters({ destination: '' });
              setDestFilterApplied(false);
              onClearDestFilter?.();
            }}
            className="ml-auto text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search by name, city, destination, Hotelbeds code..."
            className="w-full border border-border bg-background py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={filters.country}
          onChange={(e) => updateFilters({ country: e.target.value })}
          className="border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Countries</option>
        </select>
        <select
          value={filters.propertyType}
          onChange={(e) => updateFilters({ propertyType: e.target.value })}
          className="border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="Hotel">Hotel</option>
          <option value="Resort">Resort</option>
          <option value="Villa">Villa</option>
          <option value="Boutique Hotel">Boutique Hotel</option>
          <option value="Apartment">Apartment</option>
          <option value="Private Residence">Private Residence</option>
          <option value="Cabin">Cabin</option>
          <option value="Lodge">Lodge</option>
        </select>
        <select
          value={filters.supplier}
          onChange={(e) => updateFilters({ supplier: e.target.value })}
          className="border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Suppliers</option>
          <option value="hotelbeds">Hotelbeds</option>
          <option value="elvora">Elvora Curated</option>
        </select>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value })}
          className="border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="updated_desc">Last Updated</option>
          <option value="created_desc">Newest</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="synced_desc">Last Synced</option>
          <option value="destination_asc">Destination</option>
          <option value="featured_first">Featured</option>
          <option value="supplier_asc">Supplier</option>
        </select>
        <button
          onClick={resetFilters}
          className="border border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border border-border bg-background p-3">
          <span className="text-xs font-medium uppercase tracking-wider text-foreground">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <select
            value={bulkAction ?? ''}
            onChange={(e) => { setBulkAction(e.target.value || null); setShowBulkConfirm(false); setBulkError(null); }}
            className="border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">Bulk action...</option>
            <option value="publish">Publish (make active)</option>
            <option value="unpublish">Unpublish (make inactive)</option>
            <option value="archive">Archive</option>
            <option value="feature">Feature</option>
            <option value="unfeature">Unfeature</option>
            <option value="change_destination">Change destination...</option>
            <option value="add_tag">Add tag...</option>
          </select>
          {bulkAction === 'change_destination' && (
            <select
              value={bulkDestination}
              onChange={(e) => setBulkDestination(e.target.value)}
              className="border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Select destination...</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
            </select>
          )}
          {bulkAction === 'add_tag' && (
            <input
              type="text"
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              placeholder="Tag name"
              className="border border-border bg-background px-2 py-1 text-xs"
            />
          )}
          {bulkAction && (
            <button
              onClick={handleBulkAction}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 bg-foreground px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85 disabled:opacity-40"
            >
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Apply
            </button>
          )}
          {showBulkConfirm && (
            <span className="text-xs text-error">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              Click Apply again to confirm destructive action
            </span>
          )}
          {bulkError && <span className="text-xs text-error">{bulkError}</span>}
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkAction(null); setShowBulkConfirm(false); setBulkError(null); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 border border-error bg-error/5 p-3 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="mt-6 border border-border bg-background p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stays.length === 0 ? (
        <div className="mt-6 border border-border bg-background p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">No properties match these filters.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {allOnPageSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-3 py-3">Property</th>
                <th className="hidden px-3 py-3 md:table-cell">Location</th>
                <th className="hidden px-3 py-3 lg:table-cell">Supplier</th>
                <th className="px-3 py-3">Status</th>
                <th className="hidden px-3 py-3 lg:table-cell">Synced</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stays.map((stay) => (
                <StayRow
                  key={stay.id}
                  stay={stay}
                  selected={selectedIds.has(stay.id)}
                  onToggle={() => toggleSelect(stay.id)}
                  onEdit={() => { setEditingId(stay.id); setViewMode('editor'); }}
                  onDuplicate={() => handleDuplicate(stay.id)}
                  onSyncRooms={() => handleSyncPropertyRooms(stay.id, getEffectiveName(stay))}
                  isSyncingRooms={perPropSyncing === stay.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {pageStart}–{pageEnd} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
              disabled={filters.page === 1}
              className="border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs text-muted-foreground">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => updateFilters({ page: Math.min(totalPages, filters.page + 1) })}
              disabled={filters.page === totalPages}
              className="border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Credential Picker Dialog */}
      {showCredPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/80" onClick={() => setShowCredPicker(false)}>
          <div className="border border-border bg-background p-6 shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <div>
                <h3 className="font-serif text-lg font-medium text-foreground">Select Hotelbeds API Account</h3>
                <p className="text-xs text-muted-foreground">{credPickerLabel}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Choose which credential set to use. No automatic rotation.</p>
            <div className="mt-4 space-y-2">
              {credentials.filter((c) => c.is_active).length === 0 ? (
                <p className="text-sm text-warning">No active API accounts. Add one in the Sync Center first.</p>
              ) : (
                credentials.filter((c) => c.is_active).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => credPickerCallback?.(c.id)}
                    className="flex w-full items-center justify-between border border-border px-4 py-3 text-left transition-colors hover:bg-secondary"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.environment}{c.last_test_status === 'connected' ? ' · Connected' : ''}</p>
                    </div>
                    <KeyRound className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowCredPicker(false)}
              className="mt-4 w-full border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StayRow({ stay, selected, onToggle, onEdit, onDuplicate, onSyncRooms, isSyncingRooms }: {
  stay: AdminStayRow;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onSyncRooms: () => void;
  isSyncingRooms: boolean;
}) {
  const name = getEffectiveName(stay);
  const images = getEffectiveImages(stay);
  const status = getEffectiveStatus(stay);
  const isActive = getEffectiveActive(stay);
  const isFeatured = getEffectiveFeatured(stay);
  const primaryImg = images[0];

  return (
    <tr className={cn('border-b border-border last:border-0', !isActive && 'bg-secondary/30')}>
      <td className="px-3 py-3">
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          {selected ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 shrink-0 overflow-hidden bg-muted">
            {primaryImg && <img src={primaryImg.url} alt={primaryImg.alt} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-foreground">{name}</span>
              {isFeatured && <Star className="h-3 w-3 fill-accent text-accent" />}
              {stay.editorial_override && (
                <span className="bg-accent/10 px-1.5 py-0.5 text-[0.5rem] font-medium uppercase tracking-wider text-accent">Edited</span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{stay.property_type}</p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">
        <p className="text-sm">{stay.city}</p>
        <p className="text-xs">{stay.country}</p>
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        <span className={cn(
          'px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
          stay.supplier_name === 'hotelbeds' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
        )}>
          {stay.supplier_name || 'elvora'}
        </span>
        {stay.supplier_hotel_code && <p className="mt-0.5 text-xs text-muted-foreground">{stay.supplier_hotel_code}</p>}
      </td>
      <td className="px-3 py-3">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
          status === 'archived' ? 'bg-secondary text-muted-foreground'
            : status === 'bookable' ? 'bg-accent/10 text-accent'
            : status === 'coming_soon' ? 'bg-warning/10 text-warning'
            : isActive ? 'bg-foreground/5 text-foreground'
            : 'bg-error/10 text-error'
        )}>
          {status === 'archived' ? 'Archived' : !isActive ? 'Inactive' : status}
        </span>
      </td>
      <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell">
        {stay.last_synced_at ? new Date(stay.last_synced_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/stays/${stay.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground" title="View public page">
            <Eye className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Edit">
            <Edit className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground" title="Duplicate">
            <Copy className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {stay.supplier_name === 'hotelbeds' && (
            <button onClick={onSyncRooms} disabled={isSyncingRooms} className="text-muted-foreground hover:text-accent disabled:opacity-40" title="Sync Room Types">
              {isSyncingRooms ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateStayForm({ onClose, onCreated, destinations }: {
  onClose: () => void;
  onCreated: () => void;
  destinations: DestinationOption[];
}) {
  const { user } = useAdminAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [propertyType, setPropertyType] = useState('Hotel');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
  };

  const handleDestinationChange = (id: string) => {
    setDestinationId(id);
    const dest = destinations.find((d) => d.id === id);
    if (dest) {
      setCountry(dest.country);
      setCity(dest.name);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setError(null);
    setDuplicateWarning(null);

    if (!name.trim()) { setError('Name is required'); return; }
    if (!slug.trim()) { setError('Slug is required'); return; }
    if (!destinationId) { setError('Destination is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!imageUrl.trim()) { setError('At least one image is required'); return; }

    setSaving(true);
    try {
      const dest = destinations.find((d) => d.id === destinationId);
      if (!dest) { setError('Invalid destination'); return; }

      // use static imports (already imported at top)
      const duplicates = await checkDuplicateName(name.trim());
      if (duplicates.length > 0) {
        setDuplicateWarning(`Warning: ${duplicates.length} similar property name(s) already exist. Continuing will create a new property.`);
      }

      await createCuratedProperty({
        name: name.trim(),
        slug: slug.trim(),
        destination_id: dest.id,
        destination_slug: dest.slug,
        destination_name: dest.name,
        property_type: propertyType,
        description: description.trim(),
        country,
        city,
        images: [{
          id: `elvora-img-${Date.now()}`,
          url: imageUrl.trim(),
          alt: imageAlt.trim() || name.trim(),
        }],
      }, user.email || 'admin', user.id);

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-secondary">
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-serif text-lg font-medium text-foreground">Create Elvora Curated Stay</h2>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Elvora Curated Property:</strong> This property will be marked as Supplier: Elvora Curated. It will not appear to be a Hotelbeds property.</p>
          </div>

          {error && <div className="border border-error bg-error/5 p-3 text-sm text-error">{error}</div>}
          {duplicateWarning && <div className="border border-warning bg-warning/5 p-3 text-sm text-warning">{duplicateWarning}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Property Name *</label>
            <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug *</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Destination *</label>
              <select value={destinationId} onChange={(e) => handleDestinationChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm">
                <option value="">— Select —</option>
                {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Property Type</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm">
                <option>Hotel</option><option>Resort</option><option>Villa</option>
                <option>Boutique Hotel</option><option>Apartment</option>
                <option>Private Residence</option><option>Cabin</option><option>Lodge</option>
                <option>Luxury Estate</option><option>Wellness Retreat</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Primary Image *</h4>
            <div className="mt-2 space-y-2">
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.example.com/photo.jpg" className="w-full border border-border bg-background px-3 py-2 text-sm" />
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Alt text / caption" className="w-full border border-border bg-background px-3 py-2 text-sm" />
              {imageUrl && (
                <div className="h-32 w-48 overflow-hidden border border-border bg-muted">
                  <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
