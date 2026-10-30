import type { Destination, Property } from '@/types';
import { destinations } from './destinations';
import { properties } from './properties';
import {
  resolvePropertyDestination,
  getPropertyDestinationIds,
  getChildDestinationIds,
  getDestinationBySlugFromResolver,
} from './destination-resolver';

/**
 * DESTINATION QUERIES
 *
 * This module bridges the properties and destinations modules to provide
 * query functions that need both data sets. It lives separately to avoid
 * circular dependencies.
 *
 * All property → destination matching uses canonical IDs, not string matching.
 */

export function getPropertiesByDestinationId(destinationId: string): Property[] {
  const childIds = getChildDestinationIds(destinationId);
  const allIds = [destinationId, ...childIds];

  return properties.filter((p) => {
    if (!p.isActive) return false;
    if (p.locationStatus === 'needs_review') return false;
    const propDestIds = getPropertyDestinationIds(p);
    return propDestIds.some((id) => allIds.includes(id));
  });
}

export function getPropertiesByDestinationSlug(slug: string): Property[] {
  const dest = getDestinationBySlugFromResolver(slug);
  if (!dest) return [];
  return getPropertiesByDestinationId(dest.id);
}

export function getDestinationStayCount(destinationId: string): number {
  return getPropertiesByDestinationId(destinationId).length;
}

export function getDestinationsWithCounts(): Destination[] {
  return destinations.map((d) => ({
    ...d,
    stayCount: getDestinationStayCount(d.id),
  }));
}

export function getPopularDestinationsWithCounts(): Destination[] {
  return getDestinationsWithCounts().filter((d) => d.popular);
}

export interface DataIntegrityReport {
  totalProperties: number;
  resolved: number;
  needsReview: number;
  missingDestination: number;
  totalDestinations: number;
  destinationsWithStays: number;
  destinationsWithZeroStays: number;
  duplicateDestinations: number;
}

export function getDataIntegrityReport(): DataIntegrityReport {
  let resolved = 0;
  let needsReview = 0;
  let missingDestination = 0;

  for (const p of properties) {
    const destId = resolvePropertyDestination(p);
    if (destId) {
      resolved++;
    } else if (p.locationStatus === 'needs_review') {
      needsReview++;
    } else {
      missingDestination++;
    }
  }

  const destsWithStays = destinations.filter(
    (d) => getDestinationStayCount(d.id) > 0
  ).length;

  const slugSet = new Set<string>();
  let duplicateDestinations = 0;
  for (const d of destinations) {
    if (slugSet.has(d.slug)) duplicateDestinations++;
    slugSet.add(d.slug);
  }

  return {
    totalProperties: properties.length,
    resolved,
    needsReview,
    missingDestination,
    totalDestinations: destinations.length,
    destinationsWithStays: destsWithStays,
    destinationsWithZeroStays: destinations.length - destsWithStays,
    duplicateDestinations,
  };
}

export function resolveAllProperties(): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const p of properties) {
    result[p.id] = resolvePropertyDestination(p);
  }
  return result;
}
