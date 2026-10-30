import { Star, MapPin, BedDouble, Utensils, ArrowRight, ImageIcon } from 'lucide-react';
import type { HotelSearchResult } from '@/types/hotel-search';
import { Link } from 'react-router-dom';

interface LiveHotelCardProps {
  hotel: HotelSearchResult;
  searchParams?: string;
}

export function LiveHotelCard({ hotel, searchParams = '' }: LiveHotelCardProps) {
  const primaryImage = hotel.images.find((img) => img.typeCode === 'EXT') || hotel.images[0];
  const stars = hotel.categoryCode ? parseInt(hotel.categoryCode) || 0 : 0;
  const detailLink = `/stays/${hotel.supplierHotelCode}${searchParams ? `?${searchParams}` : ''}`;

  return (
    <Link to={detailLink} className="group block border border-border bg-card overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={hotel.hotelName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-border" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute left-3 top-3 bg-background/90 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
          Live Inventory
        </div>
        {stars > 0 && (
          <div className="absolute right-3 top-3 flex items-center gap-0.5 bg-background/90 px-2 py-1 backdrop-blur-sm">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
            ))}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-serif text-lg font-medium leading-tight text-foreground">
          {hotel.hotelName}
        </h3>

        {(hotel.destinationName || hotel.address) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" strokeWidth={1.5} />
            {hotel.destinationName || hotel.address}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} />
            {hotel.roomName}
          </span>
          <span className="flex items-center gap-1">
            <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />
            {hotel.boardName}
          </span>
        </div>

        {hotel.cancellationPolicies.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cancellation policy available at checkout
          </p>
        )}

        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="font-serif text-xl font-medium text-foreground">
              {hotel.currency} {hotel.price.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">total for stay</p>
          </div>
          <span className="inline-flex items-center gap-1 bg-foreground px-4 py-2 text-[0.625rem] font-medium uppercase tracking-wider text-background transition-all group-hover:bg-foreground/85">
            View Room
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}
