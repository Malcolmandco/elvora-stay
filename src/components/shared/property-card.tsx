import { useState, useEffect } from 'react';
import { Heart, Star, MapPin, BedDouble, Bath, Users, BadgeCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/context/favorites-context';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
  className?: string;
  imagePriority?: boolean;
}

export function FavoriteButton({
  propertyId,
  className,
  light = false,
}: {
  propertyId: string;
  className?: string;
  light?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [signedIn, setSignedIn] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
    })();
  }, []);

  const fav = isFavorite(propertyId);

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!signedIn) {
            setShowPrompt(true);
            return;
          }
          toggleFavorite(propertyId);
        }}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={fav}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300',
          light
            ? 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'
            : 'bg-white/80 text-foreground backdrop-blur-sm hover:bg-white',
          fav && 'text-accent',
          className
        )}
      >
        <Heart
          className="h-4 w-4"
          strokeWidth={1.5}
          fill={fav ? 'currentColor' : 'none'}
        />
      </button>
      {showPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="max-w-sm border border-border bg-background p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="mx-auto h-8 w-8 text-accent" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-xl font-light text-foreground">
              Sign in to save favorites
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create an account or sign in to save properties to your favorites.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center bg-foreground px-5 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center border border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-secondary"
              >
                Create Account
              </Link>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              className="mt-4 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function BookingStatusBadge({ property, className }: { property: Property; className?: string }) {
  if (property.propertyStatus === 'coming_soon') {
    return (
      <span className={cn('bg-foreground/80 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-white backdrop-blur-sm', className)}>
        Coming Soon
      </span>
    );
  }
  if (property.bookingEnabled && property.propertyStatus === 'bookable') {
    return (
      <span className={cn('bg-accent px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-white', className)}>
        Bookable
      </span>
    );
  }
  return (
    <span className={cn('bg-white/90 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm', className)}>
      Discover
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      title="Property identity verified against a reliable source. Availability and booking are subject to Elvora Stay's supplier relationships."
      className={cn('inline-flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-wider text-accent', className)}
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2} />
      Real Property
    </span>
  );
}

export function PropertyCard({ property, className, imagePriority }: PropertyCardProps) {
  const primaryImage = property.images[0];

  return (
    <Link
      to={`/stays/${property.slug}`}
      className={cn('group block no-underline', className)}
      aria-label={`${property.name} — ${property.city}, ${property.country}, ${property.propertyType}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={primaryImage.url}
          alt={primaryImage.alt}
          loading={imagePriority ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute right-3 top-3">
          <FavoriteButton propertyId={property.id} light />
        </div>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {property.featured && property.verificationStatus === 'verified' && (
            <span className="inline-flex items-center gap-1 bg-white/90 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
              Featured
            </span>
          )}
          <BookingStatusBadge property={property} />
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
            {property.propertyType}
          </span>
          {property.verificationStatus === 'verified' && <VerifiedBadge />}
        </div>

        {property.brand && (
          <p className="mt-1 font-sans text-[0.6875rem] uppercase tracking-wider text-muted-foreground/70">
            {property.brand}
          </p>
        )}

        <h3 className="mt-1 font-serif text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
          {property.name}
        </h3>

        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" strokeWidth={1.5} />
          {property.city}, {property.country}
        </p>

        {/* Rating */}
        {property.rating !== null && (
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
            <span className="font-sans text-xs font-medium text-foreground">{property.rating}</span>
            {property.reviewCount !== null && (
              <span className="font-sans text-xs text-muted-foreground">({property.reviewCount})</span>
            )}
          </div>
        )}

        {/* Key details */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {property.maxGuests !== null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              {property.maxGuests} guests
            </span>
          )}
          {property.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} />
              {property.bedrooms} bedrooms
            </span>
          )}
          {property.bathrooms !== null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" strokeWidth={1.5} />
              {property.bathrooms} baths
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1 border-t border-border pt-3">
          {property.pricePerNight !== null ? (
            <>
              <span className="font-sans text-xs text-muted-foreground">From</span>
              <span className="font-serif text-lg font-medium text-foreground">
                ${property.pricePerNight.toLocaleString()}
              </span>
              <span className="font-sans text-xs text-muted-foreground">/ night</span>
            </>
          ) : (
            <span className="font-sans text-sm font-medium uppercase tracking-wider text-foreground">Book Now</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PropertyCardHorizontal({ property, className }: { property: Property; className?: string }) {
  const primaryImage = property.images[0];

  return (
    <Link
      to={`/stays/${property.slug}`}
      className={cn('group flex gap-4 no-underline', className)}
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted sm:w-36">
        <img
          src={primaryImage.url}
          alt={primaryImage.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center py-1">
        <span className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          {property.propertyType}
        </span>
        <h3 className="mt-1 font-serif text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
          {property.name}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {property.city}, {property.country}
        </p>
        {property.rating !== null && (
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
            <span className="font-sans text-xs font-medium text-foreground">{property.rating}</span>
            {property.reviewCount !== null && (
              <span className="font-sans text-xs text-muted-foreground">({property.reviewCount})</span>
            )}
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-1">
          {property.pricePerNight !== null ? (
            <>
              <span className="font-serif text-base font-medium text-foreground">
                ${property.pricePerNight.toLocaleString()}
              </span>
              <span className="font-sans text-xs text-muted-foreground">/ night</span>
            </>
          ) : (
            <span className="font-sans text-xs font-medium uppercase tracking-wider text-foreground">Book Now</span>
          )}
        </div>
      </div>
    </Link>
  );
}
