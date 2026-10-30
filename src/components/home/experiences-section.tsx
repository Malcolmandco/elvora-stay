import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { getAllExperiences } from '@/data/destinations';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export function ExperiencesSection() {
  const experiences = getAllExperiences();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'is-visible' : ''} mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`}
        >
          <div>
            <p className="eyebrow mb-3">Experiences</p>
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              More than a stay
            </h2>
            <p className="mt-3 max-w-md text-base text-muted-foreground">
              Turn a beautiful destination into an unforgettable experience.
            </p>
          </div>
          <Link to="/experiences" className="link-underline text-sm text-foreground">
            All experiences
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          {experiences.map((exp, idx) => (
            <div
              key={exp.id}
              className={`reveal ${isVisible ? 'is-visible' : ''} group`}
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={exp.image}
                  alt={exp.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.05]"
                />
                <div className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 font-sans text-[0.625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
                  {exp.category}
                </div>
              </div>
              <div className="pt-4">
                <h3 className="font-serif text-xl font-medium text-foreground">
                  {exp.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {exp.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {exp.duration}
                  </span>
                  <span className="font-sans text-sm">
                    <span className="text-muted-foreground">From </span>
                    <span className="font-medium text-foreground">
                      ${exp.priceFrom.toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
