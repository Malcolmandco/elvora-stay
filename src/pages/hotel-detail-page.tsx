import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Calendar, Users, BedDouble, ArrowRight,
  ChevronLeft, ChevronRight, Check, ShieldCheck, Loader2,
  AlertCircle, ArrowLeft, ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HotelSearchResult, HotelRoomRate } from '@/types/hotel-search';

interface CheckRateData {
  valid: boolean;
  hotel?: {
    name?: string;
    categoryCode?: string;
    categoryName?: string;
    address?: string;
    coordinates?: { latitude?: string; longitude?: string };
    images?: Array<{ path: string; typeCode: string }>;
    facilities?: Array<{ description?: { content?: string } }>;
  };
  rooms?: Array<{
    code?: string;
    name?: string;
    rates: Array<{
      rateKey: string;
      rateType: string;
      paymentType: string;
      boardName?: string;
      boardCode?: string;
      net?: number;
      sellingRate?: number;
      currency?: string;
      cancellationPolicies?: Array<{ amount: number; from: string; amountType: string }>;
      rooms?: number;
      adults?: number;
      children?: number;
    }>;
  }>;
  error?: string;
}

export function HotelDetailPage() {
  const { hotelCode } = useParams<{ hotelCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const destinationCode = searchParams.get('destinationCode') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults = Number(searchParams.get('adults') || 2);
  const rooms = Number(searchParams.get('rooms') || 1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotelData, setHotelData] = useState<HotelSearchResult | null>(null);
  const [checkRateData, setCheckRateData] = useState<CheckRateData | null>(null);
  const [checkRateLoading, setCheckRateLoading] = useState(false);
  const [checkRateError, setCheckRateError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedRateKey, setSelectedRateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!hotelCode || !destinationCode || !checkIn || !checkOut) {
      setError('Missing search parameters. Please start a new search.');
      setLoading(false);
      return;
    }

    const fetchHotelDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-search`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              destinationCode,
              checkIn,
              checkOut,
              rooms,
              adults,
              children: 0,
              childrenAges: [],
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load hotel details');
        }

        const data = await response.json();
        const hotel = (data.results || []).find(
          (h: HotelSearchResult) => h.supplierHotelCode === hotelCode
        );

        if (!hotel) {
          throw new Error('Hotel not found in current search results');
        }

        setHotelData(hotel);

        if (hotel.rateType === 'RECHECK') {
          performCheckRate(hotel.rateKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hotel details');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetail();
  }, [hotelCode, destinationCode, checkIn, checkOut, adults, rooms]);

  const performCheckRate = useCallback(async (rateKey: string) => {
    setCheckRateLoading(true);
    setCheckRateError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-checkrate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ rateKey }),
        }
      );

      if (!response.ok) {
        throw new Error('Rate validation failed');
      }

      const data: CheckRateData = await response.json();
      setCheckRateData(data);
    } catch (err) {
      setCheckRateError(err instanceof Error ? err.message : 'Rate validation failed');
    } finally {
      setCheckRateLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-xl font-light text-foreground">Finding extraordinary stays...</p>
            <p className="mt-1 text-sm text-muted-foreground">Loading hotel details</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-[16/9] animate-pulse bg-muted" />
              <div className="h-8 w-2/3 animate-pulse bg-muted" />
              <div className="h-4 w-1/2 animate-pulse bg-muted" />
              <div className="h-32 animate-pulse bg-muted" />
            </div>
            <div className="h-64 animate-pulse bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotelData) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-[1400px] px-6 py-20 text-center lg:px-10">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="mt-4 font-serif text-2xl font-light text-foreground">Unable to load hotel</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Please try a new search.'}</p>
          <Link to="/stays" className="mt-6 inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const stars = hotelData.categoryCode ? parseInt(hotelData.categoryCode) || 0 : 0;
  const images = hotelData.images.length > 0 ? hotelData.images : [];
  const availableRooms = checkRateData?.rooms || [];
  const hasRechecked = checkRateData !== null;

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);

  const handleSelectRoom = (rate: HotelRoomRate) => {
    const params = new URLSearchParams({
      hotelName: hotelData.hotelName,
      hotelCode: hotelData.supplierHotelCode,
      rateKey: rate.rateKey,
      checkIn,
      checkOut,
      adults: String(adults),
      rooms: String(rooms),
      price: String(rate.price || hotelData.price),
      currency: rate.currency || hotelData.currency,
      roomName: hotelData.roomName,
      boardName: rate.boardName || hotelData.boardName,
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <div className="bg-background pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1400px] px-6 py-4 lg:px-10">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/stays" className="hover:text-foreground">Stays</Link>
          <span>/</span>
          <span className="text-foreground">{hotelData.hotelName}</span>
        </nav>
      </div>

      {/* Title */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-sans text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              Live Hotel Inventory
            </span>
            <h1 className="mt-1 font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {hotelData.hotelName}
            </h1>
            {hotelData.destinationName && (
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                {hotelData.destinationName}
                {hotelData.address && `, ${hotelData.address}`}
              </p>
            )}
          </div>
          {stars > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-accent text-accent" strokeWidth={0} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {images.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[480px]">
            <div className="relative overflow-hidden bg-muted md:col-span-2 md:row-span-2">
              <img src={images[0].url} alt={hotelData.hotelName} className="h-full w-full object-cover" fetchPriority="high" />
            </div>
            {images.slice(1, 5).map((img, idx) => (
              <div key={idx} className="relative hidden overflow-hidden bg-muted md:block">
                <img src={img.url} alt={`${hotelData.hotelName} ${idx + 2}`} loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>

          {/* Mobile gallery */}
          <div className="relative md:hidden">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={images[activeImage].url} alt={hotelData.hotelName} className="h-full w-full object-cover" />
            </div>
            {images.length > 1 && (
              <>
                <button onClick={prevImage} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 backdrop-blur-sm">
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={nextImage} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 backdrop-blur-sm">
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 text-xs text-white">
                  {activeImage + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content + booking */}
      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {hotelData.description && (
              <section className="border-b border-border py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">About this hotel</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{hotelData.description}</p>
              </section>
            )}

            {hotelData.amenities && hotelData.amenities.length > 0 && (
              <section className="border-b border-border py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">Amenities</h2>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {hotelData.amenities.slice(0, 12).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      {amenity}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cancellation policies */}
            {hotelData.cancellationPolicies.length > 0 && (
              <section className="border-b border-border py-8">
                <h2 className="font-serif text-2xl font-medium text-foreground">Cancellation policy</h2>
                <div className="mt-4 space-y-3">
                  {hotelData.cancellationPolicies.map((policy, idx) => (
                    <div key={idx} className="border border-border bg-secondary p-4">
                      <p className="text-sm text-foreground">
                        {policy.amountType === 'AMOUNT'
                          ? `${policy.currency} ${policy.amount}`
                          : `${policy.amount}%`}
                        {' — '}
                        {policy.fromDate
                          ? `Free cancellation until ${new Date(policy.fromDate).toLocaleDateString()}`
                          : 'Cancellation charges may apply'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Room selection */}
            <section className="py-8">
              <h2 className="font-serif text-2xl font-medium text-foreground">Available rooms</h2>

              {checkRateLoading && (
                <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                  Validating rates...
                </div>
              )}

              {checkRateError && (
                <div className="mt-6 flex items-start gap-2 border border-error/30 bg-error/5 p-4 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                  We're having trouble loading live availability right now. Please try again.
                </div>
              )}

              {!checkRateLoading && !checkRateError && hasRechecked && availableRooms.length > 0 && (
                <div className="mt-6 space-y-4">
                  {availableRooms.map((room, roomIdx) =>
                    (room.rates || []).map((rate: any, rateIdx: number) => (
                      <div key={`${roomIdx}-${rateIdx}`} className="border border-border bg-background p-4">
                        <p className="font-sans text-sm font-medium text-foreground">{room.name || hotelData.roomName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{rate.boardName || hotelData.boardName}</p>
                        {rate.cancellationPolicies && rate.cancellationPolicies.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {rate.cancellationPolicies[0].amountType === 'AMOUNT'
                              ? `Cancellation: ${rate.currency || hotelData.currency} ${rate.cancellationPolicies[0].amount}`
                              : `Cancellation: ${rate.cancellationPolicies[0].amount}%`}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <span className="font-serif text-lg font-medium text-foreground">
                              {rate.currency || hotelData.currency} {(rate.sellingRate || rate.net || hotelData.price).toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground"> / stay</span>
                          </div>
                          <button
                            onClick={() => handleSelectRoom({
                              rateKey: rate.rateKey,
                              rateType: (rate.rateType as 'BOOKABLE' | 'RECHECK') || 'BOOKABLE',
                              paymentType: (rate.paymentType as 'AT_WEB' | 'AT_HOTEL') || hotelData.paymentType,
                              boardName: rate.boardName || hotelData.boardName,
                              boardCode: rate.boardCode || hotelData.boardCode,
                              price: rate.sellingRate || rate.net || hotelData.price,
                              netPrice: rate.net || hotelData.netPrice,
                              currency: rate.currency || hotelData.currency,
                              cancellationPolicies: hotelData.cancellationPolicies,
                              rooms: rate.rooms || rooms,
                              adults: rate.adults || adults,
                              children: rate.children || 0,
                            })}
                            className="bg-foreground px-5 py-2.5 text-[0.625rem] font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                          >
                            Select Room
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!checkRateLoading && !checkRateError && !hasRechecked && (
                <div className="mt-6 space-y-4">
                  <div className="border border-border bg-background p-4">
                    <p className="font-sans text-sm font-medium text-foreground">{hotelData.roomName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{hotelData.boardName}</p>
                    {hotelData.cancellationPolicies.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hotelData.cancellationPolicies[0].amountType === 'AMOUNT'
                          ? `Cancellation: ${hotelData.currency} ${hotelData.cancellationPolicies[0].amount}`
                          : `Cancellation: ${hotelData.cancellationPolicies[0].amount}%`}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <span className="font-serif text-lg font-medium text-foreground">
                          {hotelData.currency} {hotelData.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground"> / stay</span>
                      </div>
                      <button
                        onClick={() => {
                          if (hotelData.rateType === 'RECHECK') {
                            performCheckRate(hotelData.rateKey);
                          } else {
                            handleSelectRoom({
                              rateKey: hotelData.rateKey,
                              rateType: hotelData.rateType,
                              paymentType: hotelData.paymentType,
                              boardName: hotelData.boardName,
                              boardCode: hotelData.boardCode,
                              price: hotelData.price,
                              netPrice: hotelData.netPrice,
                              currency: hotelData.currency,
                              cancellationPolicies: hotelData.cancellationPolicies,
                              rooms: hotelData.rooms,
                              adults: hotelData.adults,
                              children: hotelData.children,
                            });
                          }
                        }}
                        className="bg-foreground px-5 py-2.5 text-[0.625rem] font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                      >
                        {hotelData.rateType === 'RECHECK' ? 'Validate & Select' : 'Select Room'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border p-6 shadow-sm">
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" strokeWidth={1.5} /> Check-in
                  </span>
                  <span className="text-foreground">{checkIn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" strokeWidth={1.5} /> Check-out
                  </span>
                  <span className="text-foreground">{checkOut}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" strokeWidth={1.5} /> Guests
                  </span>
                  <span className="text-foreground">{adults} {adults === 1 ? 'adult' : 'adults'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <BedDouble className="h-4 w-4" strokeWidth={1.5} /> Rooms
                  </span>
                  <span className="text-foreground">{rooms}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-serif text-2xl font-medium text-foreground">
                      {hotelData.currency} {hotelData.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">total for {checkIn} to {checkOut}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {hotelData.rateType === 'RECHECK' ? 'Rate requires validation before booking' : 'Rate is bookable'}
                </p>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  Live rates from our hotel partner
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-background/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div>
          <p className="font-sans text-sm font-medium text-foreground">{hotelData.currency} {hotelData.price.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">total for stay</p>
        </div>
        <button
          onClick={() => {
            if (hotelData.rateType === 'RECHECK' && !hasRechecked) {
              performCheckRate(hotelData.rateKey);
            } else if (hasRechecked && availableRooms.length > 0) {
              const room = availableRooms[0];
              const rate = (room.rates || [])[0];
              if (rate) {
                handleSelectRoom({
                  rateKey: rate.rateKey,
                  rateType: (rate.rateType as 'BOOKABLE' | 'RECHECK') || 'BOOKABLE',
                  paymentType: (rate.paymentType as 'AT_WEB' | 'AT_HOTEL') || hotelData.paymentType,
                  boardName: rate.boardName || hotelData.boardName,
                  boardCode: rate.boardCode || hotelData.boardCode,
                  price: rate.sellingRate || rate.net || hotelData.price,
                  netPrice: rate.net || hotelData.netPrice,
                  currency: rate.currency || hotelData.currency,
                  cancellationPolicies: hotelData.cancellationPolicies,
                  rooms: rate.rooms || rooms,
                  adults: rate.adults || adults,
                  children: rate.children || 0,
                });
              }
            } else {
              handleSelectRoom({
                rateKey: hotelData.rateKey,
                rateType: hotelData.rateType,
                paymentType: hotelData.paymentType,
                boardName: hotelData.boardName,
                boardCode: hotelData.boardCode,
                price: hotelData.price,
                netPrice: hotelData.netPrice,
                currency: hotelData.currency,
                cancellationPolicies: hotelData.cancellationPolicies,
                rooms: hotelData.rooms,
                adults: hotelData.adults,
                children: hotelData.children,
              });
            }
          }}
          className="bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background"
        >
          Select Room
        </button>
      </div>
    </div>
  );
}
