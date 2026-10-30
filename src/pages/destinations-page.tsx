import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDestinations } from '@/hooks/use-destinations';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/10490921/pexels-photo-10490921.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop';

export function DestinationsPage() {
  const { destinations, loading, error } = useDestinations();

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Destinations</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Discover the world
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Places worth going somewhere for. Explore our curated destinations and
          find your extraordinary stay.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-light text-foreground">
              Unable to load destinations
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && destinations.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-light text-foreground">
              No destinations available
            </p>
          </div>
        )}

        {!loading && !error && destinations.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
            {destinations.map((dest) => (
              <Link
                key={dest.id}
                to={`/destinations/${dest.slug}`}
                className="group relative aspect-[4/5] overflow-hidden bg-muted"
              >
                <img
                  src={dest.image || FALLBACK_IMAGE}
                  alt={dest.imageAlt || dest.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform ease-out group-hover:scale-[1.05] [transition-duration:1500ms]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-white/60">
                    {dest.country}
                  </p>
                  <h2 className="mt-1 font-serif text-3xl font-medium text-white">
                    {dest.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/70">{dest.shortDescription}</p>
                  <p className="mt-3 font-sans text-xs uppercase tracking-wider text-white/60">
                    {dest.stayCount} {dest.stayCount === 1 ? 'stay' : 'stays'}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-white/90">
                    Explore
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
