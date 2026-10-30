import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, Edit, Eye, Trash2, CheckSquare, Square, Star,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, X, MapPin,
  Building2, Globe, Sparkles, Check, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAdminDestinations,
  bulkUpdateDestinations,
  deleteDestination,
  slugify,
  type AdminDestinationRow,
} from '@/hooks/use-admin-destinations';
import { DestinationEditor } from '@/components/admin/destination-editor';

type ViewMode = 'list' | 'editor' | 'create';

export function AdminDestinationsSection() {
  const { destinations, loading, error, filters, updateFilters, resetFilters, refetch } = useAdminDestinations();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDestinationRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (viewMode === 'list') refetch();
  }, [viewMode, refetch]);

  const allSelected = destinations.length > 0 && destinations.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(destinations.map((d) => d.id)));
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
    if (selectedIds.size === 0 || !bulkAction) return;
    const ids = Array.from(selectedIds);
    const isDestructive = ['unpublish', 'archive', 'unfeature', 'remove_popular', 'remove_new'].includes(bulkAction);

    if (isDestructive && !showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setBulkLoading(true);
    setBulkError(null);
    try {
      switch (bulkAction) {
        case 'publish':
          await bulkUpdateDestinations(ids, { is_active: true, status: 'published' });
          break;
        case 'unpublish':
          await bulkUpdateDestinations(ids, { is_active: false, status: 'draft' });
          break;
        case 'archive':
          await bulkUpdateDestinations(ids, { is_active: false, status: 'archived' });
          break;
        case 'restore':
          await bulkUpdateDestinations(ids, { is_active: true, status: 'published' });
          break;
        case 'feature':
          await bulkUpdateDestinations(ids, { is_featured: true });
          break;
        case 'unfeature':
          await bulkUpdateDestinations(ids, { is_featured: false });
          break;
        case 'mark_popular':
          await bulkUpdateDestinations(ids, { is_popular: true });
          break;
        case 'remove_popular':
          await bulkUpdateDestinations(ids, { is_popular: false });
          break;
        case 'mark_new':
          await bulkUpdateDestinations(ids, { is_new: true });
          break;
        case 'remove_new':
          await bulkUpdateDestinations(ids, { is_new: false });
          break;
      }
      setSelectedIds(new Set());
      setBulkAction(null);
      setShowBulkConfirm(false);
      refetch();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteDestination(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusTabs = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
    { value: 'featured', label: 'Featured' },
    { value: 'popular', label: 'Popular' },
    { value: 'new', label: 'New' },
    { value: 'has_stays', label: 'Has Stays' },
    { value: 'no_stays', label: 'No Stays' },
  ], []);

  if (viewMode === 'editor' && editingId) {
    return (
      <DestinationEditor
        destinationId={editingId}
        onClose={() => { setViewMode('list'); setEditingId(null); }}
        onSaved={() => { setViewMode('list'); setEditingId(null); refetch(); }}
      />
    );
  }

  if (viewMode === 'create') {
    return (
      <DestinationEditor
        isNew={true}
        onClose={() => { setViewMode('list'); }}
        onSaved={() => { setViewMode('list'); refetch(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-light text-foreground">Destinations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {destinations.length} destinations
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <button
          onClick={() => setViewMode('create')}
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Create Destination
        </button>
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

      {/* Search + sort */}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search by name, city, country, slug..."
            className="w-full border border-border bg-background py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value })}
          className="border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="most_stays">Most Stays</option>
          <option value="least_stays">Least Stays</option>
          <option value="featured_first">Featured First</option>
          <option value="newest">Newest</option>
          <option value="updated_desc">Recently Updated</option>
          <option value="display_order">Display Order</option>
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
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish</option>
            <option value="archive">Archive</option>
            <option value="restore">Restore</option>
            <option value="feature">Feature</option>
            <option value="unfeature">Unfeature</option>
            <option value="mark_popular">Mark Popular</option>
            <option value="remove_popular">Remove Popular</option>
            <option value="mark_new">Mark New</option>
            <option value="remove_new">Remove New</option>
          </select>
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
              Click Apply again to confirm
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
      ) : destinations.length === 0 ? (
        <div className="mt-6 border border-border bg-background p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">No destinations match these filters.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-3 py-3">Destination</th>
                <th className="hidden px-3 py-3 md:table-cell">Location</th>
                <th className="px-3 py-3">Stays</th>
                <th className="hidden px-3 py-3 lg:table-cell">Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="hidden px-3 py-3 lg:table-cell">Updated</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest) => (
                <DestinationRow
                  key={dest.id}
                  dest={dest}
                  selected={selectedIds.has(dest.id)}
                  onToggle={() => toggleSelect(dest.id)}
                  onEdit={() => { setEditingId(dest.id); setViewMode('editor'); }}
                  onDelete={() => { setDeleteTarget(dest); setDeleteError(null); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-border bg-background p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-error" strokeWidth={1.5} />
              <div>
                <h3 className="font-serif text-lg font-medium text-foreground">Delete destination?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name}</strong>?
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="mt-3 border border-error bg-error/5 p-3 text-xs text-error">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 bg-error px-4 py-2 text-xs font-medium uppercase tracking-wider text-white disabled:opacity-40"
              >
                {deleteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DestinationRow({ dest, selected, onToggle, onEdit, onDelete }: {
  dest: AdminDestinationRow;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = dest.status || (dest.is_active ? 'published' : 'draft');
  const statusColor = cn(
    'inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
    status === 'published' ? 'bg-accent/10 text-accent'
      : status === 'archived' ? 'bg-secondary text-muted-foreground'
      : 'bg-warning/10 text-warning'
  );

  return (
    <tr className={cn('border-b border-border last:border-0', !dest.is_active && 'bg-secondary/30')}>
      <td className="px-3 py-3">
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          {selected ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 shrink-0 overflow-hidden bg-muted">
            {dest.hero_image && <img src={dest.hero_image} alt={dest.hero_image_alt} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-foreground">{dest.name}</span>
              {dest.is_featured && <Star className="h-3 w-3 fill-accent text-accent" />}
              {dest.is_popular && <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />}
              {dest.is_new && (
                <span className="bg-accent/10 px-1.5 py-0.5 text-[0.5rem] font-medium uppercase tracking-wider text-accent">New</span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">/{dest.slug}</p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">
        <p className="text-sm">{dest.region || dest.name}</p>
        <p className="text-xs">{dest.country}</p>
      </td>
      <td className="px-3 py-3">
        <span className="font-medium text-foreground">{dest.stay_count}</span>
      </td>
      <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">
        {dest.destination_type || '—'}
      </td>
      <td className="px-3 py-3">
        <span className={statusColor}>{status}</span>
      </td>
      <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell">
        {dest.updated_at ? new Date(dest.updated_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/destinations/${dest.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground" title="Preview">
            <Eye className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Edit">
            <Edit className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-error" title="Delete">
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}
