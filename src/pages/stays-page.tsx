import { useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Search, Loader2, AlertCircle, X, Calendar, Users, BedDouble,
  MapPin, SlidersHorizontal, Star, Sparkles, ArrowRight, Plus,
} from 'lucide-react';
import { LiveHotelCard } from '@/components/shared/live-hotel-card';
import { PropertyCard } from '@/components/shared/property-card';
import { DestinationAutocomplete } from '@/components/shared/destination-autocomplete';
import { usePaginatedProperties } from '@/hooks/use-properties';
import { cn } from '@/lib/utils';
import type { HotelSearchResult, DestinationSuggestion } from '@/types/hotel-search';

type SortOption = 'recommended' | 'price-low' | 'price-high' | 'category';

export function StaysPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const destinationFromUrl = searchParams.get('destination') || '';
  const destinationCodeFromUrl = searchParams.get('destinationCode') || '';

  const [destText, setDestText] = useState(destinationFromUrl);
  const [destSuggestion, setDestSuggestion] = useState<DestinationSuggestion | null>(
    destinationFromUrl
      ? { type: 'destination', name: destinationFromUrl, country: '', countryCode: '', destinationCode: destinationCodeFromUrl, displayName: destinationFromUrl }
      : null
  );
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [destError, setDestError] = useState(false);

  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [filterStars, setFilterStars] = useState<number>(0);
  const [filterBoard, setFilterBoard] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Catalog properties from Supabase database with pagination
  const {
    properties: catalogProperties,
    loading: catalogLoading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
  } = usePaginatedProperties(destinationFromUrl || undefined);

  const canSearch = useMemo(() => {
    return !!destSuggestion && !!checkIn && !!checkOut && checkOut > checkIn;
  }, [destSuggestion, checkIn, checkOut]);

  const performSearch = useCallback(async (destCode: string, ci: string, co: string, ad: number, rm: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            destinationCode: destCode,
            checkIn: ci,
            checkOut: co,
            rooms: rm,
            adults: ad,
            children: 0,
            childrenAges: [],
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Search failed';
      if (msg.includes('unavailable') || msg.includes('not configured')) {
        setError('Live availability is temporarily unavailable. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    if (!destSuggestion) {
      setDestError(true);
      return;
    }
    const params = new URLSearchParams();
    params.set('destination', destSuggestion.name);
    params.set('destinationCode', destSuggestion.destinationCode);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', String(adults));
    params.set('rooms', String(rooms));
    setSearchParams(params);
    performSearch(destSuggestion.destinationCode, checkIn, checkOut, adults, rooms);
  };

  const filteredResults = useMemo(() => {
    let filtered = [...results];

    if (filterStars > 0) {
      filtered = filtered.filter((h) => {
        const stars = parseInt(h.categoryCode) || 0;
        return stars >= filterStars;
      });
    }

    if (filterBoard) {
      filtered = filtered.filter((h) => h.boardCode === filterBoard);
    }

    if (maxPrice > 0) {
      filtered = filtered.filter((h) => h.price <= maxPrice);
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'category':
        filtered.sort((a, b) => (parseInt(b.categoryCode) || 0) - (parseInt(a.categoryCode) || 0));
        break;
      case 'recommended':
      default:
        break;
    }

    return filtered;
  }, [results, filterStars, filterBoard, maxPrice, sortBy]);

  const boardOptions = useMemo(() => {
    const boards = new Map<string, string>();
    results.forEach((h) => {
      if (h.boardCode && h.boardName) {
        boards.set(h.boardCode, h.boardName);
      }
    });
    return Array.from(boards.entries());
  }, [results]);

  const priceCeiling = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.ceil(Math.max(...results.map((h) => h.price)) / 100) * 100;
  }, [results]);

  const currentSearchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (destSuggestion) params.set('destinationCode', destSuggestion.destinationCode);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (adults) params.set('adults', String(adults));
    if (rooms) params.set('rooms', String(rooms));
    return params.toString();
  }, [destSuggestion, checkIn, checkOut, adults, rooms]);

  const hasActiveFilters = filterStars > 0 || filterBoard !== '' || maxPrice > 0;

  const clearFilters = () => {
    setFilterStars(0);
    setFilterBoard('');
    setMaxPrice(0);
  };

  return (
    <div className="bg-background pt-24 md:pt-28">
      {/* Header */}
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Elvora Collection</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Find your next extraordinary stay
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Explore our curated collection of extraordinary properties, or search live availability from our hotel partners.
        </p>
      </div>

      {/* Search bar */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="border border-border bg-card p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto_auto_auto]">
            <div>
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Destination</label>
              <div className="flex items-center gap-2 border border-border bg-background px-3 py-2.5 focus-within:border-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <DestinationAutocomplete
                  value={destText}
                  selectedSuggestion={destSuggestion}
                  onSelect={(s) => { setDestSuggestion(s); setDestError(false); }}
                  onTextChange={(t) => { setDestText(t); setDestError(false); }}
                  placeholder="City, hotel, or destination"
                  label=""
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Check-in</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Check-out</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Guests</label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'adult' : 'adults'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Rooms</label>
              <select
                value={rooms}
                onChange={(e) => setRooms(Number(e.target.value))}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={!canSearch || loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-foreground px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Search className="h-4 w-4" strokeWidth={1.5} />}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          {destError && (
            <p className="mt-2 text-xs text-error">Please select a destination from the suggestions.</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 pt-8 lg:px-10">
        {/* LIVE SEARCH RESULTS SECTION */}
        {hasSearched && (
          <div className="mb-12">
            {/* Search summary */}
            <div className="mb-6 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow mb-1">Live Availability</p>
                <h2 className="font-serif text-2xl font-light text-foreground">
                  {destSuggestion ? `Stays in ${destSuggestion.name}` : 'Live Stays'}
                  {checkIn && checkOut && (
                    <span className="ml-3 font-sans text-sm font-normal text-muted-foreground">
                      {checkIn} – {checkOut}
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setResults([]);
                  setError(null);
                  setSearchParams(new URLSearchParams());
                }}
                className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                Clear search
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div>
                <div className="mb-6 flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
                  <p className="mt-4 font-serif text-xl font-light text-foreground">Discovering available stays...</p>
                  <p className="mt-1 text-sm text-muted-foreground">Searching live hotel availability</p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border border-border bg-card overflow-hidden">
                      <div className="aspect-[4/3] animate-pulse bg-muted" />
                      <div className="p-5 space-y-3">
                        <div className="h-5 w-3/4 animate-pulse bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse bg-muted" />
                        <div className="h-3 w-1/3 animate-pulse bg-muted" />
                        <div className="mt-4 flex justify-between border-t border-border pt-4">
                          <div className="h-6 w-20 animate-pulse bg-muted" />
                          <div className="h-8 w-20 animate-pulse bg-muted" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="border border-border bg-secondary p-12 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-4 font-serif text-xl font-light text-foreground">Live availability is temporarily unavailable</p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={handleSearch}
                  className="mt-6 inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background"
                >
                  <Search className="h-4 w-4" strokeWidth={1.5} />
                  Try again
                </button>
              </div>
            )}

            {/* No live results */}
            {!loading && !error && filteredResults.length === 0 && (
              <div className="border border-border bg-secondary p-12 text-center">
                <p className="font-serif text-xl font-light text-foreground">No live stays are available for these dates</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try different dates or search another destination.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => { setCheckIn(''); setCheckOut(''); }}
                    className="inline-flex items-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background"
                  >
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Try different dates
                  </button>
                  <button
                    onClick={() => {
                      setDestText('');
                      setDestSuggestion(null);
                      setResults([]);
                      setHasSearched(false);
                      setSearchParams(new URLSearchParams());
                    }}
                    className="inline-flex items-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background"
                  >
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Search another destination
                  </button>
                </div>
              </div>
            )}

            {/* Live results */}
            {!loading && !error && filteredResults.length > 0 && (
              <div className="flex flex-col gap-8 lg:flex-row">
                {/* Filter sidebar */}
                <aside className="hidden w-64 shrink-0 lg:block">
                  <div className="sticky top-28 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Filters</h3>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-accent hover:underline">Clear</button>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hotel Category</h4>
                      <div className="flex flex-col gap-2">
                        {[0, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setFilterStars(n)}
                            className={cn(
                              'flex items-center gap-2 text-sm transition-colors',
                              filterStars === n ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {n === 0 ? 'Any' : (
                              <span className="flex items-center gap-0.5">
                                {Array.from({ length: n }).map((_, i) => (
                                  <Star key={i} className={cn('h-3.5 w-3.5', filterStars === n ? 'fill-accent text-accent' : '')} strokeWidth={1.5} />
                                ))}
                                <span className="ml-1">{n}+ stars</span>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {boardOptions.length > 1 && (
                      <div>
                        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Meal Plan</h4>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setFilterBoard('')}
                            className={cn('text-sm transition-colors', filterBoard === '' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                          >
                            Any
                          </button>
                          {boardOptions.map(([code, name]) => (
                            <button
                              key={code}
                              onClick={() => setFilterBoard(code)}
                              className={cn('text-sm transition-colors', filterBoard === code ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {priceCeiling > 0 && (
                      <div>
                        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Max Price: {maxPrice > 0 ? maxPrice.toLocaleString() : 'Any'}
                        </h4>
                        <input
                          type="range"
                          min={0}
                          max={priceCeiling}
                          step={50}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full accent-foreground"
                        />
                      </div>
                    )}
                  </div>
                </aside>

                {/* Results grid */}
                <div className="flex-1">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowFilters(true)}
                        className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background lg:hidden"
                      >
                        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                        Filters
                      </button>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{filteredResults.length}</span> {filteredResults.length === 1 ? 'stay' : 'stays'}
                        {destSuggestion && <> in {destSuggestion.name}</>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:block">Sort by</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                      >
                        <option value="recommended">Recommended</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="category">Hotel Category</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
                    {filteredResults.map((hotel, idx) => (
                      <LiveHotelCard
                        key={`${hotel.supplierHotelCode}-${hotel.rateKey}-${idx}`}
                        hotel={hotel}
                        searchParams={currentSearchParams}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROWSE CATALOG SECTION */}
        <div>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {hasSearched ? (
                <>
                  <p className="eyebrow mb-1">Curated by Elvora</p>
                  <h2 className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl">
                    Explore the Elvora Collection
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Browse our handpicked properties. Live availability is confirmed at booking.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow mb-1">Explore Stays</p>
                  <h2 className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl">
                    The Elvora Collection
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {catalogLoading ? 'Loading properties...' : `${totalCount} extraordinary properties, curated by Elvora. Use the search above to search live availability.`}
                  </p>
                </>
              )}
            </div>
            <Link
              to="/destinations"
              className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground hover:text-accent"
            >
              Browse by destination
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {catalogLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="border border-border bg-card overflow-hidden">
                  <div className="aspect-[4/3] animate-pulse bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 animate-pulse bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse bg-muted" />
                  </div>
                </div>
              ))
            ) : (
              catalogProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            )}
          </div>

          {/* Load more / end of results */}
          {!catalogLoading && catalogProperties.length > 0 && (
            <div className="mt-10 flex flex-col items-center gap-3">
              {hasMore ? (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 border border-foreground bg-background px-8 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-foreground hover:text-background disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Load more stays
                    </>
                  )}
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You've reached the end — {catalogProperties.length} of {totalCount} properties shown
                </p>
              )}
            </div>
          )}

          {!catalogLoading && catalogProperties.length === 0 && (
            <div className="border border-border bg-secondary p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">
                Stay inventory is being added for this destination
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try searching for live availability above, or browse all our properties.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && hasSearched && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-light">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-7">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs font-medium uppercase tracking-wider text-accent hover:underline">
                  Clear all filters
                </button>
              )}
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hotel Category</h4>
                <div className="flex flex-col gap-2">
                  {[0, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilterStars(n)}
                      className={cn('flex items-center gap-2 text-sm', filterStars === n ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      {n === 0 ? 'Any' : `${n}+ stars`}
                    </button>
                  ))}
                </div>
              </div>
              {boardOptions.length > 1 && (
                <div>
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Meal Plan</h4>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setFilterBoard('')} className={cn('text-sm', filterBoard === '' ? 'text-foreground' : 'text-muted-foreground')}>Any</button>
                    {boardOptions.map(([code, name]) => (
                      <button key={code} onClick={() => setFilterBoard(code)} className={cn('text-sm', filterBoard === code ? 'text-foreground' : 'text-muted-foreground')}>{name}</button>
                    ))}
                  </div>
                </div>
              )}
              {priceCeiling > 0 && (
                <div>
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Max Price: {maxPrice > 0 ? maxPrice.toLocaleString() : 'Any'}</h4>
                  <input type="range" min={0} max={priceCeiling} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-foreground" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="mt-6 w-full bg-foreground py-3.5 text-xs font-medium uppercase tracking-wider text-background"
            >
              Show {filteredResults.length} stays
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
