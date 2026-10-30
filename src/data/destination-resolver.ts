import type { Destination, Property } from '@/types';
import { destinations } from './destinations';

/**
 * CANONICAL DESTINATION RESOLUTION SYSTEM
 *
 * This module handles ONLY destination data — it does NOT import the
 * properties array, avoiding circular dependencies. The property
 * auto-resolution loop lives in properties.ts.
 *
 * - Alias resolution (Miami Beach → Miami, Montecito → Santa Barbara, etc.)
 * - Parent-child destination hierarchy (Miami Beach is child of Miami)
 * - Property → destination ID resolution
 */

// ─── Destination Alias Map ──────────────────────────────────
const DESTINATION_ALIASES: Record<string, string> = {
  'miami beach': 'dest-miami',
  'south beach': 'dest-miami',
  'miami': 'dest-miami',
  'kailua-kona': 'dest-big-island',
  'kona': 'dest-big-island',
  'waikoloa': 'dest-big-island',
  'waimea': 'dest-big-island',
  'kohala coast': 'dest-big-island',
  'lahaina': 'dest-maui',
  'wailea': 'dest-maui',
  'kapalua': 'dest-maui',
  'honolulu': 'dest-oahu',
  'waikiki': 'dest-oahu',
  'montecito': 'dest-santa-barbara',
  'laguna beach': 'dest-laguna-beach',
  'beverly hills': 'dest-beverly-hills',
  'new york': 'dest-new-york',
  'manhattan': 'dest-new-york',
  'canyon point': 'dest-jackson-hole',
  'bora bora': 'dest-bora-bora',
  'french polynesia': 'dest-french-polynesia',
  'maldives': 'dest-maldives',
  'musandam': 'dest-oman',
  'kyoto': 'dest-kyoto',
  'tokyo': 'dest-tokyo',
  'venice': 'dest-venice',
  'lake como': 'dest-lake-como',
  'como': 'dest-lake-como',
  'amalfi': 'dest-amalfi-coast',
  'positano': 'dest-amalfi-coast',
  'ravello': 'dest-amalfi-coast',
  'paris': 'dest-paris',
  'nice': 'dest-french-riviera',
  'cannes': 'dest-cannes',
  'london': 'dest-london',
  'zermatt': 'dest-zermatt',
  'cape town': 'dest-cape-town',
  'marrakech': 'dest-marrakech',
  'santorini': 'dest-santorini',
  'oia': 'dest-santorini',
  'dubai': 'dest-dubai',
  'sydney': 'dest-sydney',
  'costa rica': 'dest-costa-rica',
  'puntarenas': 'dest-costa-rica',
  'guanacaste': 'dest-costa-rica',
  'barcelona': 'dest-barcelona',
  'los cabos': 'dest-los-cabos',
  'cabo san lucas': 'dest-los-cabos',
  'san jose del cabo': 'dest-los-cabos',
  'phuket': 'dest-phuket',
  'bangkok': 'dest-bangkok',
  'seychelles': 'dest-seychelles',
  'singapore': 'dest-singapore',
  'jackson hole': 'dest-jackson-hole',
  'jackson': 'dest-jackson-hole',
  'moran': 'dest-jackson-hole',
  'big sur': 'dest-big-sur',
  'santa barbara': 'dest-santa-barbara',
  'santa monica': 'dest-los-angeles',
  'malibu': 'dest-malibu',
};

// ─── Parent-child destination hierarchy ─────────────────────
const CHILD_TO_PARENT: Record<string, string> = {
  'dest-miami-beach': 'dest-miami',
  'dest-key-west': 'dest-florida-keys',
  'dest-beverly-hills': 'dest-los-angeles',
  'dest-malibu': 'dest-los-angeles',
  'dest-laguna-beach': 'dest-los-angeles',
  'dest-big-sur': 'dest-santa-barbara',
  'dest-honolulu': 'dest-oahu',
  'dest-cabo-san-lucas': 'dest-los-cabos',
  'dest-tulum': 'dest-riviera-maya',
  'dest-cannes': 'dest-french-riviera',
  'dest-saint-tropez': 'dest-french-riviera',
  'dest-monaco': 'dest-french-riviera',
  'dest-zermatt': 'dest-swiss-alps',
  'dest-st-moritz': 'dest-swiss-alps',
  'dest-bora-bora': 'dest-french-polynesia',
  'dest-split': 'dest-dubrovnik',
  'dest-oahu': 'dest-hawaii',
  'dest-maui': 'dest-hawaii',
  'dest-big-island': 'dest-hawaii',
  'dest-kauai': 'dest-hawaii',
};

const PARENT_TO_CHILDREN: Record<string, string[]> = {};
for (const [childId, parentId] of Object.entries(CHILD_TO_PARENT)) {
  if (!PARENT_TO_CHILDREN[parentId]) PARENT_TO_CHILDREN[parentId] = [];
  PARENT_TO_CHILDREN[parentId].push(childId);
}

const DESTINATION_BY_ID = new Map<string, Destination>();
const DESTINATION_BY_SLUG = new Map<string, Destination>();
for (const d of destinations) {
  DESTINATION_BY_ID.set(d.id, d);
  DESTINATION_BY_SLUG.set(d.slug, d);
}

export function resolvePropertyDestination(property: Property): string | null {
  if (property.destinationId && DESTINATION_BY_ID.has(property.destinationId)) {
    return property.destinationId;
  }

  const bySlug = DESTINATION_BY_SLUG.get(property.destinationSlug);
  if (bySlug) return bySlug.id;

  const cityKey = property.city.toLowerCase();
  if (DESTINATION_ALIASES[cityKey]) {
    return DESTINATION_ALIASES[cityKey];
  }

  const byCityName = destinations.find(
    (d) => d.name.toLowerCase() === cityKey || d.slug === property.destinationSlug
  );
  if (byCityName) return byCityName.id;

  return null;
}

export function getPropertyDestinationIds(property: Property): string[] {
  const primaryId = resolvePropertyDestination(property);
  if (!primaryId) return [];

  const ids = [primaryId];
  let current = primaryId;
  while (CHILD_TO_PARENT[current]) {
    current = CHILD_TO_PARENT[current];
    if (!ids.includes(current)) ids.push(current);
  }
  return ids;
}

export function getChildDestinationIds(destinationId: string): string[] {
  return PARENT_TO_CHILDREN[destinationId] || [];
}

export function getDestinationById(id: string): Destination | undefined {
  return DESTINATION_BY_ID.get(id);
}

export function getDestinationBySlugFromResolver(slug: string): Destination | undefined {
  return DESTINATION_BY_SLUG.get(slug);
}

export function searchDestinations(query: string): Destination[] {
  const lower = query.toLowerCase();
  return destinations.filter(
    (d) =>
      d.name.toLowerCase().includes(lower) ||
      d.country.toLowerCase().includes(lower) ||
      (d.region && d.region.toLowerCase().includes(lower)) ||
      d.slug.includes(lower)
  );
}

export function getDestinationsByCountry(country: string): Destination[] {
  return destinations.filter((d) => d.country === country);
}

export function getDestinationsByContinent(continent: string): Destination[] {
  return destinations.filter((d) => d.continent === continent || d.region === continent);
}

export { destinations };
