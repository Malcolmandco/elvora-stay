import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SearchPanel } from '@/components/shared/search-panel';
import { images } from '@/data/images';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-foreground">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={images.hero}
          alt={images.heroAlt}
          className="parallax-bg h-full w-full object-cover"
          style={{ animation: 'slow-zoom 12s ease-out forwards' }}
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-8 pt-32 lg:px-10 lg:pb-12">
        <div
          className="max-w-3xl"
          style={{ animation: 'fade-up 1s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}
        >
          <p className="eyebrow-accent text-white/80">
            Elvora Stay
          </p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            Escape
            <br />
            Different.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Discover extraordinary stays, from private beachfront villas and
            secluded retreats to iconic hotels and unforgettable resorts around
            the world.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              to="/stays"
              className="inline-flex items-center gap-2 bg-white px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all duration-300 hover:bg-white/85"
            >
              Explore Stays
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link
              to="/destinations"
              className="link-underline text-sm text-white/90 hover:text-white"
            >
              Discover Destinations
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Search Panel */}
        <div
          className="mt-10 lg:mt-12"
          style={{ animation: 'fade-up 1s cubic-bezier(0.16,1,0.3,1) 0.6s both' }}
        >
          <SearchPanel variant="hero" />
        </div>
      </div>
    </section>
  );
}
