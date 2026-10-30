import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Calendar, Users, BedDouble, AlertCircle,
  ArrowLeft, ArrowRight, ShieldCheck, Check, Info, Search, Loader2,
  Zap, Tag,
} from 'lucide-react';
import { getPropertyBySlugFallback } from '@/data/properties';
import { usePropertyBySlug } from '@/hooks/use-properties';
import { useBooking } from '@/context/booking-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { CatalogRoom, AvailableRoom } from '@/types/booking';

export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { property: dbProperty, loading } = usePropertyBySlug(slug);
  const fallbackProperty = slug && !dbProperty ? getPropertyBySlugFallback(slug) : undefined;
  const property = dbProperty ?? fallbackProperty ?? undefined;
  const { selectCatalogRoom, selectRoom } = useBooking();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);

  const [catalogRooms, setCatalogRooms] = useState<CatalogRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [liveRooms, setLiveRooms] = useState<AvailableRoom[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveSearched, setLiveSearched] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const canSearchLive = !!property?.id && !!checkIn && !!checkOut && nights >= 1;

  // Fetch stored room catalog for this property
  useEffect(() => {
    if (!property?.id) return;
    let cancelled = false;

    (async () => {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const { data, error } = await supabase
          .from('property_rooms')
          .select('*')
          .eq('property_id', property.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const mapped: CatalogRoom[] = (data || []).map((r) => ({
          id: r.id,
          propertyId: r.property_id,
          supplierRoomCode: r.supplier_room_code || '',
          roomName: r.elvora_room_name || r.supplier_room_name || 'Room',
          roomType: r.supplier_room_type || '',
          roomCharacteristic: r.supplier_room_characteristic || '',
          description: r.elvora_description || r.supplier_description || '',
          maxAdults: r.supplier_max_adults || 0,
          maxChildren: r.supplier_max_children || 0,
          maxOccupancy: r.supplier_max_occupancy || 0,
          facilities: r.supplier_facilities || [],
          roomImage: r.room_image || null,
          pricePerNight: Number(r.elvora_price_per_night) || 0,
          currency: r.currency || 'USD',
          priceSource: r.price_source || 'hotelbeds_sync',
          priceSyncedAt: r.price_synced_at || null,
          displayOrder: r.display_order || 0,
        }));

        setCatalogRooms(mapped);
      } catch {
        if (!cancelled) setRoomsError('Unable to load room catalog for this property.');
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [property?.id]);

  const searchLiveAvailability = useCallback(async () => {
    if (!property?.id || !checkIn || !checkOut || nights < 1) return;

    setLiveLoading(true);
    setLiveError(null);
    setLiveSearched(true);
    setLiveRooms([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stay-availability`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            propertyId: property.id,
            checkIn,
            checkOut,
            guests: adults,
            rooms,
          }),
        },
      );

      if (!response.ok) {
        setLiveError('Unable to search live availability. Please try again.');
        return;
      }

      const result = await response.json();

      if (result.available && result.rooms && result.rooms.length > 0) {
        setLiveRooms(result.rooms);
      } else if (!result.available && result.reason === 'no_availability') {
        setLiveError(null);
      } else if (!result.available && result.reason === 'supplier_not_configured') {
        setLiveError(null);
      } else if (!result.available) {
        setLiveError(result.message || 'No live availability for the selected dates.');
      }
    } catch {
      setLiveError('Unable to search live availability. Please try again.');
    } finally {
      setLiveLoading(false);
    }
  }, [property?.id, checkIn, checkOut, nights, adults, rooms]);

  const handleSelectLiveRoom = (room: AvailableRoom) => {
    if (!property || !checkIn || !checkOut) return;
    setSelectedRoomId(room.roomId);

    const draftData = {
      propertyId: property.id,
      propertySlug: property.slug,
      propertyName: property.name,
      propertyImage: property.images?.[0]?.url || '',
      destinationName: property.destinationName,
      checkIn,
      checkOut,
      guests: adults,
      adults,
      children: 0,
      rooms,
      selectedRoom: null,
    };
    selectRoom(room, draftData);
    navigate('/checkout');
  };

  const handleSelectCatalogRoom = (room: CatalogRoom) => {
    if (!property || !checkIn || !checkOut) return;
    setSelectedRoomId(room.id);

    const draftData = {
      propertyId: property.id,
      propertySlug: property.slug,
      propertyName: property.name,
      propertyImage: property.images?.[0]?.url || '',
      destinationName: property.destinationName,
      checkIn,
      checkOut,
      guests: adults,
      adults,
      children: 0,
      rooms,
      selectedRoom: null,
    };
    selectCatalogRoom(room, draftData);
    navigate('/checkout');
  };

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

  return (
    <div className="bg-background pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1200px] px-6 py-4 lg:px-10">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/stays" className="hover:text-foreground">Stays</Link>
          <span>/</span>
          <Link to={`/stays/${property.slug}`} className="hover:text-foreground">{property.name}</Link>
          <span>/</span>
          <span className="text-foreground">Book</span>
        </nav>
      </div>

      {/* Property header */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-start">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:w-96 md:aspect-[4/3] md:shrink-0">
            <img
              src={property.images?.[0]?.url || ''}
              alt={property.images?.[0]?.alt || property.name}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
          </div>
          <div className="flex-1">
            <Link
              to={`/stays/${property.slug}`}
              className="mb-3 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              Back to property details
            </Link>
            <span className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              {property.propertyType}
            </span>
            <h1 className="mt-1 font-serif text-3xl font-light leading-tight tracking-tight text-foreground md:text-4xl">
              {property.name}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              {property.city}, {property.country}
            </p>
            {property.address && (
              <p className="mt-1 text-xs text-muted-foreground">{property.address}</p>
            )}
            {property.rating !== null && (
              <div className="mt-3 flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={0} />
                <span className="font-sans text-sm font-medium text-foreground">{property.rating}</span>
                {property.reviewCount !== null && (
                  <span className="font-sans text-sm text-muted-foreground">({property.reviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date selector + room catalog */}
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
        {/* Select Your Dates */}
        <div className="border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-2xl font-medium text-foreground">Select Your Dates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" strokeWidth={1.5} />
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && e.target.value >= checkOut) {
                    const next = new Date(e.target.value);
                    next.setDate(next.getDate() + 1);
                    setCheckOut(next.toISOString().split('T')[0]);
                  }
                  setLiveSearched(false);
                  setLiveRooms([]);
                }}
                min={today}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" strokeWidth={1.5} />
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setLiveSearched(false);
                  setLiveRooms([]);
                }}
                min={checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0] : tomorrow}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                <Users className="h-3 w-3" strokeWidth={1.5} />
                Adults
              </label>
              <select
                value={adults}
                onChange={(e) => {
                  setAdults(Number(e.target.value));
                  setLiveSearched(false);
                  setLiveRooms([]);
                }}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                <BedDouble className="h-3 w-3" strokeWidth={1.5} />
                Rooms
              </label>
              <select
                value={rooms}
                onChange={(e) => {
                  setRooms(Number(e.target.value));
                  setLiveSearched(false);
                  setLiveRooms([]);
                }}
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          {checkIn && checkOut && nights > 0 && (
            <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {nights} {nights === 1 ? 'night' : 'nights'} · {adults} {adults === 1 ? 'adult' : 'adults'} · {rooms} {rooms === 1 ? 'room' : 'rooms'}
              </p>
              <button
                onClick={searchLiveAvailability}
                disabled={!canSearchLive || liveLoading}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-medium uppercase tracking-wider transition-all',
                  canSearchLive && !liveLoading
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                )}
              >
                {liveLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" strokeWidth={1.5} />
                    Search Live Rates
                  </>
                )}
              </button>
            </div>
          )}
          {checkIn && checkOut && nights === 0 && (
            <p className="mt-3 text-xs text-error">Check-out must be after check-in.</p>
          )}
        </div>

        {/* Live availability error */}
        {liveError && !liveLoading && (
          <div className="mt-6 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
            <p>{liveError}</p>
          </div>
        )}

        {/* Live search results */}
        {liveSearched && !liveLoading && liveRooms.length > 0 && (
          <div className="mt-8">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="eyebrow mb-1 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  Live Availability
                </p>
                <h2 className="font-serif text-2xl font-light text-foreground">
                  {liveRooms.length} {liveRooms.length === 1 ? 'rate' : 'rates'} found
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {checkIn} to {checkOut} · {nights} {nights === 1 ? 'night' : 'nights'} · Real-time supplier pricing
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {liveRooms.map((room, idx) => (
                <LiveRoomCard
                  key={`${room.roomId}-${idx}`}
                  room={room}
                  propertyImage={property.images?.[0]?.url || ''}
                  isSelected={selectedRoomId === room.roomId}
                  onSelect={() => handleSelectLiveRoom(room)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live search completed but no results */}
        {liveSearched && !liveLoading && liveRooms.length === 0 && !liveError && canSearchLive && (
          <div className="mt-8 border border-border bg-secondary p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-lg font-light text-foreground">
              No live rates available for these dates
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The supplier has no available rooms for the selected dates and occupancy. Try different dates or browse the catalog room types below.
            </p>
          </div>
        )}

        {/* Catalog rooms loading */}
        {roomsLoading && (
          <div className="mt-8 flex items-center justify-center border border-border bg-secondary p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
          </div>
        )}

        {/* Catalog rooms error */}
        {roomsError && !roomsLoading && (
          <div className="mt-6 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
            <p>{roomsError}</p>
          </div>
        )}

        {/* Catalog rooms section (always show if rooms exist, even after live search) */}
        {!roomsLoading && !roomsError && catalogRooms.length > 0 && (
          <div className="mt-8">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="eyebrow mb-1 flex items-center gap-1.5">
                  <Tag className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                  Room Catalog
                </p>
                <h2 className="font-serif text-2xl font-light text-foreground">
                  {catalogRooms.length} {catalogRooms.length === 1 ? 'room type' : 'room types'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stored room types with catalog pricing · Search live rates above for date-specific availability
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {catalogRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  nights={nights}
                  numRooms={rooms}
                  propertyImage={property.images?.[0]?.url || ''}
                  propertyName={property.name}
                  canBook={!!checkIn && !!checkOut && nights >= 1}
                  isSelected={selectedRoomId === room.id}
                  onSelect={() => handleSelectCatalogRoom(room)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No rooms at all */}
        {!roomsLoading && !roomsError && catalogRooms.length === 0 && liveRooms.length === 0 && !liveSearched && (
          <div className="mt-8 border border-border bg-secondary p-12 text-center">
            <BedDouble className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-xl font-light text-foreground">
              Select dates to search for available rooms
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose your check-in and check-out dates above, then click "Search Live Rates" to see real-time availability and pricing.
            </p>
          </div>
        )}
      </div>

      {/* Trust footer */}
      <div className="mx-auto max-w-[1200px] px-6 pb-16 lg:px-10">
        <div className="flex flex-wrap items-center justify-center gap-6 border-t border-border pt-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.5} />
            Secure booking through Elvora Stay
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-accent" strokeWidth={1.5} />
            Best available room types
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-accent" strokeWidth={1.5} />
            Free cancellation policies shown per room
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Live Room Card (date-specific supplier rates) ──────────────────────────

interface LiveRoomCardProps {
  room: AvailableRoom;
  propertyImage: string;
  isSelected: boolean;
  onSelect: () => void;
}

function LiveRoomCard({ room, propertyImage, isSelected, onSelect }: LiveRoomCardProps) {
  return (
    <div className={cn(
      'border bg-card transition-all',
      isSelected ? 'border-accent shadow-md' : 'border-border hover:border-foreground/30'
    )}>
      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Room image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:w-56 sm:shrink-0">
          <img
            src={propertyImage}
            alt={room.roomName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 bg-accent px-2 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-white">
            <Zap className="mr-1 inline h-3 w-3" strokeWidth={2} />
            Live Rate
          </div>
        </div>

        {/* Room details */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex-1">
            <h3 className="font-serif text-xl font-medium text-foreground">{room.roomName}</h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                {room.maxGuests} {room.maxGuests === 1 ? 'guest' : 'guests'}
              </span>
              {room.mealPlan && (
                <span className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {room.mealPlan}
                </span>
              )}
            </div>

            {/* Cancellation policy */}
            {room.cancellationPolicy && (
              <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                {room.cancellationPolicy}
              </p>
            )}
          </div>

          {/* Price + book button */}
          <div className="mt-4 flex flex-col items-end gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right sm:text-left">
              {room.pricePerNight > 0 && (
                <p className="font-sans text-xs text-muted-foreground">
                  {room.currency} {room.pricePerNight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / night
                </p>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-2xl font-medium text-foreground">
                  {room.currency} {room.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="font-sans text-xs text-muted-foreground">total</span>
              </div>
              {room.taxes > 0 && (
                <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                  Includes {room.currency} {room.taxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} taxes
                </p>
              )}
            </div>
            <button
              onClick={onSelect}
              disabled={isSelected}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all',
                isSelected
                  ? 'bg-accent text-white'
                  : 'bg-foreground text-background hover:bg-foreground/85'
              )}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                  Selected
                </>
              ) : (
                <>
                  Book Now
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Catalog Room Card Component ────────────────────────────────────────────

interface RoomCardProps {
  room: CatalogRoom;
  nights: number;
  numRooms: number;
  propertyImage: string;
  propertyName: string;
  canBook: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function RoomCard({ room, nights, numRooms, propertyImage, canBook, isSelected, onSelect }: RoomCardProps) {
  const total = room.pricePerNight * nights * numRooms;

  return (
    <div className={cn(
      'border bg-card transition-all',
      isSelected ? 'border-accent shadow-md' : 'border-border hover:border-foreground/30'
    )}>
      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Room image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:w-56 sm:shrink-0">
          <img
            src={room.roomImage || propertyImage}
            alt={room.roomName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Room details */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex-1">
            <h3 className="font-serif text-xl font-medium text-foreground">{room.roomName}</h3>
            {room.roomType && (
              <span className="mt-1 inline-block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                {room.roomType}
              </span>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {room.maxAdults > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {room.maxAdults} {room.maxAdults === 1 ? 'adult' : 'adults'}
                  {room.maxChildren > 0 && ` + ${room.maxChildren} children`}
                </span>
              )}
              {room.maxOccupancy > 0 && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Sleeps {room.maxOccupancy}
                </span>
              )}
            </div>

            {/* Room description */}
            {room.description && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{room.description}</p>
            )}

            {/* Room facilities */}
            {room.facilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {room.facilities.slice(0, 8).map((f, i) => (
                  <span key={i} className="border border-border px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
                    {f}
                  </span>
                ))}
                {room.facilities.length > 8 && (
                  <span className="px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
                    +{room.facilities.length - 8} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom: price + book button */}
          <div className="mt-4 flex flex-col items-end gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right sm:text-left">
              {room.pricePerNight > 0 && (
                <p className="font-sans text-xs text-muted-foreground">
                  {room.currency} {room.pricePerNight.toLocaleString()} / night
                </p>
              )}
              {nights > 0 && numRooms > 0 && room.pricePerNight > 0 && (
                <p className="font-sans text-xs text-muted-foreground">
                  {nights} {nights === 1 ? 'night' : 'nights'} × {room.currency} {room.pricePerNight.toLocaleString()}
                  {numRooms > 1 && ` × ${numRooms} rooms`}
                </p>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-2xl font-medium text-foreground">
                  {room.currency} {total.toLocaleString()}
                </span>
                <span className="font-sans text-xs text-muted-foreground">total</span>
              </div>
            </div>
            <button
              onClick={onSelect}
              disabled={isSelected || !canBook}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all',
                isSelected
                  ? 'bg-accent text-white'
                  : 'bg-foreground text-background hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                  Selected
                </>
              ) : !canBook ? (
                'Select dates'
              ) : (
                <>
                  Book Now
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
