import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Loader2, AlertTriangle, Check, ArrowRight, ArrowLeft, RefreshCw,
  ImageOff, Eye, ShieldCheck, AlertCircle, SkipForward,
  CheckCircle2, Clock, MapPin, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────

interface RepairQueueItem {
  id: string;
  name: string;
  supplier_hotel_code: string;
  destination_name: string | null;
  city: string | null;
  country: string | null;
  image_count: number;
  current_image_url: string;
  last_synced_at: string | null;
  editorial_override: boolean;
  has_elvora_images: boolean;
  repair_status: 'pending' | 'repaired';
}

interface ReplacementImage {
  id: string;
  url: string;
  alt: string;
  type_code?: string;
  type_description?: string;
}

interface FetchResult {
  property: {
    id: string;
    name: string;
    supplier_hotel_code: string;
    destination_name: string | null;
    city: string | null;
    country: string | null;
    current_images: Array<{ url?: string; alt?: string }>;
    editorial_override: boolean;
    has_elvora_images: boolean;
  };
  found: boolean;
  hotel_name?: string;
  replacement_images: ReplacementImage[];
  evidence: string;
  api_calls_made: number;
  no_images_available?: boolean;
}

interface RepairHistoryItem {
  id: string;
  property_id: string;
  supplier_hotel_code: string;
  previous_images: unknown;
  replacement_images: unknown;
  source: string;
  verification_evidence: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-audit`;

/** Parse a fetch response, handling non-JSON gracefully. */
async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: `Server returned ${res.status} with non-JSON response` };
  }
}

// ─── Error Boundary ─────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RepairErrorBoundary extends React.Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4">
          <div className="border border-destructive bg-destructive/5 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-foreground">
              This section encountered an error
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-4 inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

// We need React for the class component

// ─── Main Component ─────────────────────────────────────────────────────

export function ImageRepairSection() {
  const [queue, setQueue] = useState<RepairQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<string | null>(null);
  const [view, setView] = useState<'queue' | 'review' | 'history'>('queue');
  const [history, setHistory] = useState<RepairHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [quotaError, setQuotaError] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'repair_queue' }),
      });
      const data = await parseJsonSafe(res);
      if (data.error) {
        setError(String(data.error));
        return;
      }
      setQueue((data.properties as RepairQueueItem[]) || []);
    } catch {
      setError('Failed to load repair queue. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'repair_history' }),
      });
      const data = await parseJsonSafe(res);
      if (!data.error) {
        setHistory((data.history as RepairHistoryItem[]) || []);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => { if (view === 'history') loadHistory(); }, [view, loadHistory]);

  const handleFetchReplacement = async (propertyId: string) => {
    setSelectedId(propertyId);
    setFetchResult(null);
    setFetchError(null);
    setApproveResult(null);
    setQuotaError(false);
    setFetchLoading(true);
    setView('review');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'fetch_replacement', propertyId }),
      });
      const data = await parseJsonSafe(res);
      if (data.error) {
        setFetchError(String(data.error));
        if (data.quota_issue) setQuotaError(true);
        return;
      }
      setFetchResult(data as unknown as FetchResult);
    } catch {
      setFetchError('Failed to contact the image audit service. Check your connection and try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!fetchResult || !selectedId) return;
    setApproving(true);
    setApproveResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'approve_repair',
          propertyId: selectedId,
          replacementImages: fetchResult.replacement_images,
          evidence: fetchResult.evidence,
        }),
      });
      const data = await parseJsonSafe(res);
      if (data.error) {
        setApproveResult(`Error: ${String(data.error)}`);
      } else {
        setApproveResult(`Success: ${String(data.message || 'Images updated')}`);
        setQueue((q) => q.map((item) =>
          item.id === selectedId ? { ...item, repair_status: 'repaired' as const } : item,
        ));
      }
    } catch {
      setApproveResult('Failed to submit approval. Check your connection and try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleSkip = async (reason?: string) => {
    if (!selectedId) return;
    setApproving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'skip_repair', propertyId: selectedId, reason }),
      });
      const data = await parseJsonSafe(res);
      if (data.error) {
        setApproveResult(`Error: ${String(data.error)}`);
      } else {
        setApproveResult('Property skipped. No images were changed.');
        setQueue((q) => q.map((item) =>
          item.id === selectedId ? { ...item, repair_status: 'repaired' as const } : item,
        ));
      }
    } catch {
      setApproveResult('Failed to skip property. Check your connection and try again.');
    } finally {
      setApproving(false);
    }
  };

  const pendingCount = queue.filter((q) => q.repair_status === 'pending').length;
  const repairedCount = queue.filter((q) => q.repair_status === 'repaired').length;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <RepairErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-serif text-2xl font-light text-foreground">Image Repair Workflow</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Targeted repair for properties using generic stock photos. Each replacement requires explicit approval.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border bg-background p-3">
            <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-1 font-serif text-2xl font-medium text-foreground">{queue.length}</p>
          </div>
          <div className="border border-border bg-background p-3">
            <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 font-serif text-2xl font-medium text-warning">{pendingCount}</p>
          </div>
          <div className="border border-border bg-background p-3">
            <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">Repaired</p>
            <p className="mt-1 font-serif text-2xl font-medium text-accent">{repairedCount}</p>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1.5">
          {([
            { v: 'queue', label: 'Repair Queue' },
            { v: 'review', label: 'Review' },
            { v: 'history', label: 'History' },
          ] as const).map((tab) => (
            <button
              key={tab.v}
              onClick={() => setView(tab.v)}
              className={cn(
                'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                view === tab.v
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error with retry */}
        {error && (
          <div className="border border-destructive bg-destructive/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{error}</p>
                <button
                  onClick={() => loadQueue()}
                  className="mt-3 inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
                >
                  <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Queue View ─────────────────────────────────────────────── */}
        {view === 'queue' && !error && (
          loading ? (
            <div className="border border-border bg-background p-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading repair queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="border border-border bg-background p-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-accent" strokeWidth={1.5} />
              <p className="mt-4 text-sm text-muted-foreground">No properties need image repair.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 border border-border bg-background p-3 transition-colors',
                    item.repair_status === 'repaired' && 'opacity-60',
                  )}
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-20 shrink-0 overflow-hidden bg-muted">
                    {item.current_image_url ? (
                      <img
                        src={item.current_image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-border" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.destination_name || 'Unknown'}
                      {item.city ? `, ${item.city}` : ''}
                    </p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      Code: {item.supplier_hotel_code} · {item.image_count} image(s)
                      {item.editorial_override && ' · Has editorial overrides'}
                    </p>
                  </div>

                  {/* Status */}
                  {item.repair_status === 'repaired' ? (
                    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-accent">
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      Repaired
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFetchReplacement(item.id)}
                      className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── Review View ────────────────────────────────────────────── */}
        {view === 'review' && (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => { setView('queue'); setSelectedId(null); setFetchResult(null); setApproveResult(null); setFetchError(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Back to Queue
            </button>

            {/* Loading */}
            {fetchLoading && (
              <div className="border border-border bg-background p-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Fetching images from Hotelbeds Content API...</p>
              </div>
            )}

            {/* Fetch error with retry */}
            {fetchError && !fetchLoading && (
              <div className={cn(
                'border p-4',
                quotaError ? 'border-warning bg-warning/5' : 'border-destructive bg-destructive/5',
              )}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', quotaError ? 'text-warning' : 'text-destructive')} strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{fetchError}</p>
                    {quotaError && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        The operation was stopped to respect Hotelbeds API quota limits. No credentials were changed.
                        Try again later or use a different credential.
                      </p>
                    )}
                    <button
                      onClick={() => selectedId && handleFetchReplacement(selectedId)}
                      className="mt-3 inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
                    >
                      <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fetch result */}
            {fetchResult && !fetchLoading && (
              <>
                {/* Property info header */}
                <div className="border border-border bg-background p-4">
                  <h3 className="font-serif text-xl font-medium text-foreground">{fetchResult.property.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {fetchResult.property.destination_name || 'Unknown'}
                      {fetchResult.property.city ? `, ${fetchResult.property.city}` : ''}
                    </span>
                    <span className="text-border">|</span>
                    <span>Code: {fetchResult.property.supplier_hotel_code}</span>
                    {fetchResult.hotel_name && fetchResult.hotel_name !== fetchResult.property.name && (
                      <>
                        <span className="text-border">|</span>
                        <span>API name: {fetchResult.hotel_name}</span>
                      </>
                    )}
                  </div>
                  {fetchResult.property.editorial_override && (
                    <p className="mt-2 text-xs text-warning">
                      <AlertCircle className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
                      This property has editorial overrides. Elvora-specific images will be preserved.
                    </p>
                  )}
                </div>

                {/* No images available */}
                {fetchResult.no_images_available && (
                  <div className="border border-warning bg-warning/5 p-4">
                    <div className="flex items-start gap-2">
                      <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm text-foreground">No photographs available from Hotelbeds</p>
                        <p className="mt-1 text-xs text-muted-foreground">{fetchResult.evidence}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          This property will be marked as requiring manual image review. No images will be changed.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleSkip('No Hotelbeds images available for this hotel code')}
                        disabled={approving}
                        className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Mark for Manual Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Replacement images available */}
                {!fetchResult.no_images_available && fetchResult.replacement_images.length > 0 && (
                  <>
                    {/* Comparison: Current vs Proposed */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Current images */}
                      <div className="border border-border bg-background p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Current Images (Generic Fallback)
                        </p>
                        <div className="space-y-2">
                          {(fetchResult.property.current_images || []).map((img, i) => (
                            <div key={i} className="relative aspect-video overflow-hidden bg-muted">
                              <img
                                src={img.url}
                                alt={img.alt || 'Current image'}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 px-2 py-1 text-[0.625rem] uppercase tracking-wider text-white">
                                Generic Stock Photo
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proposed replacement images */}
                      <div className="border border-accent bg-accent/5 p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">
                          Proposed Replacements (Hotelbeds)
                        </p>
                        <div className="space-y-2">
                          {fetchResult.replacement_images.map((img, i) => (
                            <div key={i} className="relative aspect-video overflow-hidden bg-muted">
                              <img
                                src={img.url}
                                alt={img.alt}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-accent/80 px-2 py-1 text-[0.625rem] uppercase tracking-wider text-white">
                                {img.type_description || 'Hotel Photo'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Evidence panel */}
                    <div className="border border-border bg-secondary p-4">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="text-xs font-medium uppercase tracking-wider text-foreground">Verification Evidence</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{fetchResult.evidence}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            API calls made: {fetchResult.api_calls_made} (single hotel lookup, not a catalog sync)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Approve result message */}
                    {approveResult && (
                      <div className={cn(
                        'border p-3 text-sm',
                        approveResult.startsWith('Error')
                          ? 'border-destructive bg-destructive/5 text-destructive'
                          : 'border-accent bg-accent/5 text-accent',
                      )}>
                        {approveResult}
                      </div>
                    )}

                    {/* Action buttons */}
                    {!approveResult && (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={handleApprove}
                          disabled={approving}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all',
                            approving
                              ? 'bg-foreground/50 text-background'
                              : 'bg-accent text-white hover:bg-accent/90',
                          )}
                        >
                          {approving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                          ) : (
                            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                          Approve Replacement
                        </button>
                        <button
                          onClick={() => handleSkip('Admin reviewed and chose to skip')}
                          disabled={approving}
                          className="inline-flex items-center justify-center gap-2 border border-border px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Skip Property
                        </button>
                      </div>
                    )}

                    {/* After approval: next property */}
                    {approveResult && !approveResult.startsWith('Error') && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const next = queue.find((q) => q.repair_status === 'pending' && q.id !== selectedId);
                            if (next) {
                              handleFetchReplacement(next.id);
                            } else {
                              setView('queue');
                              loadQueue();
                            }
                          }}
                          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                        >
                          Next Property
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => { setView('queue'); loadQueue(); setSelectedId(null); setFetchResult(null); setApproveResult(null); }}
                          className="inline-flex items-center gap-2 border border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Back to Queue
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Hotel not found */}
                {!fetchResult.found && !fetchResult.no_images_available && (
                  <div className="border border-warning bg-warning/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm text-foreground">Hotel not found in Hotelbeds</p>
                        <p className="mt-1 text-xs text-muted-foreground">{fetchResult.evidence}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSkip('Hotel not found in Hotelbeds Content API')}
                      disabled={approving}
                      className="mt-4 inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Skip
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!fetchLoading && !fetchResult && !fetchError && (
              <div className="border border-border bg-background p-12 text-center">
                <Camera className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-muted-foreground">Select a property from the queue to review its replacement images.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── History View ───────────────────────────────────────────── */}
        {view === 'history' && (
          historyLoading ? (
            <div className="border border-border bg-background p-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="border border-border bg-background p-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
              <p className="mt-4 text-sm text-muted-foreground">No repair history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="border border-border bg-background p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.property_id} (Code: {item.supplier_hotel_code})
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.approved_at ? new Date(item.approved_at).toLocaleString() : 'Pending'}
                        {item.approved_by && ` · by ${item.approved_by}`}
                      </p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-wider',
                      item.source === 'skipped' ? 'bg-foreground/5 text-muted-foreground' : 'bg-accent/10 text-accent',
                    )}>
                      {item.source === 'skipped' ? (
                        <><SkipForward className="h-3 w-3" strokeWidth={1.5} /> Skipped</>
                      ) : (
                        <><Check className="h-3 w-3" strokeWidth={1.5} /> Repaired</>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.verification_evidence}</p>
                  {item.notes && <p className="mt-1 text-xs text-muted-foreground italic">{item.notes}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </RepairErrorBoundary>
  );
}
