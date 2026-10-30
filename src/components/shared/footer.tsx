import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook } from 'lucide-react';
import { Logo } from './logo';

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { label: 'Destinations', to: '/destinations' },
      { label: 'Stays', to: '/stays' },
      { label: 'Flights', to: '/flights' },
      { label: 'Cars', to: '/cars' },
      { label: 'Airport Pickup', to: '/airport-pickup' },
      { label: 'About', to: '/about' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Sign In', to: '/login' },
      { label: 'Bookings', to: '/bookings' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Our Story', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/about' },
      { label: 'Terms', to: '/about' },
      { label: 'Cookie Policy', to: '/about' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60">
              Extraordinary stays around the world. Curated, managed and delivered by Elvora Stay.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="#"
                aria-label="Instagram"
                className="text-background/50 transition-colors hover:text-background"
              >
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="text-background/50 transition-colors hover:text-background"
              >
                <Twitter className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="text-background/50 transition-colors hover:text-background"
              >
                <Facebook className="h-4 w-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 font-sans text-xs font-medium uppercase tracking-[0.2em] text-background/50">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-background/70 transition-colors hover:text-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-background/10 pt-8">
          <p className="text-xs text-background/50">
            &copy; 2026 Elvora Stay. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
