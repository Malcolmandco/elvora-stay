import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Calendar, Users, Plane, Car, Navigation as NavIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchMode = 'flights' | 'cars' | 'pickup';

interface SearchPanelProps {
  variant?: 'hero' | 'page';
  className?: string;
  defaultMode?: SearchMode;
}

export function SearchPanel({ variant = 'hero', className, defaultMode = 'flights' }: SearchPanelProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  // Flights
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState('');

  // Cars
  const [carPickup, setCarPickup] = useState('');
  const [carDropoff, setCarDropoff] = useState('');
  const [carPickupDate, setCarPickupDate] = useState('');
  const [carDropoffDate, setCarDropoffDate] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (mode === 'flights') {
      if (flightFrom) params.set('from', flightFrom);
      if (flightTo) params.set('to', flightTo);
      if (departDate) params.set('depart', departDate);
      if (returnDate) params.set('return', returnDate);
      if (travelers) params.set('travelers', travelers);
      navigate(`/flights?${params.toString()}`);
    } else if (mode === 'cars') {
      if (carPickup) params.set('pickup', carPickup);
      if (carDropoff) params.set('dropoff', carDropoff);
      if (carPickupDate) params.set('pickupDate', carPickupDate);
      if (carDropoffDate) params.set('dropoffDate', carDropoffDate);
      navigate(`/cars?${params.toString()}`);
    } else if (mode === 'pickup') {
      navigate('/airport-pickup');
    }
  };

  const modes: { id: SearchMode; label: string; icon: typeof Plane }[] = [
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'cars', label: 'Cars', icon: Car },
    { id: 'pickup', label: 'Airport Pickup', icon: NavIcon },
  ];

  return (
    <div className={cn(className)}>
      <div className="mb-px flex gap-1">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors',
                mode === m.id
                  ? 'bg-card text-foreground'
                  : 'bg-foreground/5 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {m.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSearch}
        className={cn(
          'bg-card',
          variant === 'hero' ? 'shadow-[0_8px_40px_rgba(0,0,0,0.12)]' : 'border border-border',
          'rounded-sm'
        )}
      >
        {/* FLIGHTS MODE */}
        {mode === 'flights' && (
          <>
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-center gap-px bg-border md:grid">
              <SearchField icon={Plane} label="From" value={flightFrom} onChange={setFlightFrom} placeholder="City or airport" />
              <SearchField icon={Plane} label="To" value={flightTo} onChange={setFlightTo} placeholder="City or airport" />
              <SearchField icon={Calendar} label="Departure" type="date" value={departDate} onChange={setDepartDate} />
              <SearchField icon={Calendar} label="Return" type="date" value={returnDate} onChange={setReturnDate} />
              <SearchField icon={Users} label="Travelers" type="number" value={travelers} onChange={setTravelers} placeholder="1" />
              <SearchButton />
            </div>
            <div className="flex flex-col gap-px bg-border md:hidden">
              <SearchField icon={Plane} label="From" value={flightFrom} onChange={setFlightFrom} placeholder="City or airport" />
              <SearchField icon={Plane} label="To" value={flightTo} onChange={setFlightTo} placeholder="City or airport" />
              <div className="grid grid-cols-2 gap-px bg-border">
                <SearchField icon={Calendar} label="Departure" type="date" value={departDate} onChange={setDepartDate} />
                <SearchField icon={Calendar} label="Return" type="date" value={returnDate} onChange={setReturnDate} />
              </div>
              <SearchField icon={Users} label="Travelers" type="number" value={travelers} onChange={setTravelers} placeholder="1" />
              <SearchButton />
            </div>
          </>
        )}

        {/* CARS MODE */}
        {mode === 'cars' && (
          <>
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-px bg-border md:grid">
              <SearchField icon={Search} label="Pickup" value={carPickup} onChange={setCarPickup} placeholder="City or airport" />
              <SearchField icon={Search} label="Drop-off" value={carDropoff} onChange={setCarDropoff} placeholder="Same as pickup" />
              <SearchField icon={Calendar} label="Pickup date" type="date" value={carPickupDate} onChange={setCarPickupDate} />
              <SearchField icon={Calendar} label="Drop-off date" type="date" value={carDropoffDate} onChange={setCarDropoffDate} />
              <SearchButton />
            </div>
            <div className="flex flex-col gap-px bg-border md:hidden">
              <SearchField icon={Search} label="Pickup" value={carPickup} onChange={setCarPickup} placeholder="City or airport" />
              <SearchField icon={Search} label="Drop-off" value={carDropoff} onChange={setCarDropoff} placeholder="Same as pickup" />
              <div className="grid grid-cols-2 gap-px bg-border">
                <SearchField icon={Calendar} label="Pickup date" type="date" value={carPickupDate} onChange={setCarPickupDate} />
                <SearchField icon={Calendar} label="Drop-off date" type="date" value={carDropoffDate} onChange={setCarDropoffDate} />
              </div>
              <SearchButton />
            </div>
          </>
        )}

        {/* AIRPORT PICKUP MODE */}
        {mode === 'pickup' && (
          <div className="bg-card px-6 py-8 text-center">
            <Plane className="mx-auto h-6 w-6 text-accent" strokeWidth={1.5} />
            <p className="mt-3 font-serif text-lg font-light text-foreground">Complimentary Airport Pickup</p>
            <p className="mt-1 text-sm text-muted-foreground">Included free with every flight booking — no separate booking needed.</p>
            <Link to="/flights" className="mt-4 inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85">
              <Plane className="h-3.5 w-3.5" strokeWidth={1.5} />
              Book a Flight
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}

function SearchField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <label className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        aria-label={label}
      />
    </div>
  );
}

function SelectField({
  icon: Icon,
  label,
  value,
  onChange,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <label className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 text-sm text-foreground focus:outline-none"
        aria-label={label}
      >
        {children}
      </select>
    </div>
  );
}

function SearchButton({ label = 'Search' }: { label?: string }) {
  return (
    <button
      type="submit"
      className="m-2 inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
    >
      <Search className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </button>
  );
}

export function SearchLinkButton({ className }: { className?: string }) {
  return (
    <Link
      to="/stays"
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider transition-colors hover:text-accent',
        className
      )}
    >
      Advanced Search
      <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
    </Link>
  );
}
