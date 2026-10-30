import { Link } from 'react-router-dom';
import { Users, Briefcase, Cog, Fuel, ArrowRight } from 'lucide-react';
import type { Vehicle } from '@/data/vehicles';
import { cn } from '@/lib/utils';

interface VehicleCardProps {
  vehicle: Vehicle;
  className?: string;
}

export function VehicleCard({ vehicle, className }: VehicleCardProps) {
  return (
    <Link
      to={`/cars/${vehicle.slug}`}
      className={cn('group block no-underline', className)}
      aria-label={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={vehicle.image}
          alt={vehicle.imageAlt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
          Elvora Collection
        </div>
        <div className="absolute right-3 top-3 bg-foreground/80 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {vehicle.category}
        </div>
      </div>

      <div className="pt-4">
        <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          {vehicle.year}
        </p>
        <h3 className="mt-1 font-serif text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
          {vehicle.make} {vehicle.model}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
            {vehicle.seats} seats
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} />
            {vehicle.luggage} bags
          </span>
          <span className="flex items-center gap-1">
            <Cog className="h-3.5 w-3.5" strokeWidth={1.5} />
            {vehicle.transmission}
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" strokeWidth={1.5} />
            {vehicle.fuelType}
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
          {vehicle.startingPricePerDay !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="font-sans text-xs text-muted-foreground">From</span>
              <span className="font-serif text-lg font-medium text-foreground">
                ${vehicle.startingPricePerDay.toLocaleString()}
              </span>
              <span className="font-sans text-xs text-muted-foreground">/ day</span>
            </div>
          ) : (
            <span className="font-sans text-sm text-muted-foreground">Check availability</span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground transition-colors group-hover:text-accent">
            View
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}
