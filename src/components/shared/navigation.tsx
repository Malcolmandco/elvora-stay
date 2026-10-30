import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const navLinks = [
  { label: 'Discover', to: '/' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Stays', to: '/stays' },
  { label: 'Flights', to: '/flights' },
  { label: 'Cars', to: '/cars' },
  { label: 'Airport Pickup', to: '/airport-pickup' },
  { label: 'About', to: '/about' },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparent = isHome && !scrolled;

  return (
    <>
      {/* Desktop Navigation */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 hidden transition-all duration-500 md:block',
          isTransparent
            ? 'bg-transparent py-5'
            : 'bg-background/95 py-3 shadow-sm backdrop-blur-md'
        )}
      >
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Logo variant={isTransparent ? 'light' : 'dark'} />

          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={cn(
                    'link-underline text-sm',
                    isTransparent ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-foreground',
                    location.pathname === link.to && 'font-medium'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-5">
            <Link
              to="/stays"
              aria-label="Search"
              className={cn(
                'transition-colors hover:opacity-70',
                isTransparent ? 'text-white' : 'text-foreground'
              )}
            >
              <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
            </Link>
            <Link
              to="/dashboard"
              aria-label="Dashboard"
              className={cn(
                'transition-colors hover:opacity-70',
                isTransparent ? 'text-white' : 'text-foreground'
              )}
            >
              <User className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
            </Link>
            <Link
              to="/login"
              className={cn(
                'link-underline text-sm',
                isTransparent ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-foreground'
              )}
            >
              Sign In
            </Link>
            <Link
              to="/stays"
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all duration-300',
                isTransparent
                  ? 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
                  : 'bg-foreground text-background hover:bg-foreground/85'
              )}
            >
              Explore Stays
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 md:hidden',
          isTransparent
            ? 'bg-transparent py-4'
            : 'bg-background/95 py-3 shadow-sm backdrop-blur-md'
        )}
      >
        <nav className="mx-auto flex max-w-screen-sm items-center justify-between px-5">
          <Logo variant={isTransparent ? 'light' : 'dark'} />

          <div className="flex items-center gap-3">
            <Link
              to="/stays"
              aria-label="Search"
              className={cn(
                'transition-colors',
                isTransparent ? 'text-white' : 'text-foreground'
              )}
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className={cn(
                    'transition-colors',
                    isTransparent ? 'text-white' : 'text-foreground'
                  )}
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm border-l border-border bg-background p-0">
                <SheetHeader className="border-b border-border px-6 py-5">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-left">
                      <Logo />
                    </SheetTitle>
                    <SheetClose asChild>
                      <button aria-label="Close menu" className="text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    </SheetClose>
                  </div>
                </SheetHeader>
                <div className="flex flex-col px-6 py-6">
                  <ul className="flex flex-col gap-1">
                    {navLinks.map((link) => (
                      <li key={link.to}>
                        <SheetClose asChild>
                          <Link
                            to={link.to}
                            className={cn(
                              'block border-b border-border py-4 font-serif text-2xl font-light transition-colors hover:text-accent',
                              location.pathname === link.to && 'text-accent'
                            )}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-col gap-3">
                    <SheetClose asChild>
                      <Link
                        to="/login"
                        className="flex items-center gap-3 py-2 text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <User className="h-4 w-4" strokeWidth={1.5} />
                        Sign In
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 py-2 text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <User className="h-4 w-4" strokeWidth={1.5} />
                        My Dashboard
                      </Link>
                    </SheetClose>
                  </div>
                  <SheetClose asChild>
                    <Link
                      to="/stays"
                      className="mt-8 inline-flex items-center justify-center gap-2 bg-foreground px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                    >
                      Explore Stays
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
    </>
  );
}
