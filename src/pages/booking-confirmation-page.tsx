import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Calendar, Users, Home, Hotel, ArrowLeft, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BookingRecord } from '@/types/booking';

export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref');
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!reference) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('reference', reference)
          .maybeSingle();

        if (!error && data) {
          setBooking(data as BookingRecord);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [reference]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="font-serif text-3xl font-light text-foreground">Booking not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't find a booking with that reference.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
          >
            View My Trips
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.booking_status === 'confirmed';
  const isPending = booking.booking_status === 'supplier_booking_pending' || booking.booking_status === 'payment_pending' || booking.booking_status === 'payment_processing' || booking.booking_status === 'payment_paid';

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-2xl px-6 py-16 lg:px-10">
        <div className="text-center">
          {isConfirmed ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <CheckCircle className="h-8 w-8 text-accent" strokeWidth={1.5} />
              </div>
              <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-accent">
                Booking Confirmed
              </p>
              <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
                Your escape awaits
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Your booking reference is below.
              </p>
            </>
          ) : isPending ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-8 w-8 text-warning" strokeWidth={1.5} />
              </div>
              <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-warning">
                Booking Pending
              </p>
              <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
                Booking confirmation in progress
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Your booking is being processed. Please check My Trips for updates.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                <AlertCircle className="h-8 w-8 text-error" strokeWidth={1.5} />
              </div>
              <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-error">
                Booking {booking.booking_status}
              </p>
              <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
                There was an issue
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Please contact support for assistance.
              </p>
            </>
          )}
        </div>

        <div className="mt-10 border border-border bg-card p-8">
          <div className="flex items-center justify-center border-b border-border pb-6">
            <div className="text-center">
              <span className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Booking Reference
              </span>
              <p className="mt-2 font-serif text-3xl font-medium text-foreground">{booking.reference}</p>
              {booking.supplier_booking_reference && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Supplier: {booking.supplier_booking_reference}
                </p>
              )}
            </div>
          </div>

          {booking.property_image && (
            <div className="mt-6 flex gap-4">
              <div className="h-24 w-32 shrink-0 overflow-hidden bg-muted">
                <img src={booking.property_image} alt={booking.property_name ?? ''} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="font-serif text-xl font-medium text-foreground">{booking.property_name}</h2>
                <p className="text-sm text-muted-foreground">{booking.destination_name}</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-in</p>
                <p className="text-sm font-medium text-foreground">{booking.check_in ?? 'TBD'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-out</p>
                <p className="text-sm font-medium text-foreground">{booking.check_out ?? 'TBD'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Guests</p>
                <p className="text-sm font-medium text-foreground">{booking.guests}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Room</p>
                <p className="text-sm font-medium text-foreground">{booking.room_name ?? 'N/A'}</p>
              </div>
            </div>
            {booking.cancellation_policy && (
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Cancellation</p>
                <p className="text-sm font-medium text-foreground">{booking.cancellation_policy}</p>
              </div>
            )}
            <div className="col-span-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-sm font-medium text-foreground">
                {booking.currency} {Number(booking.total).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Payment: {booking.payment_status} · Booking: {booking.booking_status}
                {booking.payment_provider && ` · Provider: ${booking.payment_provider}`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85">
            <Hotel className="h-3.5 w-3.5" strokeWidth={1.5} />
            View My Trip
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Return to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
