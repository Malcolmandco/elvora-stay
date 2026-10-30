import { useState, useEffect, useCallback } from 'react';
import {
  Camera, Search, Loader2, AlertTriangle, Check, X, ChevronLeft, ChevronRight,
  ImageOff, Copy, AlertCircle, ShieldCheck, RefreshCw, Eye, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────

type AuditStatus = 'VERIFIED' | 'UNVERIFIED' | 'BROKEN_IMAGE' | 'POSSIBLE_MISMATCH' | 'NO_IMAGES' | 'DUPLICATE_IMAGE';

interface AuditResult {
  id: string;
  property_id: string;
  property_name: string;
  supplier_hotel_code: string;
  destination_name: string | null;
  city: string | null;
  country: string | null;
  image_count: number;
  audit_status: AuditStatus;
  issues: Array<{ type: string; url: string; detail: string }>;
  has_internal_duplicates: boolean;
  has_cross_hotel_duplicates: boolean;
  has_non_hotelbeds_images: boolean;
  has_broken_urls: boolean;
  url_check_performed: boolean;
  last_synced_at: string | null;
}

interface AuditRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_properties: number;
  stats: Record<string, unknown>;
  api_calls_made: number;
  quota_issues: string | null;
  notes: string | null;
}

interface StatsData {
  run: AuditRun;
  status_counts: Record<string, number>;
  total_results: number;
  top_problem_destinations: Array<{ destination: string; count: number }>;
}

interface PropertyDetail {
  id: string;
  name: string;
  supplier_hotel_code: string;
  destination_name: string | null;
  city: string | null;
  country: string | null;
  images: Array<{ id?: string; url?: string; alt?: string }>;
  last_synced_at: string | null;
  property_type: string | null;
  address: string | null;
  audit?: {
    audit_status: AuditStatus;
    issues: Array<{ type: string; url: string; detail: string }>;
    has_internal_duplicates: boolean;
    has_cross_hotel_duplicates: boolean;
    has_non_hotelbeds_images: boolean;
    has_broken_urls: boolean;
    url_check_performed: boolean;
  };
}

// ─── Status config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AuditStatus, { label: string; color: string; bg: string; icon: typeof Check }> = {
  VERIFIED: { label: 'Verified', color: 'text-accent', bg: 'bg-accent/10', icon: Check },
  UNVERIFIED: { label: 'Unverified', color: 'text-muted-foreground', bg: 'bg-foreground/5', icon: Eye },
  BROKEN_IMAGE: { label: 'Broken Image', color: 'text-error', bg: 'bg-error/10', icon: ImageOff },
  POSSIBLE_MISMATCH: { label: 'Possible Mismatch', color: 'text-warning', bg: 'bg-warning/10', icon: AlertCircle },
  NO_IMAGES: { label: 'No Images', color: 'text-error', bg: 'bg-error/10', icon: ImageOff },
  DUPLICATE_IMAGE: { label: 'Duplicate Image', color: 'text-warning', bg: 'bg-warning/10', icon: Copy },
};

const FILTERS: Array<{ value: 'ALL' | AuditStatus; label: string }> = [
  { value: 'ALL', label: 'All Properties' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'POSSIBLE_MISMATCH', label: 'Possible Mismatch' },
  { value: 'BROKEN_IMAGE', label: 'Broken Images' },
  { value: 'NO_IMAGES', label: 'No Images' },
  { value: 'DUPLICATE_IMAGE', label: 'Duplicate Images' },
];

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-audit`;

// ─── Main Component ─────────────────────────────────────────────────────

export function ImageAuditSection() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [imagesMap, setImagesMap] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'ALL' | AuditStatus>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, page_size: 24, total: 0, total_pages: 0 });
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [propertyDetail, setPropertyDetail] = useState<PropertyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [runProgress, setRunProgress] = useState<{ total: number; offset: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'stats' }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setStats(data);
    } catch {
      setError('Failed to load audit stats');
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'results',
          filter,
          search: search || undefined,
          page,
          pageSize: 24,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResults(data.results || []);
      setImagesMap(data.images_map || {});
      setPagination(data.pagination || { page: 1, page_size: 24, total: 0, total_pages: 0 });
    } catch {
      setError('Failed to load audit results');
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadResults(); }, [loadResults]);

  const handleRunAudit = async () => {
    setRunning(true);
    setError(null);
    setRunProgress({ total: 0, offset: 0 });

    try {
      let offset = 0;
      let hasMore = true;
      const batchSize = 200;

      while (hasMore) {
        const headers = await getAuthHeaders();
        const res = await fetch(API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'run',
            checkUrls: false,
            batchSize,
            offset,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          break;
        }
        setRunProgress({ total: (runProgress?.total || 0) + data.total_in_batch, offset });
        hasMore = data.has_more;
        offset = data.next_offset || offset + batchSize;

        if (data.quota_issues) {
          setError(data.quota_issues);
          break;
        }
      }

      await loadStats();
      setPage(1);
      await loadResults();
    } catch {
      setError('Audit run failed');
    } finally {
      setRunning(false);
      setRunProgress(null);
    }
  };

  const openProperty = async (propertyId: string) => {
    setSelectedProperty(propertyId);
    setGalleryIndex(0);
    setDetailLoading(true);
    setPropertyDetail(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'property_detail', propertyId }),
      });
      const data = await res.json();
      if (!data.error) {
        setPropertyDetail(data.property);
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProperty = () => {
    setSelectedProperty(null);
    setPropertyDetail(null);
    setGalleryIndex(0);
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light text-foreground">Hotel Image Audit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only audit of stored property photographs. No images or records are modified.
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={running}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all',
            running
              ? 'bg-foreground/50 text-background'
              : 'bg-foreground text-background hover:bg-foreground/85',
          )}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
          {running ? 'Running Audit...' : 'Run Audit'}
        </button>
      </div>

      {/* Run progress */}
      {running && runProgress && (
        <div className="border border-accent bg-accent/5 p-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={1.5} />
            <span>Examining properties... {runProgress.total} processed so far</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 border border-error bg-error/5 p-3 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Stats overview */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatBox label="Total Properties" value={stats.total_results} />
            {Object.entries(stats.status_counts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status as AuditStatus] || STATUS_CONFIG.UNVERIFIED;
              return (
                <StatBox key={status} label={cfg.label} value={count} colorClass={cfg.color} />
              );
            })}
          </div>

          {/* Run info */}
          <div className="flex flex-wrap items-center gap-3 border border-border bg-background p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
            <span>Last run: {stats.run.completed_at ? new Date(stats.run.completed_at).toLocaleString() : 'In progress'}</span>
            <span className="text-border">|</span>
            <span>API calls: {stats.run.api_calls_made}</span>
            {stats.run.quota_issues && (
              <>
                <span className="text-border">|</span>
                <span className="text-warning">Quota: {stats.run.quota_issues}</span>
              </>
            )}
          </div>

          {/* Top problem destinations */}
          {stats.top_problem_destinations.length > 0 && (
            <div className="border border-border bg-background p-4">
              <h3 className="font-serif text-sm font-medium text-foreground">Destinations with Most Image Problems</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.top_problem_destinations.map((d) => (
                  <span key={d.destination} className="inline-flex items-center gap-1.5 bg-warning/10 px-3 py-1.5 text-xs text-warning">
                    <MapPin className="h-3 w-3" strokeWidth={1.5} />
                    {d.destination} ({d.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                filter === f.value
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search hotel, code, destination..."
            className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="border border-border bg-background p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <div className="border border-border bg-background p-12 text-center">
          <Camera className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">
            No audit results found. {stats ? 'Try a different filter.' : 'Run an audit to get started.'}
          </p>
        </div>
      ) : (
        <>
          {/* Property grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => {
              const cfg = STATUS_CONFIG[r.audit_status] || STATUS_CONFIG.UNVERIFIED;
              const StatusIcon = cfg.icon;
              const imgs = (imagesMap[r.property_id] as Array<{ url?: string }>) || [];
              const primaryImg = imgs[0]?.url;

              return (
                <button
                  key={r.id}
                  onClick={() => openProperty(r.property_id)}
                  className="group border border-border bg-background text-left transition-all hover:border-accent"
                >
                  {/* Image thumbnail */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={r.property_name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="h-6 w-6 text-border" strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className={cn('absolute left-2 top-2 flex items-center gap-1 px-2 py-1 text-[0.625rem] font-medium uppercase tracking-wider', cfg.bg, cfg.color)}>
                      <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                      {cfg.label}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-foreground">{r.property_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.destination_name || 'Unknown'} · {r.image_count} images
                    </p>
                    <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
                      Code: {r.supplier_hotel_code}
                    </p>
                    {r.issues.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {r.issues.slice(0, 2).map((issue, i) => (
                          <p key={i} className="text-[0.625rem] text-warning">
                            {issue.detail.length > 60 ? issue.detail.slice(0, 60) + '...' : issue.detail}
                          </p>
                        ))}
                        {r.issues.length > 2 && (
                          <p className="text-[0.625rem] text-muted-foreground">
                            +{r.issues.length - 2} more issues
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Prev
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {pagination.total_pages} ({pagination.total} total)
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
                disabled={page === pagination.total_pages}
                className="inline-flex items-center gap-1 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Property detail gallery modal */}
      {selectedProperty && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={closeProperty}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeProperty}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {detailLoading ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : propertyDetail ? (
              <>
                {/* Property header */}
                <div className="border-b border-border p-4">
                  <h3 className="font-serif text-xl font-medium text-foreground pr-8">{propertyDetail.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {propertyDetail.destination_name || 'Unknown'}
                    {propertyDetail.city ? `, ${propertyDetail.city}` : ''}
                    {propertyDetail.country ? `, ${propertyDetail.country}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Code: {propertyDetail.supplier_hotel_code}</span>
                    <span className="text-border">|</span>
                    <span>{propertyDetail.images?.length || 0} images</span>
                    {propertyDetail.last_synced_at && (
                      <>
                        <span className="text-border">|</span>
                        <span>Synced: {new Date(propertyDetail.last_synced_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>

                  {/* Audit status badge */}
                  {propertyDetail.audit && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {(() => {
                        const cfg = STATUS_CONFIG[propertyDetail.audit.audit_status] || STATUS_CONFIG.UNVERIFIED;
                        const StatusIcon = cfg.icon;
                        return (
                          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider', cfg.bg, cfg.color)}>
                            <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Issues */}
                  {propertyDetail.audit && propertyDetail.audit.issues.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {propertyDetail.audit.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" strokeWidth={1.5} />
                          <span>{issue.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gallery */}
                <div className="flex-1 overflow-y-auto p-4">
                  {(propertyDetail.images?.length || 0) > 0 ? (
                    <>
                      {/* Main image */}
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        <img
                          src={propertyDetail.images[galleryIndex]?.url}
                          alt={propertyDetail.images[galleryIndex]?.alt || propertyDetail.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="flex h-full items-center justify-center"><span class="text-sm text-muted-foreground">Image failed to load</span></div>';
                            }
                          }}
                        />
                        {propertyDetail.images.length > 1 && (
                          <>
                            <button
                              onClick={() => setGalleryIndex((galleryIndex - 1 + propertyDetail.images.length) % propertyDetail.images.length)}
                              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-foreground transition-colors hover:bg-background"
                            >
                              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => setGalleryIndex((galleryIndex + 1) % propertyDetail.images.length)}
                              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-foreground transition-colors hover:bg-background"
                            >
                              <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                              {galleryIndex + 1} / {propertyDetail.images.length}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Thumbnail strip */}
                      {propertyDetail.images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                          {propertyDetail.images.map((img, i) => (
                            <button
                              key={img.id || i}
                              onClick={() => setGalleryIndex(i)}
                              className={cn(
                                'h-16 w-20 shrink-0 overflow-hidden border-2 transition-colors',
                                i === galleryIndex ? 'border-accent' : 'border-border',
                              )}
                            >
                              <img
                                src={img.url}
                                alt={img.alt || `Image ${i + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* URL info for current image */}
                      <div className="mt-3 border border-border bg-secondary p-3">
                        <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">Image URL</p>
                        <p className="mt-1 break-all text-xs text-foreground">
                          {propertyDetail.images[galleryIndex]?.url || 'N/A'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-48 items-center justify-center text-center">
                      <div>
                        <ImageOff className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                        <p className="mt-2 text-sm text-muted-foreground">No images stored for this property</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Failed to load property details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Box ───────────────────────────────────────────────────────────

function StatBox({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-serif text-2xl font-medium', colorClass || 'text-foreground')}>{value}</p>
    </div>
  );
}
