import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { images } from '@/data/images';
import { TrustSection } from '@/components/home/trust-section';

export function AboutPage() {
  return (
    <div className="bg-background pt-24 md:pt-28">
      {/* Hero */}
      <div className="relative flex min-h-[50vh] items-end overflow-hidden bg-foreground">
        <div className="absolute inset-0">
          <img src={images.propertyImages.amalfi3} alt="Amalfi Coast coastline" className="h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-10 lg:px-10">
          <p className="eyebrow-accent text-white/70">About Elvora Stay</p>
          <h1 className="mt-3 font-serif text-5xl font-light leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
            Extraordinary
            <br />
            stays, curated.
          </h1>
        </div>
      </div>

      {/* Story */}
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-10">
        <p className="eyebrow mb-3">Our Story</p>
        <h2 className="font-serif text-3xl font-light leading-tight text-foreground md:text-4xl">
          We believe where you stay defines how you travel.
        </h2>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Elvora Stay was founded on a simple premise: the world's most
            extraordinary places should be effortless to discover and book. We
            curate a collection of exceptional properties — from private
            beachfront villas to secluded mountain retreats — and manage every
            detail so that your only job is to arrive.
          </p>
          <p>
            Unlike marketplace platforms where anyone can list a property, we
            control our entire inventory. Every stay in our collection is
            selected, managed and maintained to the Elvora Stay standard. This
            means consistent quality, accurate descriptions, and a seamless
            booking experience from discovery to departure.
          </p>
          <p>
            Our team travels the world seeking out properties that offer
            something more than a place to sleep — places with architecture that
            takes your breath away, views that stay with you, and experiences
            that become part of your story.
          </p>
        </div>
      </div>

      {/* Image break */}
      <div className="relative h-[50vh] overflow-hidden bg-foreground">
        <img src={images.editorial.artOfEscape} alt="Luxury villa with infinity pool on cliffside" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <TrustSection />

      {/* CTA */}
      <div className="bg-foreground py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-serif text-4xl font-light text-white md:text-5xl">
            Begin your journey
          </h2>
          <p className="mt-4 text-base text-white/60">
            Explore our collection of extraordinary stays around the world.
          </p>
          <Link
            to="/stays"
            className="mt-8 inline-flex items-center gap-2 bg-white px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-white/85"
          >
            Explore Stays
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
