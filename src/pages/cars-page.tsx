import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Car, AlertCircle, Loader2, Search, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleCard } from '@/components/shared/vehicle-card';
import { getPublishedVehicles, getVehicleCategories, type VehicleCategory } from '@/data/vehicles';

interface CarResult {
  id: string;
  vehicleName: string;
  supplier: string;
  seats: number;
  doors: number;
  transmission: string;
  fuel: string;
  price: number;
  currency: string;
  pickupLocation: string;
  dropoffLocation: string;
}

export function CarsPage() {
  const [searchParams] = useSearchParams();
  const [pickup, setPickup] = useState(searchParams.get('pickup') || '');
  const [dropoff, setDropoff] = useState(searchParams.get('dropoff') || '');
  const [pickupDate, setPickupDate] = useState(searchParams.get('pickupDate') || '');
  const [dropoffDate, setDropoffDate] = useState(searchParams.get('dropoffDate') || '');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('30');

  const [results, setResults] = useState<CarResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [activeCategory, setActiveCategory] = useState<VehicleCategory | 'All'>('All');

  const allVehicles = useMemo(() => getPublishedVehicles(), []);
  const categories = useMemo(() => getVehicleCategories(), []);

  const filteredVehicles = useMemo(() => {
    if (activeCategory === 'All') return allVehicles;
    return allVehicles.filter((v) => v.category === activeCategory);
  }, [allVehicles, activeCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        pickup,
        dropoff: dropoff || pickup,
        pickupDate,
        dropoffDate,
        pickupTime,
        dropoffTime,
        driverAge,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cars-search?${params.toString()}`,
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
      if (msg.includes('not configured') || msg.includes('DUFFEL')) {
        setError('CAR_API_NOT_CONFIGURED');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Elvora Collection</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Explore our vehicle selection
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Browse our curated fleet of premium vehicles, or search live rental availability from our partners.
        </p>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mt-8 border border-border bg-card">
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <div className="bg-card px-5 py-4">
              <label className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                <Car className="h-3 w-3" strokeWidth={1.5} /> Pickup
              </label>
              <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} required placeholder="City or airport" className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Drop-off</label>
              <input type="text" value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Same as pickup" className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Pickup date</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none" />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Drop-off date</label>
              <input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} required className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none" />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Pickup time</label>
              <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none" />
            </div>
            <div className="bg-card px-5 py-4">
              <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Driver age</label>
              <input type="number" min="21" max="99" value={driverAge} onChange={(e) => setDriverAge(e.target.value)} className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="m-2 inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Search className="h-4 w-4" strokeWidth={1.5} />}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* LIVE SEARCH RESULTS */}
      {hasSearched && (
        <div className="mx-auto max-w-[1400px] px-6 pb-8 lg:px-10">
          <div className="mb-6 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow mb-1">Live Car Rental Results</p>
              <h2 className="font-serif text-2xl font-light text-foreground">
                {pickup || 'Your search'}
                {pickupDate && dropoffDate && (
                  <span className="ml-3 font-sans text-sm font-normal text-muted-foreground">
                    {pickupDate} – {dropoffDate}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={() => {
                setHasSearched(false);
                setResults(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              Clear search
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">Searching for rental cars...</p>
              <p className="mt-1 text-sm text-muted-foreground">Checking live availability from our partners</p>
            </div>
          )}

          {error === 'CAR_API_NOT_CONFIGURED' && (
            <div className="border border-border bg-secondary p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">Live car availability is temporarily unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Our car rental partner is not yet connected. Browse the Elvora Collection below.
              </p>
            </div>
          )}

          {error && error !== 'CAR_API_NOT_CONFIGURED' && (
            <div className="border border-border bg-secondary p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-light text-foreground">Live car availability is temporarily unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button onClick={handleSearch} className="mt-4 text-sm font-medium uppercase tracking-wider text-accent hover:underline">Try Again</button>
            </div>
          )}

          {hasSearched && !loading && !error && results && results.length === 0 && (
            <div className="border border-border bg-secondary p-12 text-center">
              <p className="font-serif text-xl font-light text-foreground">No cars are available for these dates and location</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try different dates or locations. Meanwhile, explore the Elvora Collection below.
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-3">
              {results.map((car) => (
                <div key={car.id} className="flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex h-16 w-24 items-center justify-center bg-secondary">
                      <Car className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{car.vehicleName}</p>
                      <p className="text-xs text-muted-foreground">{car.supplier}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{car.seats} seats · {car.doors} doors · {car.transmission} · {car.fuel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{car.pickupLocation} → {car.dropoffLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="font-serif text-xl font-medium text-foreground">{car.currency} {car.price}</p>
                      <p className="text-xs text-muted-foreground">per day</p>
                    </div>
                    <button className="bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85">Select</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BROWSE CATALOG */}
      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-1">{hasSearched ? 'Curated by Elvora' : 'Explore Elvora Vehicles'}</p>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl">
              {hasSearched ? 'Explore Elvora vehicles' : 'The Elvora Fleet'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filteredVehicles.length} premium vehicles curated by Elvora. Use the search above to check live rental availability.
            </p>
          </div>
          <Link
            to="/stays"
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground hover:text-accent"
          >
            Browse stays
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('All')}
            className={cn(
              'border px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
              activeCategory === 'All'
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'border px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                activeCategory === cat
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Vehicle grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </div>
  );
}
