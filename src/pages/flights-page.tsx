import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plane, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AirportAutocomplete } from '@/components/shared/airport-autocomplete';
import type { SelectedPlace } from '@/types/duffel-place';

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  cabin: string;
  price: number;
  currency: string;
}

export function FlightsPage() {
  const [searchParams] = useSearchParams();
  const [fromPlace, setFromPlace] = useState<SelectedPlace | null>(null);
  const [toPlace, setToPlace] = useState<SelectedPlace | null>(null);
  const [depart, setDepart] = useState(searchParams.get('depart') || '');
  const [ret, setRet] = useState(searchParams.get('return') || '');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState<'any' | 'economy' | 'premium_economy' | 'business' | 'first'>('any');
  const [tripType, setTripType] = useState<'roundtrip' | 'oneway'>('roundtrip');

  const [results, setResults] = useState<FlightResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const canSearch = useMemo(() => {
    return !!fromPlace && !!toPlace && !!depart && (tripType === 'oneway' || !!ret);
  }, [fromPlace, toPlace, depart, ret, tripType]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch || !fromPlace || !toPlace) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        origin: fromPlace.iataCode,
        destination: toPlace.iataCode,
        departDate: depart,
        returnDate: ret,
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        cabinClass,
        tripType,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flights-search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      if (msg.includes('not configured') || msg.includes('DUFFEL') || msg.includes('unavailable')) {
        setError('FLIGHT_API_NOT_CONFIGURED');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const cabinLabels: Record<string, string> = {
    any: 'Any cabin',
    economy: 'Economy',
    premium_economy: 'Premium Economy',
    business: 'Business',
    first: 'First',
  };

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Flights</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Search flights worldwide
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Real-time flight search powered by Duffel.
        </p>

        {/* Trip type toggle */}
        <div className="mt-8 flex gap-2">
          {(['roundtrip', 'oneway'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTripType(t)}
              className={cn(
                'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                tripType === t
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'roundtrip' ? 'Round Trip' : 'One Way'}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mt-4 border border-border bg-card">
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <div className="relative bg-card px-5 py-4">
              <AirportAutocomplete
                label="From"
                placeholder="City or airport (e.g. JFK)"
                value={fromPlace}
                onChange={setFromPlace}
              />
            </div>
            <div className="relative bg-card px-5 py-4">
              <AirportAutocomplete
                label="To"
                placeholder="City or airport (e.g. LHR)"
                value={toPlace}
                onChange={setToPlace}
              />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Departure
              </label>
              <input
                type="date"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                required
                className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
              />
            </div>
            {tripType === 'roundtrip' && (
              <div className="bg-card px-5 py-4">
                <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Return
                </label>
                <input
                  type="date"
                  value={ret}
                  onChange={(e) => setRet(e.target.value)}
                  required
                  className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !canSearch}
              className="m-2 inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Plane className="h-4 w-4" strokeWidth={1.5} />}
              {loading ? 'Searching...' : 'Search Flights'}
            </button>
          </div>

          {/* Passenger + cabin row */}
          <div className="grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-4">
            <div className="bg-card px-5 py-3">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Adults
              </label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="bg-card px-5 py-3">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Children (2-12)
              </label>
              <select
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="bg-card px-5 py-3">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Infants (under 2)
              </label>
              <select
                value={infants}
                onChange={(e) => setInfants(Number(e.target.value))}
                className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="bg-card px-5 py-3">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Cabin Class
              </label>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value as typeof cabinClass)}
                className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
              >
                {(['any', 'economy', 'premium_economy', 'business', 'first'] as const).map((c) => (
                  <option key={c} value={c}>{cabinLabels[c]}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Complimentary Airport Pickup banner */}
        <div className="mt-6 border border-border bg-secondary p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
              <Plane className="h-5 w-5 text-background" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-accent">
                Complimentary Airport Pickup
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every flight booking includes a free private airport transfer — no extra charge.
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 text-sm text-muted-foreground">Searching for flights...</p>
            </div>
          )}

          {error === 'FLIGHT_API_NOT_CONFIGURED' && (
            <div className="border border-border bg-secondary p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">Flight search is currently unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Flight search is currently unavailable. Please try again later.
              </p>
            </div>
          )}

          {error && error !== 'FLIGHT_API_NOT_CONFIGURED' && (
            <div className="border border-border bg-secondary p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">Live availability is temporarily unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button onClick={handleSearch} className="mt-4 text-sm font-medium uppercase tracking-wider text-accent hover:underline">
                Try Again
              </button>
            </div>
          )}

          {hasSearched && !loading && !error && results && results.length === 0 && (
            <div className="border border-border bg-secondary p-12 text-center">
              <p className="font-serif text-xl font-light text-foreground">No flights found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try different dates or airports.</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-3">
              {results.map((flight) => (
                <div key={flight.id} className="flex items-center justify-between border border-border bg-card p-5">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm font-medium text-foreground">{flight.airline}</p>
                      <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{flight.departureTime}</p>
                        <p className="text-xs text-muted-foreground">{flight.origin}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{flight.arrivalTime}</p>
                        <p className="text-xs text-muted-foreground">{flight.destination}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>{flight.duration}</p>
                      <p>{flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-serif text-xl font-medium text-foreground">{flight.currency} {flight.price}</p>
                      <p className="text-xs text-muted-foreground">{flight.cabin}</p>
                    </div>
                    <button className="bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasSearched && !loading && (
            <div className="border border-border bg-secondary p-12 text-center">
              <Plane className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
              <p className="mt-4 text-sm text-muted-foreground">
                Enter your travel details above to search for live flights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
