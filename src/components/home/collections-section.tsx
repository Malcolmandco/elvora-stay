import { Link } from 'react-router-dom';
import { images } from '@/data/images';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

const collections = [
  {
    title: 'Beachfront',
    description: 'Private villas beside the sea.',
    image: images.collections.beachfront,
    alt: images.collections.beachfrontAlt,
    filter: 'Beachfront',
  },
  {
    title: 'Private Villas',
    description: 'Space, privacy and unforgettable views.',
    image: images.collections.privateVillas,
    alt: images.collections.privateVillasAlt,
    filter: 'Private Villas',
  },
  {
    title: 'City Icons',
    description: "Luxury stays in the world's most exciting cities.",
    image: images.collections.cityIcons,
    alt: images.collections.cityIconsAlt,
    filter: 'City Icons',
  },
  {
    title: 'Secluded Retreats',
    description: 'Quiet places far from ordinary.',
    image: images.collections.secludedRetreats,
    alt: images.collections.secludedRetreatsAlt,
    filter: 'Secluded Retreats',
  },
  {
    title: 'Mountain Escapes',
    description: 'Cabins, lodges and alpine retreats.',
    image: images.collections.mountainEscapes,
    alt: images.collections.mountainEscapesAlt,
    filter: 'Mountain Escapes',
  },
  {
    title: 'Island Getaways',
    description: 'Tropical destinations surrounded by water.',
    image: images.collections.islandGetaways,
    alt: images.collections.islandGetawaysAlt,
    filter: 'Island Getaways',
  },
];

export function CollectionsSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mb-10`}
        >
          <p className="eyebrow mb-3">Collections</p>
          <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
            Find your kind of escape
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          {collections.map((col, idx) => (
            <Link
              key={col.title}
              to={`/stays`}
              className={`reveal ${isVisible ? 'is-visible' : ''} group relative aspect-[5/6] overflow-hidden bg-muted`}
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <img
                src={col.image}
                alt={col.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform [transition-duration:1500ms] ease-out group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-serif text-2xl font-medium text-white">
                  {col.title}
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  {col.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
