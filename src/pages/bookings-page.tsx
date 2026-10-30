import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowRight, Hotel, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { BookingRecord } from '@/types/booking';

export function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUserId(authUser.id);
        } else {
          setLoading(false);
          return;
        }
      } catch {
        setLoading(false);
        return;
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setBookings(data as BookingRecord[]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="font-serif text-3xl font-light text-foreground">Please sign in</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to view your booked trips.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              Sign In
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 border border-border px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-secondary"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Your Trips</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Bookings
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {bookings.length} {bookings.length === 1 ? 'trip' : 'trips'}
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="grid grid-cols-1 gap-0 border border-border bg-card sm:grid-cols-[200px_1fr]"
              >
                <div className="aspect-video overflow-hidden bg-muted sm:aspect-auto sm:h-full">
                  {booking.property_image && (
                    <img
                      src={booking.property_image}
                      alt={booking.property_name ?? ''}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'font-sans text-[0.625rem] font-medium uppercase tracking-wider',
                        booking.booking_status === 'confirmed' ? 'text-accent'
                          : booking.booking_status === 'supplier_booking_pending'
                            || booking.booking_status === 'payment_pending'
                            || booking.booking_status === 'payment_processing'
                            || booking.booking_status === 'payment_paid' ? 'text-warning'
                          : booking.booking_status === 'payment_failed'
                            || booking.booking_status === 'supplier_booking_failed' ? 'text-error'
                          : 'text-muted-foreground'
                      )}>
                        {booking.booking_status === 'confirmed' ? 'Confirmed'
                          : booking.booking_status === 'supplier_booking_pending' ? 'Pending'
                          : booking.booking_status === 'payment_pending' ? 'Awaiting Payment'
                          : booking.booking_status === 'payment_processing' ? 'Processing'
                          : booking.booking_status === 'payment_paid' ? 'Paid'
                          : booking.booking_status === 'payment_failed' ? 'Payment Failed'
                          : booking.booking_status === 'supplier_booking_failed' ? 'Supplier Error'
                          : booking.booking_status}
                      </span>
                      <span className="font-sans text-xs text-muted-foreground">
                        Ref: {booking.reference}
                      </span>
                    </div>
                    <h2 className="mt-2 font-serif text-2xl font-medium text-foreground">
                      {booking.property_name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {booking.destination_name}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-5 text-sm">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        <span>{booking.check_in} → {booking.check_out}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        <span>{booking.guests} guests</span>
                      </div>
                      <div className="text-foreground">
                        {booking.room_name}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Total </span>
                      <span className="font-serif text-xl font-medium text-foreground">
                        {booking.currency} {Number(booking.total).toLocaleString()}
                      </span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-1 text-sm font-medium uppercase tracking-wider text-foreground hover:text-accent"
                    >
                      View in Dashboard
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Hotel className="h-12 w-12 text-border" strokeWidth={1} />
            <h2 className="mt-6 font-serif text-2xl font-light text-foreground">No bookings yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your upcoming and past trips will appear here once you make your first booking.
            </p>
            <Link
              to="/stays"
              className="mt-6 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              Explore Stays
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
