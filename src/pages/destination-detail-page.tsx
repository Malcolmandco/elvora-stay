import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, MapPin, Search, ArrowLeft, Sparkles, Plus, Loader2,
  Check, Calendar, Lightbulb, Compass,
} from 'lucide-react';
import { useDestinationBySlug, useOtherDestinations } from '@/hooks/use-destinations';
import { usePaginatedProperties } from '@/hooks/use-properties';
import { getHotelbedsCode } from '@/data/hotelbeds-destinations';
import { PropertyCard } from '@/components/shared/property-card';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/10490921/pexels-photo-10490921.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop';

export function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { destination, loading: destLoading, error: destError } = useDestinationBySlug(slug);
  const { destinations: otherDestinations } = useOtherDestinations(slug, 4);

  const hbCode = destination ? getHotelbedsCode(destination.name) : null;

  const { properties: catalogStays, loading: staysLoading, loadingMore, hasMore, totalCount, loadMore } = usePaginatedProperties(slug);

  const handleSearchStays = () => {
    if (!destination) return;
    const params = new URLSearchParams();
    params.set('destination', destination.name);
    if (hbCode) params.set('destinationCode', hbCode);
    navigate(`/stays?${params.toString()}`);
  };

  if (destLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  if (destError || !destination) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-24 text-center">
        <h1 className="font-serif text-3xl font-light text-foreground">Destination not found</h1>
        <Link to="/destinations" className="mt-6 text-sm font-medium uppercase tracking-wider text-accent hover:underline">
          All destinations
        </Link>
      </div>
    );
  }

  const hasEditorialContent = destination.editorialTitle || destination.editorialDescription || destination.travelStory;
  const hasHighlights = destination.highlights && destination.highlights.length > 0;
  const hasPracticalInfo = destination.bestTimeToVisit || destination.whyVisit;
  const hasExperiences = destination.experiences && destination.experiences.length > 0;
  const hasLocalTips = destination.localTips && destination.localTips.length > 0;

  return (
    <div className="bg-background pt-20 md:pt-24">
      {/* Hero */}
      <div className="relative flex min-h-[50vh] items-end overflow-hidden bg-foreground">
        <div className="absolute inset-0">
          <img
            src={destination.image || FALLBACK_IMAGE}
            alt={destination.imageAlt || destination.name}
            className="h-full w-full object-cover"
            fetchPriority="high"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-10 lg:px-10">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.25em] text-white/70">
            {destination.country}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-light leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
            {destination.name}
          </h1>
          {destination.tagline && (
            <p className="mt-3 font-serif text-xl font-light italic text-white/80">
              {destination.tagline}
            </p>
          )}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
            {destination.longDescription || destination.shortDescription}
          </p>
          {destination.stayCount !== undefined && destination.stayCount > 0 && (
            <p className="mt-4 font-sans text-xs uppercase tracking-wider text-white/60">
              {destination.stayCount} {destination.stayCount === 1 ? 'stay' : 'stays'} available
            </p>
          )}
        </div>
      </div>

      {/* Editorial section */}
      {hasEditorialContent && (
        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-[900px] px-6 lg:px-10">
            {destination.editorialTitle && (
              <h2 className="font-serif text-3xl font-light text-foreground md:text-4xl">
                {destination.editorialTitle}
              </h2>
            )}
            {destination.editorialDescription && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {destination.editorialDescription}
              </p>
            )}
            {destination.travelStory && (
              <div className="mt-8 font-serif text-base leading-relaxed text-foreground/80">
                {destination.travelStory.split('\n').map((para, i) => (
                  para.trim() ? <p key={i} className="mb-4">{para}</p> : null
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Highlights + Practical info */}
      {(hasHighlights || hasPracticalInfo) && (
        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* Highlights */}
              {hasHighlights && (
                <div>
                  <h2 className="font-serif text-2xl font-medium text-foreground">Highlights</h2>
                  <ul className="mt-6 space-y-3">
                    {destination.highlights!.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Practical info */}
              {hasPracticalInfo && (
                <div className="space-y-6">
                  {destination.bestTimeToVisit && (
                    <div>
                      <h3 className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Calendar className="h-4 w-4" strokeWidth={1.5} />
                        Best Time to Visit
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{destination.bestTimeToVisit}</p>
                    </div>
                  )}
                  {destination.whyVisit && (
                    <div>
                      <h3 className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Compass className="h-4 w-4" strokeWidth={1.5} />
                        Why Visit
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{destination.whyVisit}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Experiences */}
      {hasExperiences && (
        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
            <h2 className="font-serif text-2xl font-medium text-foreground">Experiences</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destination.experiences!.map((exp, i) => (
                <div key={i} className="border border-border bg-card p-5">
                  <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{exp}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Local tips */}
      {hasLocalTips && (
        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-[900px] px-6 lg:px-10">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-medium text-foreground">
              <Lightbulb className="h-5 w-5 text-accent" strokeWidth={1.5} />
              Local Tips
            </h2>
            <div className="mt-6 space-y-3">
              {destination.localTips!.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-sans text-xs font-medium text-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stays section */}
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">Elvora Collection</p>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl">
              Stays in {destination.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {staysLoading
                ? `Loading stays in ${destination.name}...`
                : catalogStays.length > 0
                ? `${totalCount} curated properties in ${destination.name}. Search live availability by clicking below.`
                : `Explore our curated stays and search live availability for ${destination.name}.`}
            </p>
          </div>
          <button
            onClick={handleSearchStays}
            className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
            Search stays in {destination.name}
          </button>
        </div>

        {/* Catalog properties */}
        {staysLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="border border-border bg-card overflow-hidden">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 animate-pulse bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogStays.length > 0 ? (
          <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {catalogStays.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {/* Load more / end of results */}
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
                You've reached the end — {catalogStays.length} of {totalCount} properties shown
              </p>
            )}
          </div>
          </>
        ) : (
          <div className="border border-border bg-secondary p-12 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-xl font-light text-foreground">
              Stay inventory is being added for {destination.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hbCode
                ? `Use the search button above to search live hotel availability for ${destination.name}.`
                : 'Browse our other destinations or search all stays.'}
            </p>
            <Link
              to="/stays"
              className="mt-6 inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Browse all stays
            </Link>
          </div>
        )}

        {/* Live search CTA */}
        {hbCode && catalogStays.length > 0 && (
          <div className="mt-10 border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Looking for specific dates? Search live hotel availability from our accommodation partners.
            </p>
            <button
              onClick={handleSearchStays}
              className="mt-4 inline-flex items-center gap-2 border border-foreground bg-background px-6 py-3 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-foreground hover:text-background"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Search live availability
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Other destinations */}
      <section className="border-t border-border bg-secondary py-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <h2 className="mb-8 font-serif text-3xl font-light text-foreground">
            Explore other destinations
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {otherDestinations.map((d) => (
              <Link
                key={d.id}
                to={`/destinations/${d.slug}`}
                className="group relative aspect-[3/4] overflow-hidden bg-muted"
              >
                <img
                  src={d.image || FALLBACK_IMAGE}
                  alt={d.imageAlt || d.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform [transition-duration:1200ms] group-hover:scale-[1.05]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-serif text-xl font-medium text-white">{d.name}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/destinations" className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground hover:text-accent">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              All destinations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
