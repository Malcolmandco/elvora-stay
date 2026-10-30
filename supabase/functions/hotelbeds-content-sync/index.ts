// Hotelbeds Content Sync v2.5 - Editorial override protection added
// Uses shared credential module for environment-based config (test/production)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsCatalogConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildHotelbedsImageUrl(path: string): string {
  if (!path) return "";
  const prefixHttps = "https://photos.hotelbeds.com/giata/";
  if (path.startsWith("http")) return path;
  return prefixHttps + path.replace(/^\/+/, "");
}

interface HotelbedsHotel {
  code: number;
  name: { content: string };
  description?: { content: string };
  country?: { code: string; description?: string };
  city?: { content: string };
  address?: { content: string };
  coordinates?: { latitude: number; longitude: number };
  category?: { code: string; name?: { content: string } };
  images?: Array<{ path: string; typeCode: string; typeDescription?: string }>;
  facilities?: Array<{ code: number; description?: { content: string } }>;
  destinationCode?: string;
  destinationName?: { content?: string };
  chain?: { code: number; name?: { content: string } };
}

// Hotelbeds destination code → Elvora destination name lookup
const HB_DEST_MAP: Record<string, string> = {
  PAR: "Paris",
  LON: "London",
  NYC: "New York",
  MIA: "Miami",
  DXB: "Dubai",
  DPS: "Bali",
  MLE: "Maldives",
  JTR: "Santorini",
  UKY: "Kyoto",
  TYO: "Tokyo",
  HKT: "Phuket",
  BCN: "Barcelona",
  ROE: "Rome",
  LIS: "Lisbon",
  BKK: "Bangkok",
  SIN: "Singapore",
  HKG: "Hong Kong",
  SYD: "Sydney",
  IST: "Istanbul",
  AMS: "Amsterdam",
  VIE: "Vienna",
  PRG: "Prague",
  BER: "Berlin",
  MAD: "Madrid",
  FLR: "Florence",
  VCE: "Venice",
  CUN: "Cancun",
  SJD: "Los Cabos",
  LAX: "Los Angeles",
  SFO: "San Francisco",
  LAS: "Las Vegas",
  FAO: "Algarve",
  NAP: "Amalfi Coast",
  CPT: "Cape Town",
  RAK: "Marrakech",
  AUH: "Abu Dhabi",
  NCE: "French Riviera",
  MCM: "Monaco",
  ZRH: "Zermatt",
  GVA: "Swiss Alps",
  INN: "Austrian Alps",
  NBO: "Kenya",
  SEZ: "Seychelles",
  MRU: "Mauritius",
  BOB: "Bora Bora",
  ZQN: "Queenstown",
  AKL: "Auckland",
  MEL: "Melbourne",
  SJO: "Costa Rica",
  BUE: "Buenos Aires",
  RIO: "Rio de Janeiro",
  ATH: "Athens",
  JMK: "Mykonos",
  RHO: "Greek Islands",
  IBZ: "Ibiza",
  PMI: "Mallorca",
  DBV: "Dubrovnik",
  SPU: "Split",
  TIV: "Montenegro",
  ZNZ: "Zanzibar",
  KGL: "Rwanda",
  MCT: "Oman",
  DOH: "Qatar",
  NAN: "Fiji",
  HNL: "Honolulu",
  OGG: "Maui",
  KOA: "Big Island",
  LIH: "Kauai",
  EYW: "Key West",
  NAS: "Bahamas",
  BGI: "Barbados",
  MBJ: "Jamaica",
  UVF: "St. Lucia",
  AUA: "Aruba",
  PUJ: "Dominican Republic",
  PLS: "Turks and Caicos",
  SAN: "San Diego",
  PSP: "Palm Springs",
  PHX: "Scottsdale",
  JAC: "Jackson Hole",
  DEN: "Aspen",
  SLC: "Park City",
  RNO: "Lake Tahoe",
  MCO: "Orlando",
  MSY: "New Orleans",
  AUS: "Austin",
  DFW: "Dallas",
  HOU: "Houston",
  PVR: "Puerto Vallarta",
  MEX: "Mexico City",
  CTG: "Cartagena",
  PTY: "Panama",
  SAO: "Sao Paulo",
  CUR: "Curacao",
  SJU: "Puerto Rico",
  USM: "Koh Samui",
  CTS: "Niseko",
  MIL: "Milan",
  FNC: "Madeira",
  TLN: "Saint-Tropez",
  TUY: "Tulum",
};

interface SyncResponse {
  synced: number;
  skipped: number;
  errors: string[];
  total: number;
  inserted: number;
  updated: number;
  duplicates: number;
  unmapped: number;
  pagesProcessed: number;
  lastFrom: number;
  rateLimited: boolean;
  syncStatus: string;
  resumeFrom: number | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, secret, baseUrl, environment } = getHotelbedsCatalogConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({ error: "Hotelbeds API credentials not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const {
      destinationCode,
      countryCodes,
      batchSize,
      overwrite,
      maxCount,
      resumeFrom,
      syncLogId,
    } = body as {
      destinationCode?: string;
      countryCodes?: string[];
      batchSize?: number;
      overwrite?: boolean;
      maxCount?: number;
      resumeFrom?: number;
      syncLogId?: string;
    };

    if (!destinationCode && !countryCodes) {
      return new Response(
        JSON.stringify({ error: "Either destinationCode or countryCodes is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Server-side safety cap: never more than 500 hotels per invocation
    const MAX_SYNC_LIMIT = 500;
    const size = Math.min(batchSize || 50, 1000);
    const effectiveMax = Math.min(maxCount ?? MAX_SYNC_LIMIT, MAX_SYNC_LIMIT);
    const headers = await buildHotelbedsHeaders(apiKey, secret);
    const result: SyncResponse = {
      synced: 0,
      skipped: 0,
      errors: [],
      total: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      unmapped: 0,
      pagesProcessed: 0,
      lastFrom: resumeFrom ?? 1,
      rateLimited: false,
      syncStatus: "in_progress",
      resumeFrom: null,
    };

    // Pre-resolve destination once if destinationCode is provided
    let resolvedDest: { id: string; slug: string; name: string } | null = null;
    const destCodeForLookup = destinationCode ? destinationCode.toUpperCase() : "";
    if (destCodeForLookup) {
      const elvoraName = HB_DEST_MAP[destCodeForLookup];
      if (elvoraName) {
        const { data: dest } = await supabase
          .from("destinations")
          .select("id, slug, name")
          .ilike("name", elvoraName)
          .maybeSingle();
        if (dest) resolvedDest = dest;
      }
    }

    // Initialize or update sync log
    let logId = syncLogId;
    if (!logId && destCodeForLookup) {
      const { data: existingLog } = await supabase
        .from("hotelbeds_sync_log")
        .select("id, last_page_from, sync_status")
        .eq("hotelbeds_code", destCodeForLookup)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLog && existingLog.sync_status === "in_progress") {
        logId = existingLog.id;
        // Resume from last position
        if (!resumeFrom) {
          result.lastFrom = existingLog.last_page_from || 1;
        }
      }

      if (!logId) {
        const { data: newLog } = await supabase
          .from("hotelbeds_sync_log")
          .insert({
            destination_id: resolvedDest?.id || null,
            destination_name: resolvedDest?.name || destCodeForLookup,
            hotelbeds_code: destCodeForLookup,
            sync_status: "in_progress",
            started_at: new Date().toISOString(),
            last_page_from: resumeFrom ?? 1,
          })
          .select("id")
          .single();
        if (newLog) logId = newLog.id;
      }
    }

    const updateSyncLog = async (updates: Record<string, unknown>) => {
      if (!logId) return;
      await supabase
        .from("hotelbeds_sync_log")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", logId);
    };

    // Fetch hotel content from Hotelbeds Content API with resumable pagination
    let from = resumeFrom ?? result.lastFrom;
    let hasMore = true;
    let consecutiveErrors = 0;

    while (hasMore) {
      // Hard stop when maxCount is reached
      if (result.synced + result.skipped >= effectiveMax) {
        hasMore = false;
        result.resumeFrom = from;
        result.syncStatus = "partial";
        break;
      }

      let url: string;
      if (destinationCode) {
        url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&destinationCode=${destinationCode.toUpperCase()}&language=ENG&from=${from}&to=${from + size - 1}`;
      } else {
        const countryParam = countryCodes!.map((c) => c.toUpperCase()).join(",");
        url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&countryCodes=${countryParam}&language=ENG&from=${from}&to=${from + size - 1}`;
      }

      let contentResponse: Response;
      try {
        contentResponse = await fetch(url, { method: "GET", headers });
      } catch {
        result.errors.push(`Network error fetching batch starting at ${from}`);
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          result.syncStatus = "failed";
          await updateSyncLog({
            sync_status: "failed",
            last_error: "3 consecutive network errors",
            last_page_from: from,
          });
          break;
        }
        // Exponential backoff
        await sleep(Math.pow(2, consecutiveErrors) * 1000);
        continue;
      }

      // Rate-limit detection (403 or 429)
      if (contentResponse.status === 403 || contentResponse.status === 429) {
        const rawBody = await contentResponse.text().catch(() => "");
        result.rateLimited = true;
        result.syncStatus = "rate_limited";
        result.resumeFrom = from;
        result.errors.push(`Rate limited at page from=${from} (HTTP ${contentResponse.status}). Response: ${rawBody.substring(0, 300)}. Sync paused. Resume from ${from}.`);
        await updateSyncLog({
          sync_status: "rate_limited",
          last_error: `Rate limited at from=${from}`,
          last_page_from: from,
          pages_processed: result.pagesProcessed,
          hotels_processed: result.synced + result.skipped,
          hotels_inserted: result.inserted,
          hotels_updated: result.updated,
          duplicates_skipped: result.duplicates,
          unmapped_count: result.unmapped,
          total_hotels: result.total,
        });
        break;
      }

      if (!contentResponse.ok) {
        const errText = await contentResponse.text().catch(() => "");
        let errMsg = `Hotelbeds API error at batch ${from}: status ${contentResponse.status}`;
        try {
          const j = JSON.parse(errText);
          errMsg = j?.error?.message || j?.message || errMsg;
        } catch { /* keep default */ }
        result.errors.push(errMsg);
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          result.syncStatus = "failed";
          await updateSyncLog({
            sync_status: "failed",
            last_error: errMsg,
            last_page_from: from,
          });
          break;
        }
        // Exponential backoff
        await sleep(Math.pow(2, consecutiveErrors) * 1000);
        continue;
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      const contentData = await contentResponse.json();
      const hotels: HotelbedsHotel[] = Array.isArray(contentData?.hotels) ? contentData.hotels : [];
      const total = contentData?.total || 0;
      result.total = total;
      result.pagesProcessed++;

      if (hotels.length === 0) {
        hasMore = false;
        break;
      }

      // Batch-check existing supplier hotels (including editorial_override flag)
      const hotelCodes = hotels.map((h) => String(h.code));
      const { data: existingRows } = await supabase
        .from("properties")
        .select("id, supplier_hotel_code, editorial_override")
        .eq("supplier_name", "hotelbeds")
        .in("supplier_hotel_code", hotelCodes);
      const existingMap = new Map<string, string>();
      const editorialOverrideMap = new Map<string, boolean>();
      for (const row of existingRows || []) {
        if (row.supplier_hotel_code) {
          existingMap.set(row.supplier_hotel_code, row.id);
          editorialOverrideMap.set(row.supplier_hotel_code, row.editorial_override === true);
        }
      }

      const rowsToUpsert: Record<string, unknown>[] = [];

      for (const hotel of hotels) {
        if (result.synced + result.skipped >= effectiveMax) {
          hasMore = false;
          result.resumeFrom = from;
          result.syncStatus = "partial";
          break;
        }

        const hotelCode = String(hotel.code);
        const hotelName = hotel.name?.content || `Hotel ${hotelCode}`;

        const existingId = existingMap.get(hotelCode);
        const hasEditorialOverride = editorialOverrideMap.get(hotelCode) === true;

        // Skip existing properties unless overwrite is requested
        if (existingId && !overwrite) {
          result.skipped++;
          result.duplicates++;
          continue;
        }

        // If the property has editorial overrides, only update sync timestamp
        // — do NOT overwrite any base fields (name, description, images, etc.)
        // This protects admin editorial changes from being overwritten by sync
        if (existingId && hasEditorialOverride) {
          await supabase
            .from("properties")
            .update({
              last_synced_at: new Date().toISOString(),
              supplier_status: "connected",
            })
            .eq("id", existingId);
          result.updated++;
          result.synced++;
          continue;
        }

        const isUpdate = !!existingId;

        // Build images array — preserve typeCode/typeDescription for exterior classification
        const images = (hotel.images || []).slice(0, 10).map((img, idx) => ({
          id: `hb-${hotelCode}-img-${idx}`,
          url: buildHotelbedsImageUrl(img.path),
          alt: `${hotelName} - ${img.typeDescription || "hotel photo"}`,
          type_code: img.typeCode || "",
          type_description: img.typeDescription || "",
        })).filter((img) => img.url);

        // Build amenities from facilities
        const amenities = (hotel.facilities || []).slice(0, 30).map((f) => f?.description?.content || "").filter((s) => s);

        // Build description
        const description = hotel.description?.content || "";
        const shortDesc = description ? description.substring(0, 200) + (description.length > 200 ? "..." : "") : hotelName;

        const slug = slugify(hotelName) + `-${hotelCode}`;

        // Parse category code to star rating
        const categoryCode = hotel.category?.code || "";
        const starRating = parseInt(categoryCode.match(/\d/)?.[0] || "") || null;

        const countryName = hotel.country?.description || hotel.country?.code || "";
        const destName = resolvedDest?.name || hotel.destinationName?.content || hotel.city?.content || null;

        if (!resolvedDest?.id) {
          result.unmapped++;
        }

        rowsToUpsert.push({
          id: existingId || `hb-${hotelCode}`,
          name: hotelName,
          slug,
          description: shortDesc,
          long_description: description || shortDesc,
          property_type: "Hotel",
          property_status: "catalog",
          supplier_status: "connected",
          verification_status: "needs_review",
          booking_enabled: false,
          price_display_mode: "check_availability",
          supplier_name: "hotelbeds",
          supplier_hotel_code: hotelCode,
          destination_id: resolvedDest?.id || null,
          destination_slug: resolvedDest?.slug || null,
          destination_name: destName,
          country: countryName,
          city: hotel.city?.content || destName || "",
          address: hotel.address?.content || "",
          latitude: hotel.coordinates?.latitude || null,
          longitude: hotel.coordinates?.longitude || null,
          rating: starRating,
          review_count: null,
          amenities,
          supplier_amenities: amenities,
          tags: ["Hotel"],
          collections: [],
          featured: false,
          is_active: true,
          images: images.length > 0 ? images : [{ id: `hb-${hotelCode}-placeholder`, url: "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", alt: hotelName }],
          house_rules: [],
          policies: { checkIn: "", checkOut: "", cancellation: "", damagePolicy: "" },
          updated_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        });

        if (isUpdate) {
          result.updated++;
        } else {
          result.inserted++;
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("properties")
          .upsert(rowsToUpsert, { onConflict: "id" });

        if (upsertError) {
          result.errors.push(`Batch upsert failed: ${upsertError.message}`);
        } else {
          result.synced += rowsToUpsert.length;
        }
      }

      result.lastFrom = from;

      // Update sync log progress
      await updateSyncLog({
        pages_processed: result.pagesProcessed,
        hotels_processed: result.synced + result.skipped,
        hotels_inserted: result.inserted,
        hotels_updated: result.updated,
        duplicates_skipped: result.duplicates,
        unmapped_count: result.unmapped,
        total_hotels: result.total,
        last_page_from: from,
      });

      from += size;
      if (from > total || hotels.length < size) {
        hasMore = false;
      }

      // Small delay between batches to be gentle on the API
      if (hasMore) {
        await sleep(500);
      }
    }

    // Final sync log update
    if (result.syncStatus !== "rate_limited" && result.syncStatus !== "failed") {
      result.syncStatus = result.resumeFrom ? "partial" : "completed";
    }

    await updateSyncLog({
      sync_status: result.syncStatus,
      completed_at: result.syncStatus === "completed" ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString(),
      pages_processed: result.pagesProcessed,
      hotels_processed: result.synced + result.skipped,
      hotels_inserted: result.inserted,
      hotels_updated: result.updated,
      duplicates_skipped: result.duplicates,
      unmapped_count: result.unmapped,
      total_hotels: result.total,
      last_page_from: result.lastFrom,
      last_error: result.errors.length > 0 ? result.errors.join("; ") : null,
    });

    // Update destination stay_count from actual properties
    if (resolvedDest) {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("destination_id", resolvedDest.id)
        .eq("supplier_name", "hotelbeds")
        .eq("is_active", true);

      await supabase
        .from("destinations")
        .update({
          stay_count: count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedDest.id);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
