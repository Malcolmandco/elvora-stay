// Hotelbeds Queue Worker — processes destinations from the queue
// Called by the queue manager to process up to N destinations concurrently
// Each invocation processes one batch for one destination, then returns
// Version: 2026-10-15-quota-guards-v2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsCatalogConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildHotelbedsImageUrl(path: string): string {
  if (!path) return "";
  const prefix = "https://photos.hotelbeds.com/giata/";
  if (path.startsWith("http")) return path;
  return prefix + path.replace(/^\/+/, "");
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
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const workerId = body.workerId as string || "worker-1";
    const batchSize = body.batchSize as number || 25;
    const maxHotels = body.maxHotels as number || 500;

    // Check if queue is running AND quota is not paused
    const { data: settings } = await supabase
      .from("hotelbeds_queue_settings")
      .select("queue_running, quota_paused, concurrent_destinations, rate_limit_protection, hotels_per_destination, api_page_size")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.queue_running) {
      return new Response(
        JSON.stringify({ workerId, action: "idle", reason: "Queue not running" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fail closed: if quota is paused, do not process
    if (settings?.quota_paused) {
      return new Response(
        JSON.stringify({ workerId, action: "idle", reason: "Quota is paused — worker stopped", quota_paused: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check how many workers are currently running
    const { count: runningCount } = await supabase
      .from("hotelbeds_destination_queue")
      .select("id", { count: "exact", head: true })
      .eq("sync_status", "running");

    const maxConcurrent = settings.concurrent_destinations || 3;
    if ((runningCount || 0) >= maxConcurrent) {
      return new Response(
        JSON.stringify({ workerId, action: "idle", reason: `Max concurrent (${maxConcurrent}) reached`, runningCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pick the next destination to process
    // Priority: 'ready' first, then 'partial' (resumable), ordered by priority
    const { data: nextDest, error: pickError } = await supabase
      .from("hotelbeds_destination_queue")
      .select("*")
      .in("sync_status", ["ready", "partial"])
      .eq("verification_status", "verified")
      .order("priority")
      .limit(1)
      .maybeSingle();

    if (pickError || !nextDest) {
      return new Response(
        JSON.stringify({ workerId, action: "idle", reason: "No destinations ready to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atomically claim this destination (set to 'running')
    const { data: claimed, error: claimError } = await supabase
      .from("hotelbeds_destination_queue")
      .update({ sync_status: "running", last_started_at: new Date().toISOString(), account_role: "catalog" })
      .eq("id", nextDest.id)
      .eq("sync_status", "ready")
      .select("*")
      .maybeSingle();

    // If claim failed (another worker got it), try partial
    let queueRow = claimed;
    if (!queueRow) {
      const { data: claimedPartial } = await supabase
        .from("hotelbeds_destination_queue")
        .update({ sync_status: "running", last_started_at: new Date().toISOString(), account_role: "catalog" })
        .eq("id", nextDest.id)
        .eq("sync_status", "partial")
        .select("*")
        .maybeSingle();
      queueRow = claimedPartial;
    }

    if (!queueRow) {
      return new Response(
        JSON.stringify({ workerId, action: "idle", reason: "Could not claim a destination" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process this destination
    const result = await processDestination(queueRow, batchSize, maxHotels, settings.rate_limit_protection ?? true);

    // Self-invoke to process next destination if queue is still running, not rate-limited, and quota not paused
    if (!result.rateLimited && !result.failed) {
      const { data: currentSettings } = await supabase
        .from("hotelbeds_queue_settings")
        .select("queue_running, quota_paused")
        .eq("id", 1)
        .maybeSingle();
      if (currentSettings?.queue_running && !currentSettings?.quota_paused) {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const workerUrl = `${supabaseUrl}/functions/v1/hotelbeds-queue-worker`;
        try {
          await fetch(workerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ workerId, batchSize, maxHotels }),
          });
        } catch {
          // Self-invocation failed — queue still running, can be manually retried
        }
      }
    }

    return new Response(
      JSON.stringify({ workerId, action: "processed", destination: queueRow.destination_name, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Worker failed";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function processDestination(
  queueRow: any,
  batchSize: number,
  maxHotels: number,
  rateLimitProtection: boolean,
) {
  const { apiKey, secret, baseUrl } = getHotelbedsCatalogConfig();

  if (!apiKey || !secret) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ sync_status: "failed", last_error: "Catalog credentials not configured" })
      .eq("id", queueRow.id);
    return { error: "Catalog credentials not configured" };
  }

  const destCode = (queueRow.verified_hotelbeds_code || queueRow.hotelbeds_code).toUpperCase();
  const targetCount = Math.min(queueRow.target_count || maxHotels, maxHotels);

  // Resolve Elvora destination
  const { data: dest } = await supabase
    .from("destinations")
    .select("id, slug, name")
    .eq("id", queueRow.destination_id)
    .maybeSingle();

  if (!dest) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ sync_status: "failed", last_error: "Elvora destination not found" })
      .eq("id", queueRow.id);
    return { error: "Elvora destination not found" };
  }

  const headers = await buildHotelbedsHeaders(apiKey, secret);

  // Start from current_position (resume)
  let from = queueRow.current_position || 1;
  let processed = queueRow.processed_count || 0;
  let inserted = queueRow.inserted_count || 0;
  let updated = queueRow.updated_count || 0;
  let duplicates = queueRow.duplicate_count || 0;
  let failed = 0;
  let totalAvailable = queueRow.total_available || 0;
  let consecutiveErrors = 0;
  let rateLimited = false;
  let lastError: string | null = null;

  // Track hotel codes already processed in this sync run to detect
  // duplicate supplier records returned across different API batches
  const seenInRun = new Set<string>();

  // Process in batches until target reached or no more hotels
  while (processed < targetCount) {
    // Check if queue still running and quota not paused (allows external pause)
    const { data: currentSettings } = await supabase
      .from("hotelbeds_queue_settings")
      .select("queue_running, quota_paused")
      .eq("id", 1)
      .maybeSingle();
    if (!currentSettings?.queue_running || currentSettings?.quota_paused) {
      // Queue was paused — save state and stop
      await supabase
        .from("hotelbeds_destination_queue")
        .update({
          sync_status: processed > 0 && processed < totalAvailable ? "partial" : "paused",
          current_position: from,
          processed_count: processed,
          inserted_count: inserted,
          updated_count: updated,
          duplicate_count: duplicates,
          failed_count: failed,
          total_available: totalAvailable,
          next_resume_position: from,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", queueRow.id);
      return { paused: true, processed, inserted, updated, duplicates, failed, from };
    }

    const size = Math.min(batchSize, targetCount - processed);
    const url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&destinationCode=${destCode}&language=ENG&from=${from}&to=${from + size - 1}`;

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers });
    } catch {
      consecutiveErrors++;
      lastError = `Network error at from=${from}`;
      if (consecutiveErrors >= 3) {
        await supabase
          .from("hotelbeds_destination_queue")
          .update({
            sync_status: "failed",
            last_error: "3 consecutive network errors",
            current_position: from,
            processed_count: processed,
            inserted_count: inserted,
            updated_count: updated,
            duplicate_count: duplicates,
            failed_count: failed,
            total_available: totalAvailable,
          })
          .eq("id", queueRow.id);
        return { failed: true, error: lastError, processed, inserted, from };
      }
      await sleep(Math.pow(2, consecutiveErrors) * 1000);
      continue;
    }

    // Rate-limit detection
    if (rateLimitProtection && (response.status === 403 || response.status === 429)) {
      const rawBody = await response.text().catch(() => "");
      rateLimited = true;
      lastError = `Rate limited at from=${from} (HTTP ${response.status}): ${rawBody.substring(0, 200)}`;

      // Update settings with quota event
      await supabase
        .from("hotelbeds_queue_settings")
        .update({
          last_api_status: response.status,
          last_quota_event: `Rate limited processing ${queueRow.destination_name} at position ${from}`,
          last_quota_event_at: new Date().toISOString(),
        })
        .eq("id", 1);

      // Pause this destination
      await supabase
        .from("hotelbeds_destination_queue")
        .update({
          sync_status: "quota_paused",
          last_error: lastError,
          current_position: from,
          processed_count: processed,
          inserted_count: inserted,
          updated_count: updated,
          duplicate_count: duplicates,
          failed_count: failed,
          total_available: totalAvailable,
          next_resume_position: from,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", queueRow.id);

      // Also pause the entire queue and set the global quota flag
      await supabase
        .from("hotelbeds_queue_settings")
        .update({
          queue_running: false,
          quota_paused: true,
          quota_paused_at: new Date().toISOString(),
          quota_paused_reason: `HTTP ${response.status} from hotels (worker)`,
          quota_paused_endpoint: "hotels (worker)",
          quota_paused_credential_role: "catalog",
        })
        .eq("id", 1);

      return { rateLimited: true, processed, inserted, updated, duplicates, failed, from, error: lastError };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errMsg = `HTTP ${response.status} at from=${from}`;
      try {
        const j = JSON.parse(errText);
        errMsg = j?.error?.message || j?.message || errMsg;
      } catch { /* keep default */ }
      lastError = errMsg;
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        await supabase
          .from("hotelbeds_destination_queue")
          .update({
            sync_status: "failed",
            last_error: errMsg,
            current_position: from,
            processed_count: processed,
            inserted_count: inserted,
            updated_count: updated,
            duplicate_count: duplicates,
            failed_count: failed,
            total_available: totalAvailable,
          })
          .eq("id", queueRow.id);
        return { failed: true, error: errMsg, processed, inserted, from };
      }
      await sleep(Math.pow(2, consecutiveErrors) * 1000);
      continue;
    }

    consecutiveErrors = 0;

    const contentData = await response.json();
    const hotels: HotelbedsHotel[] = Array.isArray(contentData?.hotels) ? contentData.hotels : [];
    totalAvailable = contentData?.total || totalAvailable;

    if (hotels.length === 0) {
      break; // No more hotels
    }

    // Batch-check existing supplier hotels — include editorial_override to protect customized fields
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
        editorialOverrideMap.set(row.supplier_hotel_code, !!row.editorial_override);
      }
    }

    const rowsToInsert: Record<string, unknown>[] = [];
    const rowsToUpdate: Record<string, unknown>[] = [];

    for (const hotel of hotels) {
      if (processed >= targetCount) break;

      const hotelCode = String(hotel.code);

      // Skip duplicate supplier records already processed in this sync run
      if (seenInRun.has(hotelCode)) {
        duplicates++;
        processed++;
        continue;
      }
      seenInRun.add(hotelCode);

      const hotelName = hotel.name?.content || `Hotel ${hotelCode}`;
      const existingId = existingMap.get(hotelCode);
      const hasEditorialOverride = editorialOverrideMap.get(hotelCode);
      const isUpdate = !!existingId;

      const images = (hotel.images || []).slice(0, 10).map((img, idx) => ({
        id: `hb-${hotelCode}-img-${idx}`,
        url: buildHotelbedsImageUrl(img.path),
        alt: `${hotelName} - ${img.typeDescription || "hotel photo"}`,
      })).filter((img) => img.url);

      const amenities = (hotel.facilities || []).slice(0, 30).map((f) => f?.description?.content || "").filter((s) => s);
      const description = hotel.description?.content || "";
      const shortDesc = description ? description.substring(0, 200) + (description.length > 200 ? "..." : "") : hotelName;
      const slug = slugify(hotelName) + `-${hotelCode}`;
      const categoryCode = hotel.category?.code || "";
      const starRating = parseInt(categoryCode.match(/\d/)?.[0] || "") || null;
      const countryName = hotel.country?.description || hotel.country?.code || "";
      const destName = dest.name || hotel.destinationName?.content || hotel.city?.content || null;

      if (isUpdate) {
        // Only update supplier-synced fields, never overwrite editorial content
        const updateRow: Record<string, unknown> = {
          id: existingId,
          supplier_status: "connected",
          supplier_hotel_code: hotelCode,
          updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        };

        // Only update content fields if there's NO editorial override
        if (!hasEditorialOverride) {
          updateRow.name = hotelName;
          updateRow.slug = slug;
          updateRow.description = shortDesc;
          updateRow.long_description = description || shortDesc;
          updateRow.amenities = amenities;
          updateRow.images = images.length > 0 ? images : [{ id: `hb-${hotelCode}-placeholder`, url: "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", alt: hotelName }];
          updateRow.address = hotel.address?.content || "";
          updateRow.latitude = hotel.coordinates?.latitude || null;
          updateRow.longitude = hotel.coordinates?.longitude || null;
          updateRow.rating = starRating;
        }

        // Always update these sync-related fields regardless of editorial override
        updateRow.country = countryName;
        updateRow.city = hotel.city?.content || destName || "";
        updateRow.is_active = true;
        updateRow.last_verified_at = new Date().toISOString();

        rowsToUpdate.push(updateRow);
        updated++;
      } else {
        rowsToInsert.push({
          id: `hb-${hotelCode}`,
          name: hotelName,
          slug,
          description: shortDesc,
          long_description: description || shortDesc,
          property_type: "Hotel",
          property_status: "catalog",
          supplier_status: "connected",
          verification_status: "needs_review",
          booking_enabled: true,
          price_display_mode: "check_availability",
          supplier_name: "hotelbeds",
          supplier_hotel_code: hotelCode,
          destination_id: dest.id,
          destination_slug: dest.slug,
          destination_name: destName,
          country: countryName,
          city: hotel.city?.content || destName || "",
          address: hotel.address?.content || "",
          latitude: hotel.coordinates?.latitude || null,
          longitude: hotel.coordinates?.longitude || null,
          rating: starRating,
          review_count: null,
          amenities,
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
        inserted++;
      }
      processed++;
    }

    // Insert new properties
    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("properties")
        .upsert(rowsToInsert, { onConflict: "id" });

      if (insertError) {
        failed += rowsToInsert.length;
        lastError = `Batch insert failed: ${insertError.message}`;
      }
    }

    // Update existing properties (preserving editorial overrides)
    for (const row of rowsToUpdate) {
      const { error: updateError } = await supabase
        .from("properties")
        .update(row)
        .eq("id", row.id as string);

      if (updateError) {
        failed++;
        lastError = `Update failed for ${row.id}: ${updateError.message}`;
      }
    }

    // Update queue progress
    await supabase
      .from("hotelbeds_destination_queue")
      .update({
        current_position: from,
        processed_count: processed,
        inserted_count: inserted,
        updated_count: updated,
        duplicate_count: duplicates,
        failed_count: failed,
        total_available: totalAvailable,
      })
      .eq("id", queueRow.id);

    from += size;
    if (hotels.length < size || from > totalAvailable) {
      break; // No more hotels
    }

    // Small delay between batches
    await sleep(500);
  }

  // Determine final status
  const isComplete = processed >= totalAvailable || processed >= targetCount;
  const finalStatus = rateLimited ? "quota_paused" : isComplete ? "completed" : "partial";

  // Update queue record
  await supabase
    .from("hotelbeds_destination_queue")
    .update({
      sync_status: finalStatus,
      current_position: from,
      processed_count: processed,
      inserted_count: inserted,
      updated_count: updated,
      duplicate_count: duplicates,
      failed_count: failed,
      total_available: totalAvailable,
      next_resume_position: isComplete ? null : from,
      last_completed_at: isComplete ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString(),
      last_error: lastError,
    })
    .eq("id", queueRow.id);

  // Update destination stay_count
  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("destination_id", dest.id)
    .eq("supplier_name", "hotelbeds")
    .eq("is_active", true);

  await supabase
    .from("destinations")
    .update({ stay_count: count || 0, updated_at: new Date().toISOString() })
    .eq("id", dest.id);

  // Log to sync log
  await supabase
    .from("hotelbeds_sync_log")
    .insert({
      destination_id: dest.id,
      destination_name: dest.name,
      hotelbeds_code: destCode,
      sync_status: finalStatus,
      pages_processed: Math.ceil((from - (queueRow.current_position || 1)) / batchSize),
      hotels_processed: processed - (queueRow.processed_count || 0),
      hotels_inserted: inserted - (queueRow.inserted_count || 0),
      hotels_updated: updated - (queueRow.updated_count || 0),
      duplicates_skipped: duplicates - (queueRow.duplicate_count || 0),
      unmapped_count: 0,
      total_hotels: totalAvailable,
      last_page_from: from,
      last_error: lastError,
      started_at: queueRow.last_started_at,
      completed_at: isComplete ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString(),
    });

  return {
    syncStatus: finalStatus,
    processed,
    inserted,
    updated,
    duplicates,
    failed,
    totalAvailable,
    from,
    rateLimited,
  };
}
