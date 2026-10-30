import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Star, MapPin, BedDouble, Bath, Users, Maximize,
  Check, ChevronLeft, ChevronRight, ArrowRight,
  Wifi, Waves, Utensils, Car, Snowflake, Dumbbell,
  Sparkles, ShieldCheck, Calendar, Heart, ImageIcon, ArrowRightCircle
} from 'lucide-react';
import { getPropertyBySlugFallback, getReviewsByProperty } from '@/data/properties';
import { usePropertyBySlug, useRelatedProperties } from '@/hooks/use-properties';
import { PropertyCard, FavoriteButton } from '@/components/shared/property-card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const amenityIcons: Record<string, LucideIcon> = {
  'WiFi': Wifi,
  'Pool': Waves,
  'Private Pool': Waves,
  'Infinity Pool': Waves,
  'Beach Access': Waves,
  'Ocean View': Waves,
  'Waterfront': Waves,
  'Kitchen': Utensils,
  'Parking': Car,
  'Air Conditioning': Snowflake,
  'Gym': Dumbbell,
  'Spa': Sparkles,
  'Concierge': ShieldCheck,
  'Security': ShieldCheck,
};

export function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { property: dbProperty, loading } = usePropertyBySlug(slug);
  const fallbackProperty = slug && !dbProperty ? getPropertyBySlugFallback(slug) : undefined;
  const property = dbProperty ?? fallbackProperty ?? undefined;
  const { properties: relatedProperties } = useRelatedProperties(property ?? null, 3);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const ci = searchParams.get('checkIn');
    const co = searchParams.get('checkOut');
    const g = searchParams.get('guests');
    const r = searchParams.get('rooms');
    if (ci || co || g || r) {
      // Params preserved for potential pre-fill on booking page
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-24 text-center">
        <h1 className="font-serif text-3xl font-light text-foreground">Stay not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This property may no longer be available.</p>
        <Link to="/stays" className="mt-6 text-sm font-medium uppercase tracking-wider text-accent hover:underline">
          Browse all stays
        </Link>
      </div>
    );
  }

  const reviews = getReviewsByProperty(property.id);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % property.images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + property.images.length) % property.images.length);

  return (
    <div className="bg-background pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1400px] px-6 py-4 lg:px-10">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/stays" className="hover:text-foreground">Stays</Link>
          <span>/</span>
          <Link to={`/destinations/${property.destinationSlug}`} className="hover:text-foreground">{property.destinationName}</Link>
          <span>/</span>
          <span className="text-foreground">{property.name}</span>
        </nav>
      </div>

      {/* Title section */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              {property.propertyType}
            </span>
            <h1 className="mt-1 font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {property.name}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              {property.city}, {property.country}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {property.rating !== null && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={0} />
                <span className="font-sans text-sm font-medium text-foreground">{property.rating}</span>
                {property.reviewCount !== null && (
                  <span className="font-sans text-sm text-muted-foreground">({property.reviewCount} reviews)</span>
                )}
              </div>
            )}
            <FavoriteButton propertyId={property.id} />
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10">
        {property.images.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[480px]">
              {/* Main image */}
              <div className="relative overflow-hidden bg-muted md:col-span-2 md:row-span-2">
                <img
                  src={property.images[0].url}
                  alt={property.images[0].alt}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
              {/* Secondary images */}
              {property.images.slice(1, 5).map((img, idx) => (
                <div key={img.id} className="relative hidden overflow-hidden bg-muted md:block">
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Mobile gallery with navigation */}
            <div className="relative mt-4 md:hidden">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={property.images[activeImage].url}
                  alt={property.images[activeImage].alt}
                  className="h-full w-full object-cover"
                />
              </div>
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 text-foreground backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={nextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 text-foreground backdrop-blur-sm"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 text-xs text-white">
                    {activeImage + 1} / {property.images.length}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-[200px] items-center justify-center bg-muted md:h-[400px]">
            <ImageIcon className="h-12 w-12 text-border" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Content + booking CTA panel */}
      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-6 sm:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="mt-2 font-sans text-sm font-medium text-foreground">{property.maxGuests ?? '—'}</span>
                <span className="text-xs text-muted-foreground">Guests</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <BedDouble className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="mt-2 font-sans text-sm font-medium text-foreground">{property.bedrooms ?? '—'}</span>
                <span className="text-xs text-muted-foreground">Bedrooms</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Maximize className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="mt-2 font-sans text-sm font-medium text-foreground">{property.beds ?? '—'}</span>
                <span className="text-xs text-muted-foreground">Beds</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Bath className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="mt-2 font-sans text-sm font-medium text-foreground">{property.bathrooms ?? '—'}</span>
                <span className="text-xs text-muted-foreground">Bathrooms</span>
              </div>
            </div>

            {/* Description */}
            {property.longDescription ? (
              <section className="py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">About this stay</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {property.longDescription}
                </p>
              </section>
            ) : (
              <section className="py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">About this stay</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Detailed description for this property is not yet available.
                </p>
              </section>
            )}

            {/* Location */}
            {(property.address || property.latitude !== null) && (
              <section className="border-t border-border py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">Location</h2>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {property.address && <p>{property.address}</p>}
                  <p>{[property.city, property.country].filter(Boolean).join(', ')}</p>
                  {property.latitude !== null && property.longitude !== null && (
                    <p className="text-xs">Coordinates: {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}</p>
                  )}
                </div>
              </section>
            )}

            {/* Amenities */}
            <section className="border-t border-border py-8">
              <h2 className="font-serif text-2xl font-medium text-foreground">Amenities</h2>
              {property.amenities.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {property.amenities.map((amenity) => {
                    const Icon = amenityIcons[amenity] || Check;
                    return (
                      <div key={amenity} className="flex items-center gap-2 text-sm text-foreground">
                        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        {amenity}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Amenity information for this property is not yet available.</p>
              )}
            </section>

            {/* Policies */}
            <section className="border-t border-border py-8">
              <h2 className="font-serif text-2xl font-medium text-foreground">House Rules & Policies</h2>
              <div className="mt-5 space-y-6">
                {property.houseRules.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">House Rules</h3>
                    <ul className="space-y-2">
                      {property.houseRules.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {property.policies.checkIn && (
                    <div>
                      <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Check-in</h3>
                      <p className="text-sm text-foreground">{property.policies.checkIn}</p>
                    </div>
                  )}
                  {property.policies.checkOut && (
                    <div>
                      <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Check-out</h3>
                      <p className="text-sm text-foreground">{property.policies.checkOut}</p>
                    </div>
                  )}
                  {property.policies.cancellation && (
                    <div className="sm:col-span-2">
                      <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Cancellation</h3>
                      <p className="text-sm text-foreground">{property.policies.cancellation}</p>
                    </div>
                  )}
                  {property.policies.damagePolicy && (
                    <div className="sm:col-span-2">
                      <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Damage Policy</h3>
                      <p className="text-sm text-foreground">{property.policies.damagePolicy}</p>
                    </div>
                  )}
                  {(!property.policies.checkIn && !property.policies.checkOut && !property.policies.cancellation && !property.policies.damagePolicy && property.houseRules.length === 0) && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Policy information for this property is not yet available.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Reviews */}
            <section className="border-t border-border py-8">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-2xl font-medium text-foreground">Reviews</h2>
                {property.rating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={0} />
                    <span className="font-sans text-sm font-medium">{property.rating}</span>
                    {property.reviewCount !== null && (
                      <span className="font-sans text-sm text-muted-foreground">({property.reviewCount})</span>
                    )}
                  </div>
                )}
              </div>
              {reviews.length > 0 ? (
                <div className="mt-5 space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-border pb-6 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-sans text-xs font-medium text-foreground">
                          {review.guestInitials}
                        </div>
                        <div>
                          <p className="font-sans text-sm font-medium text-foreground">{review.guestName}</p>
                          <p className="text-xs text-muted-foreground">{review.date}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-3 w-3',
                                i < review.rating ? 'fill-accent text-accent' : 'text-border'
                              )}
                              strokeWidth={0}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="mt-3 font-serif text-lg font-medium text-foreground">{review.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No reviews yet for this property.</p>
              )}
            </section>
          </div>

          {/* Booking CTA panel — sticky on desktop */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border p-6 shadow-sm">
              {property.rating !== null && (
                <div className="mb-3 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={0} />
                  <span className="font-sans text-sm font-medium">{property.rating}</span>
                  {property.reviewCount !== null && (
                    <span className="font-sans text-sm text-muted-foreground">({property.reviewCount} reviews)</span>
                  )}
                </div>
              )}

              {property.pricePerNight !== null && (
                <div className="mb-4 flex items-baseline gap-1 border-b border-border pb-4">
                  <span className="font-sans text-xs text-muted-foreground">From</span>
                  <span className="font-serif text-2xl font-medium text-foreground">
                    ${property.pricePerNight.toLocaleString()}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">/ night</span>
                </div>
              )}

              <Link
                to={`/stays/${property.slug}/book`}
                className="flex w-full items-center justify-center gap-2 bg-foreground py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
              >
                <Calendar className="h-4 w-4" strokeWidth={1.5} />
                Book Now
              </Link>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Select dates and search live room availability
              </p>

              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  Secure booking through Elvora Stay
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related properties */}
      {relatedProperties.length > 0 && (
        <section className="border-t border-border bg-secondary py-16">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl font-light text-foreground">
                More stays in {property.destinationName}
              </h2>
              <Link
                to={`/destinations/${property.destinationSlug}`}
                className="link-underline text-sm text-foreground"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProperties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-background/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div>
          <p className="font-sans text-sm font-medium text-foreground">{property.name}</p>
          {property.rating !== null && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
              <span className="text-xs text-muted-foreground">{property.rating} ({property.reviewCount})</span>
            </div>
          )}
        </div>
        <Link
          to={`/stays/${property.slug}/book`}
          className="flex items-center gap-1.5 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background"
        >
          Book Now
          <ArrowRightCircle className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
