import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Briefcase, Cog, Fuel, Calendar, Check, Search, ArrowRight } from 'lucide-react';
import { getVehicleBySlug } from '@/data/vehicles';
import { cn } from '@/lib/utils';

export function CarDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const vehicle = slug ? getVehicleBySlug(slug) : undefined;

  const [pickup, setPickup] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');

  if (!vehicle) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-24 text-center">
        <h1 className="font-serif text-3xl font-light text-foreground">Vehicle not found</h1>
        <Link to="/cars" className="mt-6 text-sm font-medium uppercase tracking-wider text-accent hover:underline">
          All vehicles
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <Link to="/cars" className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          All vehicles
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={vehicle.image}
              alt={vehicle.imageAlt}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 bg-white/90 px-3 py-1.5 font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
              Elvora Collection
            </div>
            <div className="absolute right-4 top-4 bg-foreground/80 px-3 py-1.5 font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
              {vehicle.category}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              {vehicle.year}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
              {vehicle.make} {vehicle.model}
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {vehicle.description}
            </p>

            {/* Specs */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SpecCard icon={Users} label="Seats" value={String(vehicle.seats)} />
              <SpecCard icon={Briefcase} label="Luggage" value={String(vehicle.luggage)} />
              <SpecCard icon={Cog} label="Transmission" value={vehicle.transmission} />
              <SpecCard icon={Fuel} label="Fuel" value={vehicle.fuelType} />
            </div>

            {/* Features */}
            <div className="mt-8">
              <h3 className="mb-3 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</h3>
              <div className="flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <span key={feature} className="inline-flex items-center gap-1 border border-border px-3 py-1.5 text-xs text-foreground">
                    <Check className="h-3 w-3 text-accent" strokeWidth={2} />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Price */}
            {vehicle.startingPricePerDay !== null && (
              <div className="mt-8 border-t border-border pt-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-sans text-xs text-muted-foreground">From</span>
                  <span className="font-serif text-3xl font-medium text-foreground">
                    ${vehicle.startingPricePerDay.toLocaleString()}
                  </span>
                  <span className="font-sans text-sm text-muted-foreground">/ day</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Catalog price. Live availability is confirmed when you search for specific dates.
                </p>
              </div>
            )}

            {/* Search CTA */}
            <div className="mt-8 border border-border bg-card p-5">
              <p className="mb-3 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Check live rental availability
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Pickup location</label>
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="City or airport"
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Pickup date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Drop-off date</label>
                  <input
                    type="date"
                    value={dropoffDate}
                    onChange={(e) => setDropoffDate(e.target.value)}
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>
              <Link
                to={`/cars?pickup=${encodeURIComponent(pickup)}&pickupDate=${pickupDate}&dropoffDate=${dropoffDate}`}
                className={cn(
                  'mt-4 inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85',
                  (!pickup || !pickupDate || !dropoffDate) && 'pointer-events-none opacity-50'
                )}
              >
                <Search className="h-4 w-4" strokeWidth={1.5} />
                Check availability
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="border border-border p-4">
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <p className="mt-2 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-serif text-lg font-medium text-foreground">{value}</p>
    </div>
  );
}
