import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { PropertyCard } from '@/components/shared/property-card';
import { useFeaturedProperties } from '@/hooks/use-properties';
import { getFeaturedProperties as getFeaturedPropertiesFallback } from '@/data/properties';

export function SignatureStaysSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const { properties: dbFeatured, loading } = useFeaturedProperties(3);
  const featured = dbFeatured.length > 0 ? dbFeatured : getFeaturedPropertiesFallback().slice(0, 3);

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`}
        >
          <div>
            <p className="eyebrow mb-3">Elvora Collection</p>
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              Signature stays
              <br />
              curated by Elvora
            </h2>
          </div>
          <Link
            to="/stays"
            className="link-underline text-sm text-foreground"
          >
            Explore all stays
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>

        <div className={`reveal ${isVisible ? 'is-visible' : ''} grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8`}>
          {featured.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/stays"
            className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
            Explore stays
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
