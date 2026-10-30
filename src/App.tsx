import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FavoritesProvider } from '@/context/favorites-context';
import { BookingProvider } from '@/context/booking-context';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { HomePage } from '@/pages/home-page';
import { StaysPage } from '@/pages/stays-page';
import { PropertyDetailPage } from '@/pages/property-detail-page';
import { BookingPage } from '@/pages/booking-page';
import { DestinationsPage } from '@/pages/destinations-page';
import { DestinationDetailPage } from '@/pages/destination-detail-page';
import { ExperiencesPage } from '@/pages/experiences-page';
import { FavoritesPage } from '@/pages/favorites-page';
import { BookingsPage } from '@/pages/bookings-page';
import { AboutPage } from '@/pages/about-page';
import { ContactPage } from '@/pages/contact-page';
import { LoginPage } from '@/pages/login-page';
import { SignupPage } from '@/pages/signup-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { CheckoutPage } from '@/pages/checkout-page';
import { BookingConfirmationPage } from '@/pages/booking-confirmation-page';
import { AdminPage } from '@/pages/admin-page';
import { AdminLoginPage } from '@/pages/admin-login-page';
import { FlightsPage } from '@/pages/flights-page';
import { CarsPage } from '@/pages/cars-page';
import { CarDetailPage } from '@/pages/car-detail-page';
import { AirportPickupPage } from '@/pages/airport-pickup-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { ProtectedAdminRoute } from '@/components/shared/protected-admin-route';

function ScrollToTop() {
  useScrollToTop();
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FavoritesProvider>
        <BookingProvider>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/destinations" element={<DestinationsPage />} />
              <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
              <Route path="/stays" element={<StaysPage />} />
              <Route path="/stays/:slug" element={<PropertyDetailPage />} />
              <Route path="/stays/:slug/book" element={<BookingPage />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/cars" element={<CarsPage />} />
              <Route path="/cars/:slug" element={<CarDetailPage />} />
              <Route path="/airport-pickup" element={<AirportPickupPage />} />
              <Route path="/transfers" element={<Navigate to="/airport-pickup" replace />} />
              <Route path="/trips" element={<Navigate to="/dashboard" replace />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/experiences" element={<ExperiencesPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/account" element={<Navigate to="/dashboard" replace />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BookingProvider>
      </FavoritesProvider>
    </BrowserRouter>
  );
}
