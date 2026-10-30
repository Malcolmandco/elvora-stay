import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Car,
  Hotel,
  MapPin,
  Heart,
  Calendar,
  User,
  Settings,
  LogOut,
  ArrowRight,
  Navigation as NavIcon,
  BedDouble,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/context/favorites-context';
import type { BookingRecord } from '@/types/booking';

interface UserProfile {
  email: string;
  fullName: string;
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const { favorites, favoritesCount } = useFavorites();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            email: authUser.email ?? '',
            fullName: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'Guest',
          });
          setUserId(authUser.id);
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setBookingsLoading(true);
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
        setBookingsLoading(false);
      }
    })();
  }, [userId]);

  const stayBookings = bookings.filter((b) => b.booking_type === 'stay');
  const confirmedStays = stayBookings.filter((b) => b.booking_status === 'confirmed');
  const pendingStays = stayBookings.filter(
    (b) => b.booking_status === 'supplier_booking_pending' || b.booking_status === 'payment_pending' || b.booking_status === 'payment_processing' || b.booking_status === 'payment_paid'
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Calendar },
    { id: 'trips', label: 'My Trips', icon: Plane },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="font-serif text-3xl font-light text-foreground">
            Please sign in
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Access your dashboard to view trips, favorites, and bookings.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              Sign In
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 border border-border px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-secondary"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Dashboard</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Welcome back, {user.fullName.split(' ')[0]}
        </h1>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <div className="mb-6 flex items-center gap-3 border border-border bg-card p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-sans text-sm font-medium text-foreground">
                {initials}
              </div>
              <div>
                <p className="font-sans text-sm font-medium text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <nav className="flex flex-row gap-2 lg:flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === tab.id
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span>{tab.label}</span>
                    {tab.id === 'favorites' && favoritesCount > 0 && (
                      <span className="ml-auto text-xs opacity-70">{favoritesCount}</span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Sign Out</span>
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div>
                <h2 className="font-serif text-2xl font-light text-foreground">Overview</h2>

                {/* Summary cards */}
                <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { icon: Plane, label: 'Flights', count: 0 },
                    { icon: Hotel, label: 'Stays', count: stayBookings.length },
                    { icon: Car, label: 'Cars', count: 0 },
                    { icon: NavIcon, label: 'Airport Pickup', count: 0 },
                  ].map((cat) => (
                    <div key={cat.label} className="border border-border bg-card p-5">
                      <cat.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                      <p className="mt-3 font-serif text-2xl font-medium text-foreground">{cat.count}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{cat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Upcoming trips */}
                <div className="mt-8">
                  <h3 className="font-serif text-xl font-light text-foreground">Upcoming stays</h3>
                  {bookingsLoading ? (
                    <div className="mt-4 border border-border bg-card p-8 text-center">
                      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                    </div>
                  ) : stayBookings.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {stayBookings.slice(0, 3).map((b) => (
                        <div key={b.id} className="flex items-center gap-4 border border-border bg-card p-4">
                          {b.property_image && (
                            <div className="h-14 w-20 shrink-0 overflow-hidden bg-muted">
                              <img src={b.property_image} alt={b.property_name ?? ''} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-sans text-sm font-medium text-foreground">{b.property_name}</p>
                            <p className="text-xs text-muted-foreground">{b.destination_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{b.check_in} → {b.check_out} · {b.room_name}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              'inline-block px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
                              b.booking_status === 'confirmed' ? 'bg-accent/10 text-accent'
                                : b.booking_status === 'supplier_booking_pending' || b.booking_status === 'payment_pending' || b.booking_status === 'payment_processing' || b.booking_status === 'payment_paid' ? 'bg-warning/10 text-warning'
                                : b.booking_status === 'payment_failed' || b.booking_status === 'supplier_booking_failed' ? 'bg-error/10 text-error'
                                : 'bg-secondary text-muted-foreground'
                            )}>
                              {b.booking_status === 'confirmed' ? 'Confirmed'
                                : b.booking_status === 'supplier_booking_pending' ? 'Pending'
                                : b.booking_status === 'payment_pending' ? 'Awaiting Payment'
                                : b.booking_status === 'payment_processing' ? 'Processing'
                                : b.booking_status === 'payment_paid' ? 'Paid'
                                : b.booking_status === 'payment_failed' ? 'Payment Failed'
                                : b.booking_status === 'supplier_booking_failed' ? 'Supplier Error'
                                : b.booking_status}
                            </span>
                            <p className="mt-1 text-xs text-muted-foreground">{b.currency} {Number(b.total).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Ref: {b.reference}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 border border-border bg-secondary p-12 text-center">
                      <Hotel className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                      <p className="mt-4 font-serif text-lg font-light text-foreground">No stays booked yet</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your booked stays will appear here.
                      </p>
                      <Link
                        to="/stays"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
                      >
                        Browse stays
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Favorites preview */}
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-light text-foreground">Saved favorites</h3>
                    {favoritesCount > 0 && (
                      <button
                        onClick={() => setActiveTab('favorites')}
                        className="text-sm font-medium uppercase tracking-wider text-accent hover:underline"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  <div className="mt-4 border border-border bg-secondary p-12 text-center">
                    <Heart className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                    <p className="mt-4 text-sm text-muted-foreground">
                      {favoritesCount > 0
                        ? `${favoritesCount} saved ${favoritesCount === 1 ? 'property' : 'properties'}`
                        : 'Save properties by tapping the heart icon.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trips' && (
              <div>
                <h2 className="font-serif text-2xl font-light text-foreground">My Trips</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your stay bookings — all in one place.
                </p>
                {bookingsLoading ? (
                  <div className="mt-6 border border-border bg-card p-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                  </div>
                ) : stayBookings.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    {stayBookings.map((b) => (
                      <div key={b.id} className="border border-border bg-card p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          {b.property_image && (
                            <div className="h-24 w-full shrink-0 overflow-hidden bg-muted sm:h-20 sm:w-28">
                              <img src={b.property_image} alt={b.property_name ?? ''} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-sans text-sm font-medium text-foreground">{b.property_name}</p>
                                <p className="text-xs text-muted-foreground">{b.destination_name}</p>
                              </div>
                              <span className={cn(
                                'inline-block px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
                                b.booking_status === 'confirmed' ? 'bg-accent/10 text-accent'
                                  : b.booking_status === 'supplier_booking_pending' || b.booking_status === 'payment_pending' || b.booking_status === 'payment_processing' || b.booking_status === 'payment_paid' ? 'bg-warning/10 text-warning'
                                  : b.booking_status === 'cancelled' || b.booking_status === 'payment_failed' || b.booking_status === 'supplier_booking_failed' ? 'bg-error/10 text-error'
                                  : 'bg-secondary text-muted-foreground'
                              )}>
                                {b.booking_status === 'confirmed' ? 'Confirmed'
                                  : b.booking_status === 'supplier_booking_pending' ? 'Pending Confirmation'
                                  : b.booking_status === 'payment_pending' ? 'Awaiting Payment'
                                  : b.booking_status === 'payment_processing' ? 'Processing'
                                  : b.booking_status === 'payment_paid' ? 'Paid'
                                  : b.booking_status === 'payment_failed' ? 'Payment Failed'
                                  : b.booking_status === 'supplier_booking_failed' ? 'Supplier Error'
                                  : b.booking_status === 'cancelled' ? 'Cancelled'
                                  : b.booking_status}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                              <div>
                                <p className="uppercase tracking-wider">Check-in</p>
                                <p className="mt-0.5 font-medium text-foreground">{b.check_in}</p>
                              </div>
                              <div>
                                <p className="uppercase tracking-wider">Check-out</p>
                                <p className="mt-0.5 font-medium text-foreground">{b.check_out}</p>
                              </div>
                              <div>
                                <p className="uppercase tracking-wider">Guests</p>
                                <p className="mt-0.5 font-medium text-foreground">{b.guests}</p>
                              </div>
                              <div>
                                <p className="uppercase tracking-wider">Room</p>
                                <p className="mt-0.5 font-medium text-foreground">{b.room_name}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Ref: {b.reference}</p>
                                {b.supplier_booking_reference && (
                                  <p className="text-xs text-muted-foreground">Supplier: {b.supplier_booking_reference}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-serif text-lg font-medium text-foreground">
                                  {b.currency} {Number(b.total).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Payment: {b.payment_status}
                                </p>
                              </div>
                            </div>
                            {b.cancellation_policy && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Cancellation: {b.cancellation_policy}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 border border-border bg-secondary p-12 text-center">
                    <Hotel className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                    <p className="mt-4 font-serif text-xl font-light text-foreground">No bookings yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your stay bookings will appear here.
                    </p>
                    <Link
                      to="/stays"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
                    >
                      Browse stays
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div>
                <h2 className="font-serif text-2xl font-light text-foreground">Favorites</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your saved properties and destinations.
                </p>
                <div className="mt-6 border border-border bg-secondary p-12 text-center">
                  <Heart className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {favoritesCount > 0
                      ? `${favoritesCount} saved ${favoritesCount === 1 ? 'property' : 'properties'}`
                      : 'Browse stays and tap the heart icon to save your favorites.'}
                  </p>
                  <Link
                    to="/stays"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
                  >
                    Browse stays
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-lg">
                <h2 className="font-serif text-2xl font-light text-foreground">Profile</h2>
                <p className="mt-2 text-sm text-muted-foreground">Manage your personal information.</p>
                <form className="mt-6 space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <input type="text" defaultValue={user.fullName} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                    <input type="email" defaultValue={user.email} disabled className="w-full border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</label>
                    <input type="tel" defaultValue="" placeholder="Add phone number" className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                  <button type="button" className="bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85">
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-lg">
                <h2 className="font-serif text-2xl font-light text-foreground">Settings</h2>
                <p className="mt-2 text-sm text-muted-foreground">Manage your account preferences.</p>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email notifications</p>
                      <p className="text-xs text-muted-foreground">Receive travel inspiration and booking updates</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-foreground peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Promotional offers</p>
                      <p className="text-xs text-muted-foreground">Receive exclusive offers and promotions</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-foreground peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
