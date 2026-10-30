// Hotelbeds Amenities Enrichment v1.0
// Fetches REAL amenities from Hotelbeds Content API for hotelbeds-sourced properties.
// Only updates supplier_amenities — never touches elvora_amenities or amenities_override.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsCatalogConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface EnrichResponse {
  processed: number;
  enriched: number;
  skipped: number;
  errors: string[];
  noFacilities: number;
  total: number;
  rateLimited: boolean;
  status: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, secret, baseUrl } = getHotelbedsCatalogConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({ error: "Hotelbeds catalog credentials not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const {
      batchSize,
      maxCount,
      destinationId,
      propertyIds,
      onlyMissing,
    } = body as {
      batchSize?: number;
      maxCount?: number;
      destinationId?: string;
      propertyIds?: string[];
      onlyMissing?: boolean;
    };

    const size = Math.min(batchSize || 50, 1000);
    const MAX_LIMIT = 500;
    const effectiveMax = Math.min(maxCount ?? MAX_LIMIT, MAX_LIMIT);
    const headers = await buildHotelbedsHeaders(apiKey, secret);

    const result: EnrichResponse = {
      processed: 0,
      enriched: 0,
      skipped: 0,
      errors: [],
      noFacilities: 0,
      total: 0,
      rateLimited: false,
      status: "in_progress",
    };

    // Fetch Hotelbeds properties that need amenity enrichment
    let query = supabase
      .from("properties")
      .select("id, supplier_hotel_code, destination_id")
      .eq("supplier_name", "hotelbeds")
      .not("supplier_hotel_code", "is", null);

    if (destinationId) {
      query = query.eq("destination_id", destinationId);
    }

    if (propertyIds && propertyIds.length > 0) {
      query = query.in("id", propertyIds);
    }

    if (onlyMissing !== false) {
      query = query.or("supplier_amenities.cs.{}");
    }

    query = query.limit(effectiveMax);
    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    result.total = properties?.length || 0;

    if (result.total === 0) {
      result.status = "completed";
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Group properties by destination for batch fetching via Hotelbeds Content API
    // The Content API supports fetching by destinationCode with pagination.
    // We'll fetch hotel details individually for precision.
    let consecutiveErrors = 0;

    for (const prop of properties!) {
      if (result.processed >= effectiveMax) {
        result.status = "partial";
        break;
      }

      const hotelCode = prop.supplier_hotel_code;
      if (!hotelCode) {
        result.skipped++;
        continue;
      }

      // Fetch this hotel's content from Hotelbeds Content API
      const url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&codes=${hotelCode}&language=ENG`;

      let contentResponse: Response;
      try {
        contentResponse = await fetch(url, { method: "GET", headers });
      } catch {
        result.errors.push(`Network error fetching hotel ${hotelCode}`);
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          result.status = "failed";
          result.errors.push("5 consecutive network errors — aborting");
          break;
        }
        await sleep(Math.pow(2, consecutiveErrors) * 500);
        continue;
      }

      // Rate-limit detection
      if (contentResponse.status === 403 || contentResponse.status === 429) {
        result.rateLimited = true;
        result.status = "rate_limited";
        result.errors.push(`Rate limited at hotel ${hotelCode} (HTTP ${contentResponse.status}). Resume later.`);
        break;
      }

      if (!contentResponse.ok) {
        const errText = await contentResponse.text().catch(() => "");
        result.errors.push(`API error for hotel ${hotelCode}: ${contentResponse.status} ${errText.substring(0, 200)}`);
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          result.status = "failed";
          break;
        }
        await sleep(Math.pow(2, consecutiveErrors) * 500);
        continue;
      }

      consecutiveErrors = 0;
      result.processed++;

      const contentData = await contentResponse.json();
      const hotels = contentData?.hotels;

      if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
        // Hotel not found in Content API — set empty supplier amenities
        await supabase
          .from("properties")
          .update({ supplier_amenities: [], updated_at: new Date().toISOString() })
          .eq("id", prop.id);
        result.noFacilities++;
        result.enriched++;
        continue;
      }

      const hotel = hotels[0];
      const facilities = hotel.facilities;

      if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
        // No facilities returned — store empty array, do NOT invent amenities
        await supabase
          .from("properties")
          .update({ supplier_amenities: [], updated_at: new Date().toISOString() })
          .eq("id", prop.id);
        result.noFacilities++;
        result.enriched++;
        continue;
      }

      // Extract REAL amenity descriptions from Hotelbeds facilities
      const supplierAmenities = facilities
        .slice(0, 50)
        .map((f: { code?: number; description?: { content?: string } }) => f?.description?.content || "")
        .filter((s: string) => s.length > 0);

      // Only update supplier_amenities — never touch elvora_amenities or amenities_override
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          supplier_amenities: supplierAmenities,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prop.id);

      if (updateError) {
        result.errors.push(`Update failed for ${hotelCode}: ${updateError.message}`);
        result.skipped++;
      } else {
        result.enriched++;
      }

      // Small delay to be gentle on the API
      await sleep(200);
    }

    if (result.status !== "rate_limited" && result.status !== "failed" && result.status !== "partial") {
      result.status = "completed";
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Enrichment failed";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
