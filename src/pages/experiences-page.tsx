import { Clock } from 'lucide-react';
import { getAllExperiences } from '@/data/destinations';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export function ExperiencesPage() {
  const experiences = getAllExperiences();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Experiences</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          More than a stay
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Turn a beautiful destination into an unforgettable experience. These
          curated experiences will be available to book alongside your stay.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {experiences.map((exp, idx) => (
            <div
              key={exp.id}
              ref={idx === 0 ? ref : undefined}
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
                <h2 className="font-serif text-2xl font-medium text-foreground">{exp.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{exp.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {exp.duration}
                  </span>
                  <span className="font-sans text-sm">
                    <span className="text-muted-foreground">From </span>
                    <span className="font-medium text-foreground">${exp.priceFrom.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
