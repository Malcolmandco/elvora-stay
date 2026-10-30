import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { images } from '@/data/images';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export function EditorialSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-foreground">
      <div className="absolute inset-0">
        <img
          src={images.editorial.artOfEscape}
          alt={images.editorial.artOfEscapeAlt}
          loading="lazy"
          className="parallax-bg h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} relative z-10 mx-auto w-full max-w-[1400px] px-6 py-20 lg:px-10`}
      >
        <div className="max-w-2xl">
          <p className="eyebrow-accent text-white/70">Editorial</p>
          <h2 className="mt-4 font-serif text-5xl font-light leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
            The Art
            <br />
            of Escape
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
            Some places are more than somewhere to sleep. They become part of
            the story.
          </p>
          <Link
            to="/stays"
            className="mt-8 inline-flex items-center gap-2 border border-white/30 px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-foreground"
          >
            Explore the Collection
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
