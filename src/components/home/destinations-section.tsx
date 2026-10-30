import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import type { Destination } from '@/types';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/10490921/pexels-photo-10490921.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop';

interface DestinationRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  short_description: string;
  hero_image: string;
  hero_image_alt: string;
  stay_count: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  is_popular: boolean;
}

export function DestinationsSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('destinations')
          .select('id, name, slug, country, short_description, hero_image, hero_image_alt, stay_count, is_featured, is_active, display_order, is_popular')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('name')
          .limit(12);

        if (cancelled) return;
        if (!error && data) {
          const mapped: Destination[] = (data as DestinationRow[]).map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            country: row.country,
            shortDescription: row.short_description || '',
            longDescription: '',
            image: row.hero_image || FALLBACK_IMAGE,
            imageAlt: row.hero_image_alt || row.name,
            stayCount: row.stay_count || 0,
            latitude: null,
            longitude: null,
            featured: row.is_featured,
            popular: row.is_popular,
            isActive: row.is_active,
            displayOrder: row.display_order,
          }));
          setDestinations(mapped);
        }
      } catch {
        // fall silently — section will show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <section className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="mb-10">
            <p className="eyebrow mb-3">Discover the World</p>
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              Places worth going<br />somewhere for.
            </h2>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </section>
    );
  }

  if (destinations.length === 0) return null;

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`}
        >
          <div>
            <p className="eyebrow mb-3">Discover the World</p>
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              Places worth going
              <br />
              somewhere for.
            </h2>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 lg:px-10"
      >
        {destinations.map((dest) => (
          <Link
            key={dest.id}
            to={`/destinations/${dest.slug}`}
            className="group relative aspect-[3/4] w-[280px] shrink-0 snap-start overflow-hidden bg-muted sm:w-[340px] lg:w-[380px]"
          >
            <img
              src={dest.image || FALLBACK_IMAGE}
              alt={dest.imageAlt || dest.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform [transition-duration:1500ms] ease-out group-hover:scale-[1.05]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-white/70">
                {dest.country}
              </p>
              <h3 className="mt-1 font-serif text-3xl font-medium text-white">
                {dest.name}
              </h3>
              <p className="mt-1 text-sm text-white/70">
                {dest.shortDescription}
              </p>
              <p className="mt-3 font-sans text-xs uppercase tracking-wider text-white/60">
                {dest.stayCount} {dest.stayCount === 1 ? 'stay' : 'stays'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
