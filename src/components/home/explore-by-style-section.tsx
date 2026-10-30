import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { images } from '@/data/images';

const styles = [
  {
    title: 'Beachfront Escapes',
    description: 'Wake up to the sound of waves and step directly onto the sand.',
    image: images.collections.beachfront,
    alt: images.collections.beachfrontAlt,
  },
  {
    title: 'Island Retreats',
    description: 'Secluded luxury surrounded by turquoise water.',
    image: images.collections.islandGetaways,
    alt: images.collections.islandGetawaysAlt,
  },
  {
    title: 'Mountain Escapes',
    description: 'Fresh air, panoramic views, and alpine serenity.',
    image: images.collections.mountainEscapes,
    alt: images.collections.mountainEscapesAlt,
  },
];

export function ExploreByStyleSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`}
        >
          <div>
            <p className="eyebrow mb-3">Explore by Style</p>
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              Find your kind of escape
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {styles.map((style, idx) => (
            <Link
              key={style.title}
              to="/stays"
              className={`reveal ${isVisible ? 'is-visible' : ''} group relative aspect-[4/5] overflow-hidden bg-muted`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <img
                src={style.image}
                alt={style.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform [transition-duration:1500ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-serif text-2xl font-medium text-white">{style.title}</h3>
                <p className="mt-1 text-sm text-white/70">{style.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-white/90">
                  Search stays
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
