import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { images } from '@/data/images';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

interface EditorialSplitProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  linkTo?: string;
  linkLabel?: string;
  reverse?: boolean;
}

export function EditorialSplit({
  eyebrow = 'Destination Feature',
  title = 'Bali',
  description = 'Where tropical landscapes meet extraordinary design. Discover private villas, oceanfront retreats and hidden escapes across the island.',
  image = images.editorialSplit.bali,
  imageAlt = images.editorialSplit.baliAlt,
  linkTo = '/destinations/bali',
  linkLabel = 'Explore Bali',
  reverse = false,
}: EditorialSplitProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-background py-20 lg:py-28">
      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} mx-auto grid max-w-[1400px] grid-cols-1 items-stretch gap-8 px-6 lg:grid-cols-2 lg:gap-12 lg:px-10`}
      >
        {/* Image */}
        <div className={`relative aspect-[4/3] overflow-hidden bg-muted lg:aspect-auto ${reverse ? 'lg:order-2' : ''}`}>
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content */}
        <div className={`flex flex-col justify-center py-4 ${reverse ? 'lg:order-1' : ''}`}>
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h2 className="font-serif text-5xl font-light leading-[0.95] tracking-tight text-foreground md:text-6xl">
            {title}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">
            <Link
              to={linkTo}
              className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-accent"
            >
              {linkLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
