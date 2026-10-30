/**
 * Image Classification and Ordering System
 *
 * Determines which image should be the primary (first) image for a property,
 * prioritizing exterior/building photographs over rooms, pools, etc.
 *
 * Classification sources, in order of reliability:
 *  1. type_code / type_description from Hotelbeds Content API (most reliable)
 *  2. URL pattern heuristic (fallback when metadata was not stored)
 *  3. No classification possible → flag for review
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  type_code?: string;
  type_description?: string;
}

export type ImageCategory =
  | 'exterior'
  | 'room'
  | 'pool'
  | 'restaurant'
  | 'lobby'
  | 'bathroom'
  | 'kitchen'
  | 'terrace'
  | 'spa'
  | 'wellness'
  | 'generic'
  | 'pexels_fallback'
  | 'unknown';

export type ExteriorAuditStatus =
  | 'VERIFIED_EXTERIOR_PRIMARY'
  | 'EXTERIOR_CANDIDATE_UNVERIFIED'
  | 'NO_VERIFIED_EXTERIOR'
  | 'GENERIC_FALLBACK'
  | 'POSSIBLE_IMAGE_MISMATCH'
  | 'IMAGE_REVIEW_REQUIRED';

export interface ClassifiedImage extends PropertyImage {
  category: ImageCategory;
  isExterior: boolean;
  classificationSource: 'metadata' | 'url_heuristic' | 'unclassified';
  classificationConfidence: 'high' | 'medium' | 'low';
}

export interface ImageOrderResult {
  ordered: ClassifiedImage[];
  primaryImage: ClassifiedImage | null;
  auditStatus: ExteriorAuditStatus;
  reason: string;
  hasExterior: boolean;
  hasPexelsFallback: boolean;
  hasVerifiedExterior: boolean;
}

// ─── Hotelbeds type code mapping ────────────────────────────────────────
//
// Hotelbeds Content API returns image.typeCode values that correspond
// to specific image categories. These are the authoritative classification.
// Reference: Hotelbeds Content API documentation
//
const HB_TYPE_CODE_MAP: Record<string, ImageCategory> = {
  // Exterior / building
  EXT: 'exterior',
  EXTERIOR: 'exterior',
  BUILDING: 'exterior',
  ARCH: 'exterior',
  FRONT: 'exterior',
  // Rooms
  ROOM: 'room',
  HAB: 'room',
  Bedroom: 'room',
  // Pool
  POOL: 'pool',
  PISC: 'pool',
  // Restaurant / food
  REST: 'restaurant',
  FOOD: 'restaurant',
  BAR: 'restaurant',
  // Lobby
  LOBBY: 'lobby',
  RECEPT: 'lobby',
  // Bathroom
  BATH: 'bathroom',
  WC: 'bathroom',
  // Kitchen
  KIT: 'kitchen',
  // Terrace
  TERR: 'terrace',
  // Spa
  SPA: 'spa',
  // Wellness / gym
  WELL: 'wellness',
  GYM: 'wellness',
  FITNESS: 'wellness',
};

// ─── URL pattern heuristic ──────────────────────────────────────────────
//
// Hotelbeds/Giata image URLs contain an encoded type letter in the filename:
//   {code}a_hb_{type}_{number}.jpg
//
// Known patterns from database analysis:
//   hb_a_  → General/area/exterior  (5,453 occurrences)
//   hb_r_  → Room                    (6,146)
//   hb_ro_ → Room (alternate)        (15,468)
//   hb_w_  → Pool/wellness           (6,018)
//   hb_f_  → Food/restaurant         (4,151)
//   hb_l_  → Lobby                   (2,309)
//   hb_ba_ → Bathroom                (1,002)
//   hb_p_  → Pool                    (428)
//   hb_k_  → Kitchen                 (216)
//   hb_t_  → Terrace                 (114)
//   hb_s_  → Spa                     (21)
//
const URL_PATTERN_MAP: { pattern: RegExp; category: ImageCategory }[] = [
  { pattern: /_hb_a_/i, category: 'exterior' },
  { pattern: /_hb_ro_/i, category: 'room' },
  { pattern: /_hb_r_/i, category: 'room' },
  { pattern: /_hb_w_/i, category: 'pool' },
  { pattern: /_hb_p_/i, category: 'pool' },
  { pattern: /_hb_f_/i, category: 'restaurant' },
  { pattern: /_hb_l_/i, category: 'lobby' },
  { pattern: /_hb_ba_/i, category: 'bathroom' },
  { pattern: /_hb_k_/i, category: 'kitchen' },
  { pattern: /_hb_t_/i, category: 'terrace' },
  { pattern: /_hb_s_/i, category: 'spa' },
];

// ─── Classification functions ───────────────────────────────────────────

function classifyByMetadata(img: PropertyImage): { category: ImageCategory; confidence: 'high' | 'medium' | 'low' } | null {
  const typeCode = (img.type_code || '').toUpperCase().trim();
  const typeDesc = (img.type_description || '').toLowerCase().trim();

  if (typeCode && HB_TYPE_CODE_MAP[typeCode]) {
    return { category: HB_TYPE_CODE_MAP[typeCode], confidence: 'high' };
  }

  // Check type_description for keywords
  if (typeDesc) {
    if (matchAny(typeDesc, ['exterior', 'building', 'facade', 'outside', 'architect'])) {
      return { category: 'exterior', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['room', 'bedroom', 'suite', 'double', 'twin', 'single'])) {
      return { category: 'room', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['pool', 'swimming'])) {
      return { category: 'pool', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['restaurant', 'dining', 'food', 'bar', 'breakfast'])) {
      return { category: 'restaurant', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['lobby', 'reception', 'entrance hall'])) {
      return { category: 'lobby', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['bathroom', 'bath', 'shower', 'wc'])) {
      return { category: 'bathroom', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['kitchen', 'kitchenette'])) {
      return { category: 'kitchen', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['terrace', 'balcony', 'patio'])) {
      return { category: 'terrace', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['spa', 'wellness', 'massage', 'sauna'])) {
      return { category: 'spa', confidence: 'high' };
    }
    if (matchAny(typeDesc, ['gym', 'fitness', 'workout'])) {
      return { category: 'wellness', confidence: 'high' };
    }
    // "hotel photo" or generic → low confidence
    if (typeDesc === 'hotel photo' || typeDesc === 'photo' || typeDesc === '') {
      return null;
    }
  }

  return null;
}

function classifyByUrl(img: PropertyImage): { category: ImageCategory; confidence: 'high' | 'medium' | 'low' } | null {
  const url = img.url || '';
  for (const { pattern, category } of URL_PATTERN_MAP) {
    if (pattern.test(url)) {
      return { category, confidence: 'medium' };
    }
  }
  return null;
}

function isPexelsFallback(url: string): boolean {
  return url.includes('images.pexels.com');
}

function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

// ─── Single image classification ────────────────────────────────────────

export function classifyImage(img: PropertyImage): ClassifiedImage {
  // Check for Pexels fallback first
  if (isPexelsFallback(img.url)) {
    return {
      ...img,
      category: 'pexels_fallback',
      isExterior: false,
      classificationSource: 'unclassified',
      classificationConfidence: 'low',
    };
  }

  // Try metadata-based classification first (most reliable)
  const metaResult = classifyByMetadata(img);
  if (metaResult) {
    return {
      ...img,
      category: metaResult.category,
      isExterior: metaResult.category === 'exterior',
      classificationSource: 'metadata',
      classificationConfidence: metaResult.confidence,
    };
  }

  // Fall back to URL pattern heuristic
  const urlResult = classifyByUrl(img);
  if (urlResult) {
    return {
      ...img,
      category: urlResult.category,
      isExterior: urlResult.category === 'exterior',
      classificationSource: 'url_heuristic',
      classificationConfidence: urlResult.confidence,
    };
  }

  // Cannot classify
  return {
    ...img,
    category: 'unknown',
    isExterior: false,
    classificationSource: 'unclassified',
    classificationConfidence: 'low',
  };
}

// ─── Image ordering with exterior priority ──────────────────────────────
//
// Ordering priority:
//  1. Verified exterior (metadata-classified) — highest confidence
//  2. URL-heuristic exterior candidates
//  3. Other genuine property images (rooms, pools, restaurants, etc.)
//  4. Unclassified images
//  5. Pexels generic fallbacks — never as primary
//
const CATEGORY_ORDER: ImageCategory[] = [
  'exterior',
  'terrace',
  'pool',
  'room',
  'restaurant',
  'lobby',
  'wellness',
  'spa',
  'kitchen',
  'bathroom',
  'generic',
  'unknown',
  'pexels_fallback',
];

export function orderImagesByExteriorPriority(
  images: PropertyImage[],
  opts?: { elvoraImages?: PropertyImage[]; editorialOverride?: boolean },
): ImageOrderResult {
  // If editorial override is set, elvora_images take priority
  const elvoraImages = opts?.elvoraImages || [];
  const hasEditorialOverride = opts?.editorialOverride === true;

  // Classify all images
  const classified = images.map(classifyImage);
  const elvoraClassified = elvoraImages.map((img) => ({
    ...classifyImage(img),
    classificationSource: 'metadata' as const,
    classificationConfidence: 'high' as const,
  }));

  const hasPexelsFallback = classified.some((img) => img.category === 'pexels_fallback');
  const verifiedExterior = classified.filter(
    (img) => img.isExterior && img.classificationSource === 'metadata' && img.classificationConfidence === 'high',
  );
  const heuristicExterior = classified.filter(
    (img) => img.isExterior && img.classificationSource === 'url_heuristic',
  );
  const hasVerifiedExterior = verifiedExterior.length > 0;

  // Build ordered list
  let ordered: ClassifiedImage[];

  if (hasEditorialOverride && elvoraClassified.length > 0) {
    // Editorial override: elvora images first, then supplier images ordered by category
    ordered = [...elvoraClassified, ...sortClassifiedByCategory(classified)];
  } else {
    ordered = sortClassifiedByCategory(classified);
  }

  const primaryImage = ordered[0] || null;

  // Determine audit status
  let auditStatus: ExteriorAuditStatus;
  let reason: string;

  if (hasPexelsFallback && classified.every((img) => img.category === 'pexels_fallback')) {
    auditStatus = 'GENERIC_FALLBACK';
    reason = 'All images are generic Pexels stock photos. No property-specific photographs available.';
  } else if (hasVerifiedExterior) {
    auditStatus = 'VERIFIED_EXTERIOR_PRIMARY';
    reason = `Primary image classified as exterior via ${verifiedExterior[0].classificationSource} (type_code: ${verifiedExterior[0].type_code || 'N/A'}).`;
  } else if (heuristicExterior.length > 0) {
    auditStatus = 'EXTERIOR_CANDIDATE_UNVERIFIED';
    reason = `Primary image appears to be exterior based on URL pattern heuristic, but lacks metadata confirmation.`;
  } else if (primaryImage && primaryImage.category !== 'pexels_fallback') {
    auditStatus = 'NO_VERIFIED_EXTERIOR';
    reason = `No exterior image identified. Primary image is classified as ${primaryImage.category}. Property should be reviewed for an exterior photograph.`;
  } else {
    auditStatus = 'IMAGE_REVIEW_REQUIRED';
    reason = 'No suitable primary image found. Property requires manual image review.';
  }

  return {
    ordered,
    primaryImage,
    auditStatus,
    reason,
    hasExterior: hasVerifiedExterior || heuristicExterior.length > 0,
    hasPexelsFallback,
    hasVerifiedExterior,
  };
}

function sortClassifiedByCategory(images: ClassifiedImage[]): ClassifiedImage[] {
  return [...images].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);

    // Within same category, exterior with high confidence first
    if (aIdx === bIdx) {
      if (a.classificationConfidence === 'high' && b.classificationConfidence !== 'high') return -1;
      if (b.classificationConfidence === 'high' && a.classificationConfidence !== 'high') return 1;
      return 0;
    }

    return aIdx - bIdx;
  });
}

// ─── Convenience: get primary image URL ─────────────────────────────────

export function getPrimaryImageUrl(
  images: PropertyImage[],
  opts?: { elvoraImages?: PropertyImage[]; editorialOverride?: boolean },
): string | null {
  const result = orderImagesByExteriorPriority(images, opts);
  return result.primaryImage?.url || null;
}
