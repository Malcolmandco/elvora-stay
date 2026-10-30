import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export function NewsletterSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section className="bg-foreground py-20 lg:py-28">
      <div
        ref={ref}
        className={`reveal ${isVisible ? 'is-visible' : ''} mx-auto max-w-2xl px-6 text-center`}
      >
        <p className="eyebrow-accent text-white/60">Newsletter</p>
        <h2 className="mt-4 font-serif text-4xl font-light leading-tight tracking-tight text-white md:text-5xl">
          Go somewhere beautiful.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/60">
          Receive new destinations, extraordinary stays and travel inspiration
          from Elvora Stay.
        </p>

        {submitted ? (
          <p className="mt-8 font-sans text-sm uppercase tracking-wider text-accent">
            Thank you for subscribing. Welcome to Elvora Stay.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
              className="w-full max-w-sm border-b border-white/30 bg-transparent px-2 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none sm:w-80"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-white px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all duration-300 hover:bg-white/85"
            >
              Subscribe
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
