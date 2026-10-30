import { HeroSection } from '@/components/home/hero-section';
import { DestinationsSection } from '@/components/home/destinations-section';
import { SignatureStaysSection } from '@/components/home/signature-stays-section';
import { EditorialSection } from '@/components/home/editorial-section';
import { CollectionsSection } from '@/components/home/collections-section';
import { EditorialSplit } from '@/components/home/editorial-split';
import { ExploreByStyleSection } from '@/components/home/explore-by-style-section';
import { ExperiencesSection } from '@/components/home/experiences-section';
import { TrustSection } from '@/components/home/trust-section';
import { NewsletterSection } from '@/components/home/newsletter-section';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <DestinationsSection />
      <SignatureStaysSection />
      <EditorialSection />
      <CollectionsSection />
      <ExploreByStyleSection />
      <EditorialSplit />
      <ExperiencesSection />
      <TrustSection />
      <NewsletterSection />
    </>
  );
}
