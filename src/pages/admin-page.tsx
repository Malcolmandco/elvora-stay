import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Calendar, Users, MapPin, Sparkles,
  Star, Tag, MessageSquare, CreditCard, BarChart3, Settings,
  ArrowRight, Lock, Search,
  Clock, Plane, Car, Navigation as NavIcon, Plug, Check,
  RefreshCw, Database, AlertTriangle, Loader2, ListChecks, Play, Pause, Square,
  ShieldCheck, Zap, Activity, LogOut, Menu, X, Camera, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActiveProperties, getFeaturedProperties, getNewProperties, getPropertiesCount, getVerifiedCount, getBookableCount } from '@/data/properties';
import { getAllExperiences } from '@/data/destinations';
import { getDataIntegrityReport, getDestinationsWithCounts } from '@/data/destination-queries';
import { supabase } from '@/lib/supabase';
import { useAdminAuth, useAdminSignOut } from '@/hooks/use-admin-auth';
import { AdminStaysSection } from '@/components/admin/admin-stays-section';
import { AdminDestinationsSection } from '@/components/admin/admin-destinations-section';
import { HotelbedsSyncCenter } from '@/components/admin/hotelbeds-sync-center';
import { ImageAuditSection } from '@/components/admin/image-audit-section';
import { ImageRepairSection } from '@/components/admin/image-repair-section';
import type { BookingRecord } from '@/types/booking';

const adminSections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stays', label: 'Stays', icon: Building2 },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'destinations', label: 'Destinations', icon: MapPin },
  { id: 'experiences', label: 'Experiences', icon: Sparkles },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'promotions', label: 'Promotions', icon: Tag },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'data-integrity', label: 'Data Integrity', icon: BarChart3 },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'hb-sync', label: 'Hotelbeds Sync', icon: Database },
  { id: 'hb-queue', label: 'Catalog Queue', icon: ListChecks },
  { id: 'image-audit', label: 'Hotel Image Audit', icon: Camera },
  { id: 'image-repair', label: 'Image Repair', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AdminPage() {
  const { user, isAdmin } = useAdminAuth();
  const signOut = useAdminSignOut();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const dest = searchParams.get('dest');
    if (dest) {
      setActiveSection('stays');
    }
  }, [searchParams]);

  const properties = getActiveProperties();
  const newProperties = getNewProperties();
  const destinations = getDestinationsWithCounts();
  const integrityReport = getDataIntegrityReport();
  const experiences = getAllExperiences();

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-foreground px-6">
        <div className="w-full max-w-sm text-center">
          <Lock className="mx-auto h-10 w-10 text-white/40" strokeWidth={1} />
          <h1 className="mt-4 font-serif text-3xl font-light text-white">Admin Access Required</h1>
          <p className="mt-2 text-sm text-white/50">
            You must be signed in as an administrator to view this page.
          </p>
          <Link to="/admin/login" className="mt-6 inline-flex items-center gap-2 bg-white px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-white/85">
            Sign In
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  const activeSectionLabel = adminSections.find((s) => s.id === activeSection)?.label || 'Dashboard';

  const selectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — persistent on desktop, drawer on mobile */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 overflow-y-auto border-r border-border bg-background transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-medium text-foreground">Elvora Stay</p>
              <p className="text-[0.625rem] uppercase tracking-wider text-accent">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground transition-colors hover:text-foreground md:hidden"
            title="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Admin user info */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
            <p className="text-[0.625rem] uppercase tracking-wider text-accent">Administrator</p>
          </div>
          <button
            onClick={signOut}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <div className="p-3">
          <p className="px-3 py-2 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">Management</p>
          <nav className="mt-1 flex flex-col gap-0.5">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => selectSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-foreground text-background'
                      : 'text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Admin top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground transition-colors hover:text-foreground md:hidden"
            title="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <h1 className="font-serif text-lg font-medium text-foreground">{activeSectionLabel}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user.email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
          {activeSection === 'dashboard' && (
            <div>
              <h1 className="font-serif text-3xl font-light text-foreground">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Overview of your Elvora Stay platform.</p>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Properties" value={getPropertiesCount()} />
                <StatCard label="Verified" value={getVerifiedCount()} />
                <StatCard label="Bookable" value={getBookableCount()} />
                <StatCard label="Destinations" value={destinations.length} />
              </div>
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="border border-border bg-background p-6">
                  <h2 className="font-serif text-xl font-medium text-foreground">Recent Properties</h2>
                  <div className="mt-4 space-y-3">
                    {properties.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0">
                        <div className="h-12 w-16 shrink-0 overflow-hidden bg-muted">
                          <img src={p.images[0].url} alt={p.images[0].alt} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.city}, {p.country}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{p.pricePerNight !== null ? `${p.pricePerNight}/night` : 'Check avail.'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-border bg-background p-6">
                  <h2 className="font-serif text-xl font-medium text-foreground">New Properties</h2>
                  <div className="mt-4 space-y-3">
                    {newProperties.length > 0 ? newProperties.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0">
                        <div className="h-12 w-16 shrink-0 overflow-hidden bg-muted">
                          <img src={p.images[0].url} alt={p.images[0].alt} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.propertyType}</p>
                        </div>
                        <span className="bg-accent/10 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-accent">New</span>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No new properties.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'stays' && (
            <AdminStaysSection
              initialDestinationSlug={searchParams.get('dest') || undefined}
              onClearDestFilter={() => { setSearchParams({}); }}
              onOpenSyncCenter={() => setActiveSection('hb-sync')}
            />
          )}

          {activeSection === 'destinations' && (
            <AdminDestinationsSection />
          )}

          {activeSection === 'experiences' && (
            <div>
              <h1 className="font-serif text-3xl font-light text-foreground">Experiences</h1>
              <p className="mt-1 text-sm text-muted-foreground">{experiences.length} experiences</p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {experiences.map((exp) => (
                  <div key={exp.id} className="border border-border bg-background p-4">
                    <div className="h-32 overflow-hidden bg-muted">
                      <img src={exp.image} alt={exp.imageAlt} className="h-full w-full object-cover" />
                    </div>
                    <h3 className="mt-3 font-serif text-lg font-medium text-foreground">{exp.name}</h3>
                    <p className="text-xs text-muted-foreground">{exp.category} · From ${exp.priceFrom}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'data-integrity' && (
            <div>
              <h1 className="font-serif text-3xl font-light text-foreground">Data Integrity</h1>
              <p className="mt-1 text-sm text-muted-foreground">Property-to-destination relationship health check.</p>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Properties" value={integrityReport.totalProperties} />
                <StatCard label="Correctly Linked" value={integrityReport.resolved} />
                <StatCard label="Needs Review" value={integrityReport.needsReview + integrityReport.missingDestination} />
                <StatCard label="Duplicate Destinations" value={integrityReport.duplicateDestinations} />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Destinations" value={integrityReport.totalDestinations} />
                <StatCard label="With Stays" value={integrityReport.destinationsWithStays} />
                <StatCard label="Zero Stays" value={integrityReport.destinationsWithZeroStays} />
                <StatCard label="Missing Destination" value={integrityReport.missingDestination} />
              </div>
              <div className="mt-8 border border-border bg-background p-6">
                <h2 className="font-serif text-xl font-medium text-foreground">Unresolved Properties</h2>
                <p className="mt-1 text-xs text-muted-foreground">Properties that could not be automatically linked to a destination.</p>
                <div className="mt-4 space-y-2">
                  {properties.filter((p) => p.locationStatus === 'needs_review').length > 0 ? (
                    properties.filter((p) => p.locationStatus === 'needs_review').map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.city}, {p.country} · slug: {p.destinationSlug}</p>
                        </div>
                        <span className="bg-warning/10 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-warning">Needs Review</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">All properties are correctly linked to destinations.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div>
              <h1 className="font-serif text-3xl font-light text-foreground">Supplier Integrations</h1>
              <p className="mt-1 text-sm text-muted-foreground">Live API connections for flights, stays, cars and transfers.</p>
              <div className="mt-8 space-y-4">
                <IntegrationCard
                  icon={Plane}
                  title="Flights"
                  supplier="Duffel"
                  secretName="DUFFEL_ACCESS_TOKEN"
                  description="Real-time flight search and booking via Duffel's airline API."
                  testEndpoint="flights-search"
                />
                <IntegrationCard
                  icon={Building2}
                  title="Live Stays"
                  supplier="Hotelbeds Hotels"
                  secretName="HOTELBEDS_API_KEY + HOTELBEDS_SECRET"
                  description="Live hotel availability, rates, and booking via Hotelbeds Hotels API. Test environment."
                  testEndpoint="hotelbeds-search"
                />
                <IntegrationCard
                  icon={Car}
                  title="Cars"
                  supplier="Duffel Cars"
                  secretName="DUFFEL_ACCESS_TOKEN"
                  description="Real-time car rental search and booking via Duffel Cars API."
                  testEndpoint="cars-search"
                />
                <IntegrationCard
                  icon={NavIcon}
                  title="Airport Transfers"
                  supplier="Hotelbeds Transfers"
                  secretName="HOTELBEDS_API_KEY + HOTELBEDS_SECRET"
                  description="Airport transfer availability and booking via Hotelbeds Transfers API."
                  testEndpoint="transfers-search"
                />
              </div>
              <div className="mt-8 space-y-4">
                <div className="border border-border bg-background p-6">
                  <h2 className="font-serif text-xl font-medium text-foreground">Integration Status</h2>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Hotelbeds Hotels</p>
                        <p className="text-xs text-muted-foreground">Environment: TEST · Live stay provider</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-accent">
                        <Check className="h-3 w-3" />
                        Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Duffel Stays</p>
                        <p className="text-xs text-muted-foreground">Pending access</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Pending access
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Duffel (Flights, Cars)</p>
                        <p className="text-xs text-muted-foreground">Requires DUFFEL_ACCESS_TOKEN</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Not configured
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Payment Gateway</p>
                        <p className="text-xs text-muted-foreground">Will be connected for hotel booking</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Not configured yet
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <p className="text-xs text-muted-foreground">Booking confirmations and notifications</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Not configured yet
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border border-border bg-secondary p-6">
                  <h2 className="font-serif text-xl font-medium text-foreground">Live stay provider</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hotelbeds is the primary live hotel inventory provider. All stay search results come from real-time Hotelbeds availability.
                    Credentials are stored securely in Supabase Edge Function secrets and are never exposed to the browser.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li><code className="bg-foreground/5 px-2 py-0.5">HOTELBEDS_API_KEY</code> — Hotel search, destination autocomplete, rate validation</li>
                    <li><code className="bg-foreground/5 px-2 py-0.5">HOTELBEDS_SECRET</code> — Signature generation for API authentication</li>
                    <li><code className="bg-foreground/5 px-2 py-0.5">DUFFEL_ACCESS_TOKEN</code> — Required for Flights and Cars</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'bookings' && (
            <AdminBookingsSection />
          )}

          {activeSection === 'hb-sync' && (
            <HotelbedsSyncCenter />
          )}

          {activeSection === 'hb-queue' && (
            <AdminHBQueueSection />
          )}

          {activeSection === 'image-audit' && (
            <ImageAuditSection />
          )}

          {activeSection === 'image-repair' && (
            <ImageRepairSection />
          )}

          {['customers', 'reviews', 'promotions', 'messages', 'payments', 'analytics', 'settings'].includes(activeSection) && (
            <div>
              <h1 className="font-serif text-3xl font-light text-foreground capitalize">{activeSection}</h1>
              <p className="mt-1 text-sm text-muted-foreground">This section will be fully developed as the platform grows.</p>
              <div className="mt-8 border border-border bg-background p-12 text-center">
                <Search className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-muted-foreground">
                  The {activeSection} management interface is under development.
                  Database tables, forms and data flows will be connected here.
                </p>
                <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline">
                  Return to site
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ icon: Icon, title, supplier, secretName, description, testEndpoint }: {
  icon: typeof Plane;
  title: string;
  supplier: string;
  secretName: string;
  description: string;
  testEndpoint: string;
}) {
  return (
    <div className="border border-border bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-secondary">
            <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{supplier}</p>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            Not configured
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Required secret: <code className="bg-foreground/5 px-2 py-0.5">{secretName}</code>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Test endpoint: <code className="bg-foreground/5 px-2 py-0.5">/functions/v1/{testEndpoint}</code>
        </p>
      </div>
    </div>
  );
}

function AdminBookingsSection() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
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
  }, []);

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'payment_pending', label: 'Payment Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'supplier_booking_pending', label: 'Supplier Pending' },
    { value: 'payment_pending', label: 'Payment Pending' },
    { value: 'payment_processing', label: 'Payment Processing' },
    { value: 'payment_paid', label: 'Payment Paid' },
    { value: 'payment_failed', label: 'Payment Failed' },
    { value: 'supplier_booking_failed', label: 'Supplier Failed' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return b.payment_status === 'paid';
    if (filter === 'payment_pending') return b.payment_status === 'pending';
    return b.booking_status === filter;
  });

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-light text-foreground">Bookings</h1>
        <div className="mt-8 border border-border bg-background p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-light text-foreground">Bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">{bookings.length} total bookings</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
              filter === f.value
                ? 'bg-foreground text-background'
                : 'border border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="mt-6 border border-border bg-background p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">No bookings match this filter.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Payment Provider</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Payment Ref</th>
                <th className="px-4 py-3">Booking Status</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{b.reference}</span>
                    {b.supplier_booking_reference && (
                      <p className="text-xs text-muted-foreground">{b.supplier_booking_reference}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{b.property_name}</p>
                    <p className="text-xs text-muted-foreground">{b.destination_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{b.guest_first_name} {b.guest_last_name}</p>
                    <p className="text-xs text-muted-foreground">{b.guest_email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.check_in} → {b.check_out}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.supplier || '—'}
                    {b.supplier_booking_reference && (
                      <p className="text-xs">Ref: {b.supplier_booking_reference}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.payment_provider || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
                      b.payment_status === 'paid' ? 'bg-accent/10 text-accent'
                        : b.payment_status === 'failed' ? 'bg-error/10 text-error'
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {b.payment_reference || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
                      b.booking_status === 'confirmed' ? 'bg-accent/10 text-accent'
                        : b.booking_status === 'supplier_booking_pending' || b.booking_status === 'payment_pending' || b.booking_status === 'payment_processing' || b.booking_status === 'payment_paid' ? 'bg-warning/10 text-warning'
                        : b.booking_status === 'failed' || b.booking_status === 'cancelled' || b.booking_status === 'payment_failed' || b.booking_status === 'supplier_booking_failed' ? 'bg-error/10 text-error'
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {b.booking_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {b.currency} {Number(b.total).toLocaleString()}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border border-border bg-secondary p-4">
        <p className="text-xs text-muted-foreground">
          Payment status can only be set by the connected payment provider's verified server-side response. Admins cannot manually mark bookings as paid.
        </p>
      </div>
    </div>
  );
}


function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-background p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-medium text-foreground">{value}</p>
    </div>
  );
}

interface QueueRow {
  id: string;
  destination_id: string | null;
  destination_name: string;
  destination_slug: string;
  hotelbeds_code: string;
  verified_hotelbeds_code: string | null;
  verification_status: string;
  sync_status: string;
  current_position: number;
  total_available: number;
  target_count: number;
  processed_count: number;
  inserted_count: number;
  updated_count: number;
  duplicate_count: number;
  failed_count: number;
  last_error: string | null;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_synced_at: string | null;
  next_resume_position: number | null;
  discovery_retry_count: number;
  last_discovery_attempt_at: string | null;
  account_role: string;
  priority: number;
  verified_at: string | null;
  verification_evidence: Record<string, unknown> | null;
  discovery_candidates: unknown[] | null;
  discovery_notes: string | null;
}

interface QueueStats {
  total: number;
  verified: number;
  pending_verification: number;
  verification_failed: number;
  ambiguous: number;
  discovering: number;
  pending: number;
  ready: number;
  running: number;
  partial: number;
  completed: number;
  paused: number;
  quota_paused: number;
  failed: number;
  total_properties: number;
  total_target: number;
}

interface QueueSettings {
  id: number;
  hotels_per_destination: number;
  api_page_size: number;
  concurrent_destinations: number;
  automatic_resume: boolean;
  rate_limit_protection: boolean;
  queue_running: boolean;
  last_api_status: number | null;
  last_quota_event: string | null;
  last_quota_event_at: string | null;
  quota_paused: boolean;
  quota_paused_at: string | null;
  quota_paused_reason: string | null;
  quota_paused_endpoint: string | null;
  quota_paused_credential_role: string | null;
  quota_paused_batch_completed: number;
  discovery_batch_size: number;
  discovery_sample_size: number;
}

function AdminHBQueueSection() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState<QueueSettings | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'status' }) },
      );
      if (res.ok) {
        const data = await res.json() as { queue: QueueRow[]; stats: QueueStats; settings: QueueSettings };
        setQueue(data.queue || []);
        setStats(data.stats || null);
        setSettings(data.settings || null);
        setEditSettings(data.settings ? { ...data.settings } : null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action, ...extra }) },
      );
      const data = await res.json();
      if (data.error) {
        setActionResult(`Error: ${data.error}`);
      } else {
        setActionResult(`${action} succeeded`);
      }
      await fetchStatus();
    } catch {
      setActionResult(`${action} request failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const discoverDest = async (destinationId: string) => {
    setActionLoading(`discover-${destinationId}`);
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'discover', destinationId }) },
      );
      const data = await res.json();
      if (data.discovered && data.verified) {
        setActionResult(`Discovered: ${data.verifiedCode} for ${data.originalCode ? data.originalCode + ' → ' : ''}${data.totalHotels || 0} hotels. Score: ${data.score}/3`);
      } else if (data.ambiguous) {
        setActionResult(`Ambiguous: multiple candidates with equal score. Manual review needed.`);
      } else {
        setActionResult(`Discovery failed: ${data.reason || data.error || 'no valid candidate found'}`);
      }
      await fetchStatus();
    } catch {
      setActionResult('Discovery request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const discoverNext = async () => {
    setActionLoading('discover-next');
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'discover_next' }) },
      );
      const data = await res.json();
      const succeeded = data.results?.filter((r: { discovered: boolean }) => r.discovered).length || 0;
      const total = data.results?.length || 0;
      if (data.quota_paused) {
        setActionResult(`Quota paused after ${data.batch_completed || 0} destinations. ${succeeded} verified out of ${total} processed.`);
      } else {
        setActionResult(`Discovery batch: ${succeeded} verified out of ${total} destinations. Click "Discover Next 5" to continue.`);
      }
      await fetchStatus();
    } catch {
      setActionResult('Discovery batch request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const discoverSelected = async (destinationIds: string[]) => {
    setActionLoading('discover-selected');
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'discover_batch', destinationIds }) },
      );
      const data = await res.json();
      const succeeded = data.results?.filter((r: { discovered: boolean }) => r.discovered).length || 0;
      const total = data.results?.length || 0;
      if (data.quota_paused) {
        setActionResult(`Quota paused. ${succeeded} verified out of ${total} processed.`);
      } else {
        setActionResult(`Discovery: ${succeeded} verified out of ${total} destinations.`);
      }
      await fetchStatus();
    } catch {
      setActionResult('Discovery request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const resetQuota = async () => {
    setActionLoading('reset-quota');
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'reset_quota' }) },
      );
      const data = await res.json();
      setActionResult(data.message || 'Quota pause reset');
      await fetchStatus();
    } catch {
      setActionResult('Reset quota request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pauseDiscoveryAction = async () => {
    setActionLoading('pause-discovery');
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'pause_discovery' }) },
      );
      const data = await res.json();
      setActionResult('Discovery paused');
      await fetchStatus();
    } catch {
      setActionResult('Pause request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const resetFailed = async (destinationIds?: string[]) => {
    setActionLoading('reset-failed');
    setActionResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'reset_failed', destinationIds }) },
      );
      const data = await res.json();
      setActionResult(data.message || 'Failed destinations reset');
      await fetchStatus();
    } catch {
      setActionResult('Reset failed request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const verifyDest = async (destinationId: string) => {
    setActionLoading(`verify-${destinationId}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'verify', destinationId }) },
      );
      const data = await res.json();
      if (data.verified) {
        setActionResult(`Verified: ${data.code} — ${data.total} hotels available`);
      } else {
        setActionResult(`Verification failed: ${data.error || 'unknown'}`);
      }
      await fetchStatus();
    } catch {
      setActionResult('Verification request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const saveSettings = async () => {
    if (!editSettings) return;
    setActionLoading('save-settings');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-queue-manager`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update_settings',
            settings: {
              hotels_per_destination: editSettings.hotels_per_destination,
              api_page_size: editSettings.api_page_size,
              concurrent_destinations: editSettings.concurrent_destinations,
              automatic_resume: editSettings.automatic_resume,
              rate_limit_protection: editSettings.rate_limit_protection,
            },
          }),
        },
      );
      setActionResult('Settings saved');
      await fetchStatus();
    } catch {
      setActionResult('Failed to save settings');
    } finally {
      setActionLoading(null);
    }
  };

  const syncStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-accent/10 text-accent';
      case 'running': return 'bg-primary/10 text-primary';
      case 'ready': return 'bg-primary/5 text-primary';
      case 'partial': return 'bg-warning/10 text-warning';
      case 'quota_paused': return 'bg-warning/10 text-warning';
      case 'paused': return 'bg-secondary text-muted-foreground';
      case 'failed': return 'bg-error/10 text-error';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const verifStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-accent/10 text-accent';
      case 'verifying': return 'bg-primary/10 text-primary';
      case 'discovering': return 'bg-primary/10 text-primary';
      case 'verification_failed': return 'bg-error/10 text-error';
      case 'ambiguous': return 'bg-warning/10 text-warning';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-light text-foreground">Catalog Queue</h1>
        <div className="mt-8 border border-border bg-background p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-light text-foreground">Catalog Queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Resumable automated Hotelbeds catalog sync across all Elvora destinations.
      </p>

      {actionResult && (
        <div className="mt-4 border border-border bg-background px-4 py-3 text-sm text-foreground">
          {actionResult}
        </div>
      )}

      {/* Summary Dashboard */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Destinations</p>
            <p className="mt-1 font-serif text-2xl font-medium text-foreground">{stats.total}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Verified</p>
            <p className="mt-1 font-serif text-2xl font-medium text-accent">{stats.verified}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 font-serif text-2xl font-medium text-muted-foreground">{stats.pending_verification}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Ambiguous</p>
            <p className="mt-1 font-serif text-2xl font-medium text-warning">{stats.ambiguous || 0}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Running</p>
            <p className="mt-1 font-serif text-2xl font-medium text-primary">{stats.running}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Quota Paused</p>
            <p className="mt-1 font-serif text-2xl font-medium text-warning">{settings?.quota_paused ? 'Yes' : 'No'}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Failed</p>
            <p className="mt-1 font-serif text-2xl font-medium text-error">{stats.verification_failed}</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">HB Properties</p>
            <p className="mt-1 font-serif text-2xl font-medium text-foreground">{stats.total_properties.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Queue Controls */}
      <div className="mt-6 border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium text-foreground">Queue Controls</h2>
          {settings && (
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider',
              settings.queue_running ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
            )}>
              <Activity className="h-3 w-3" />
              {settings.queue_running ? 'Running' : 'Stopped'}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => runAction('seed')}
            disabled={actionLoading === 'seed'}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {actionLoading === 'seed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Database className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Seed Queue
          </button>
          <button
            onClick={discoverNext}
            disabled={actionLoading === 'discover-next' || settings?.quota_paused}
            className="inline-flex items-center gap-2 border border-primary px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            {actionLoading === 'discover-next' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Search className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Discover Next {settings?.discovery_batch_size || 5}
          </button>
          <button
            onClick={resetQuota}
            disabled={actionLoading === 'reset-quota' || !settings?.quota_paused}
            className="inline-flex items-center gap-2 border border-accent px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
          >
            {actionLoading === 'reset-quota' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Resume After Quota Reset
          </button>
          <button
            onClick={pauseDiscoveryAction}
            disabled={actionLoading === 'pause-discovery' || settings?.quota_paused}
            className="inline-flex items-center gap-2 border border-warning px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-warning transition-colors hover:bg-warning/10 disabled:opacity-40"
          >
            {actionLoading === 'pause-discovery' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Pause Discovery
          </button>
          <button
            onClick={() => resetFailed()}
            disabled={actionLoading === 'reset-failed'}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {actionLoading === 'reset-failed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Reset Failed
          </button>
          <button
            onClick={() => runAction('start')}
            disabled={actionLoading === 'start' || settings?.queue_running}
            className="inline-flex items-center gap-2 bg-foreground px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
          >
            {actionLoading === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Start Queue
          </button>
          <button
            onClick={() => runAction('pause')}
            disabled={actionLoading === 'pause' || !settings?.queue_running}
            className="inline-flex items-center gap-2 border border-warning px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-warning transition-colors hover:bg-warning/10 disabled:opacity-40"
          >
            {actionLoading === 'pause' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Pause
          </button>
          <button
            onClick={() => runAction('resume')}
            disabled={actionLoading === 'resume' || settings?.queue_running}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {actionLoading === 'resume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Resume
          </button>
          <button
            onClick={() => runAction('stop')}
            disabled={actionLoading === 'stop'}
            className="inline-flex items-center gap-2 border border-error px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-error transition-colors hover:bg-error/10 disabled:opacity-40"
          >
            {actionLoading === 'stop' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Square className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Stop
          </button>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Refresh
          </button>
        </div>

        {/* Quota Paused Banner */}
        {settings?.quota_paused && (
          <div className="mt-4 border border-error bg-error/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-error">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              Hotelbeds API — Quota Paused
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p><span className="text-muted-foreground/60">Paused at:</span> {settings.quota_paused_at ? new Date(settings.quota_paused_at).toLocaleString() : '—'}</p>
              <p><span className="text-muted-foreground/60">Reason:</span> {settings.quota_paused_reason || '—'}</p>
              <p><span className="text-muted-foreground/60">Endpoint:</span> {settings.quota_paused_endpoint || '—'}</p>
              <p><span className="text-muted-foreground/60">Credential:</span> {settings.quota_paused_credential_role || '—'}</p>
              <p><span className="text-muted-foreground/60">Completed before pause:</span> {settings.quota_paused_batch_completed}</p>
            </div>
          </div>
        )}

        {/* Quota event (legacy) */}
        {!settings?.quota_paused && settings?.last_quota_event && (
          <div className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>
              {settings.last_quota_event}
              {settings.last_quota_event_at && ` — ${new Date(settings.last_quota_event_at).toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      {/* Settings */}
      {editSettings && (
        <div className="mt-6 border border-border bg-background p-6">
          <h2 className="font-serif text-xl font-medium text-foreground">Sync Settings</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Hotels per Destination</label>
              <input
                type="number"
                value={editSettings.hotels_per_destination}
                onChange={(e) => setEditSettings({ ...editSettings, hotels_per_destination: Number(e.target.value) || 500 })}
                min={10}
                max={500}
                className="w-full border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">API Page Size</label>
              <input
                type="number"
                value={editSettings.api_page_size}
                onChange={(e) => setEditSettings({ ...editSettings, api_page_size: Number(e.target.value) || 25 })}
                min={10}
                max={100}
                className="w-full border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Concurrent Destinations</label>
              <input
                type="number"
                value={editSettings.concurrent_destinations}
                onChange={(e) => setEditSettings({ ...editSettings, concurrent_destinations: Number(e.target.value) || 3 })}
                min={1}
                max={10}
                className="w-full border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editSettings.automatic_resume}
                  onChange={(e) => setEditSettings({ ...editSettings, automatic_resume: e.target.checked })}
                  className="h-4 w-4"
                />
                Auto Resume
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editSettings.rate_limit_protection}
                  onChange={(e) => setEditSettings({ ...editSettings, rate_limit_protection: e.target.checked })}
                  className="h-4 w-4"
                />
                Rate Limit Protection
              </label>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={saveSettings}
              disabled={actionLoading === 'save-settings'}
              className="inline-flex items-center gap-2 bg-foreground px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
            >
              {actionLoading === 'save-settings' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      <div className="mt-6">
        <h2 className="font-serif text-xl font-medium text-foreground">Destination Queue</h2>
        <div className="mt-4 max-h-[600px] overflow-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3">Destination</th>
                <th className="px-3 py-3">HB Code</th>
                <th className="px-3 py-3">Verified Code</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Hotels</th>
                <th className="px-3 py-3">Sync</th>
                <th className="px-3 py-3">Inserted</th>
                <th className="px-3 py-3">Reason / Notes</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => {
                const evidence = row.verification_evidence as { score?: number } | null;
                const score = evidence?.score;
                const reason = row.discovery_notes || row.last_error || '';
                return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-medium text-foreground">{row.destination_name}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">
                    {row.hotelbeds_code}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {row.verified_hotelbeds_code || '—'}
                    {row.verified_hotelbeds_code && row.verified_hotelbeds_code !== row.hotelbeds_code && (
                      <span className="ml-1 text-xs text-warning">(was {row.hotelbeds_code})</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider', verifStatusColor(row.verification_status))}>
                      {row.verification_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {score != null ? `${score}/3` : '—'}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.total_available || '—'}</td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider', syncStatusColor(row.sync_status))}>
                      {row.sync_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-accent">{row.inserted_count}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={reason}>
                    {reason || '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.verification_status !== 'verified' && row.verification_status !== 'verifying' && row.verification_status !== 'discovering' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => discoverDest(row.destination_id!)}
                          disabled={actionLoading === `discover-${row.destination_id}`}
                          className="inline-flex items-center gap-1.5 border border-primary px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                        >
                          {actionLoading === `discover-${row.destination_id}` ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Search className="h-3 w-3" strokeWidth={1.5} />}
                          Discover
                        </button>
                        <button
                          onClick={() => verifyDest(row.destination_id!)}
                          disabled={actionLoading === `verify-${row.destination_id}`}
                          className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          {actionLoading === `verify-${row.destination_id}` ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />}
                          Verify
                        </button>
                      </div>
                    )}
                    {(row.verification_status === 'verifying' || row.verification_status === 'discovering') && (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-muted-foreground" strokeWidth={1.5} />
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account info */}
      <div className="mt-6 border border-border bg-secondary p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Account B (catalog) is used exclusively for all Content API synchronization. Account A is never used for catalog sync.</span>
        </div>
      </div>
    </div>
  );
}
