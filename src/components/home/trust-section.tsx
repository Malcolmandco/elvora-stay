import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

const benefits = [
  {
    title: 'Curated Stays',
    description: 'Exceptional properties selected for the Elvora Stay collection.',
  },
  {
    title: 'Seamless Booking',
    description: 'A simple, secure way to discover and reserve your stay.',
  },
  {
    title: 'Global Destinations',
    description: 'Extraordinary places across cities, islands, coastlines and beyond.',
  },
];

export function TrustSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mx-auto max-w-3xl text-center`}
        >
          <p className="eyebrow mb-4">The Elvora Stay Standard</p>
          <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
            Your stay. Our standard.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Every stay on Elvora Stay is selected and managed through our curated
            collection of exceptional properties.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <div
              key={benefit.title}
              className={`reveal ${isVisible ? 'is-visible' : ''} bg-background px-8 py-10 text-center`}
              style={{ transitionDelay: `${idx * 120}ms` }}
            >
              <h3 className="font-serif text-2xl font-medium text-foreground">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 border border-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all duration-300 hover:bg-foreground hover:text-background"
          >
            Learn More
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
