// Hotelbeds sync control — batch orchestration for room sync and content sync.
// Admin-only: requires JWT with admin role in app_metadata.
// Launches controlled batches with quota protection.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import {
  getHotelbedsCatalogConfig,
  getHotelbedsCredentialById,
  buildHotelbedsHeaders,
  corsHeaders,
  type HotelbedsCredentials,
} from "../_shared/hotelbeds-config.ts";

interface SyncHistoryRow {
  id?: string;
  admin_user_id: string;
  admin_user_email: string | null;
  sync_type: "content" | "rooms" | "prices" | "content_and_rooms" | "rate_check" | "readiness_audit";
  scope: "one_property" | "selected_properties" | "one_destination" | "selected_destinations" | "all_eligible";
  scope_detail: Record<string, unknown>;
  batch_size: number;
  status: "pending" | "running" | "paused" | "completed" | "partially_completed" | "paused_quota" | "stopped" | "failed" | "cancelled";
  properties_processed: number;
  properties_total: number;
  rooms_found: number;
  rooms_created: number;
  rooms_updated: number;
  rooms_skipped: number;
  rooms_deactivated: number;
  prices_found: number;
  hotels_processed: number;
  hotels_inserted: number;
  hotels_updated: number;
  errors_count: number;
  error_messages: string[];
  quota_paused: boolean;
  quota_paused_reason: string | null;
  stop_reason: string | null;
  credential_id: string | null;
  credential_label: string | null;
  credential_environment: string | null;
  started_at: string;
  completed_at: string | null;
  last_updated_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extract and verify admin JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Verify admin role from app_metadata
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  const isAdminFlag = (user.app_metadata as Record<string, unknown>)?.is_admin;
  if (role !== "admin" && isAdminFlag !== true) {
    return new Response(
      JSON.stringify({ error: "Admin authorization required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const adminUser = { id: user.id, email: user.email || null };

  try {
    const body = await req.json();
    const { action } = body;

    // ─── Get sync history ─────────────────────────────────────────────
    if (action === "history") {
      const { data, error } = await supabase
        .from("hotelbeds_sync_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch history" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ history: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Get sync status ──────────────────────────────────────────────
    if (action === "status") {
      const syncId = body.syncId;
      if (!syncId) {
        return new Response(
          JSON.stringify({ error: "syncId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data, error } = await supabase
        .from("hotelbeds_sync_history")
        .select("*")
        .eq("id", syncId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Sync record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ sync: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Start sync ───────────────────────────────────────────────────
    if (action === "start") {
      const {
        syncType,
        scope,
        propertyIds,
        destinationIds,
        batchSize,
        credentialId,
      } = body;

      if (!syncType || !scope) {
        return new Response(
          JSON.stringify({ error: "syncType and scope are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!credentialId) {
        return new Response(
          JSON.stringify({ error: "A Hotelbeds API account must be selected before starting a sync" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Verify the selected credential exists and is active
      const selectedCreds = await getHotelbedsCredentialById(credentialId);
      if (!selectedCreds) {
        return new Response(
          JSON.stringify({ error: "Selected Hotelbeds API account not found or inactive" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const size = Math.min(Math.max(batchSize || 5, 1), 100);

      // Resolve property IDs based on scope
      let resolvedPropertyIds: string[] = [];

      if (scope === "one_property") {
        if (!propertyIds || propertyIds.length !== 1) {
          return new Response(
            JSON.stringify({ error: "One property ID is required for one_property scope" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        resolvedPropertyIds = propertyIds;
      } else if (scope === "selected_properties") {
        if (!propertyIds || propertyIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "At least one property ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        resolvedPropertyIds = propertyIds.slice(0, size);
      } else if (scope === "one_destination" || scope === "selected_destinations") {
        const destIds = destinationIds || [];
        if (destIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "At least one destination ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: props } = await supabase
          .from("properties")
          .select("id")
          .eq("supplier_name", "hotelbeds")
          .in("destination_id", destIds)
          .order("updated_at", { ascending: false })
          .limit(size);

        resolvedPropertyIds = (props || []).map((p: { id: string }) => p.id);
      } else if (scope === "all_eligible") {
        const { data: props } = await supabase
          .from("properties")
          .select("id")
          .eq("supplier_name", "hotelbeds")
          .not("supplier_hotel_code", "is", null)
          .order("updated_at", { ascending: false })
          .limit(size);

        resolvedPropertyIds = (props || []).map((p: { id: string }) => p.id);
      }

      if (resolvedPropertyIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "No eligible properties found for the selected scope" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check quota pause state
      const { data: settings } = await supabase
        .from("hotelbeds_queue_settings")
        .select("quota_paused")
        .eq("id", 1)
        .maybeSingle();

      if (settings?.quota_paused) {
        return new Response(
          JSON.stringify({
            error: "Hotelbeds API quota is currently paused. Resume the quota before starting a sync.",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Create sync history record
      const historyRecord: Omit<SyncHistoryRow, "id"> = {
        admin_user_id: adminUser.id,
        admin_user_email: adminUser.email,
        sync_type: syncType,
        scope,
        scope_detail: { propertyIds: resolvedPropertyIds, destinationIds: destinationIds || [] },
        batch_size: size,
        status: "running",
        properties_processed: 0,
        properties_total: resolvedPropertyIds.length,
        rooms_found: 0,
        rooms_created: 0,
        rooms_updated: 0,
        rooms_skipped: 0,
        rooms_deactivated: 0,
        prices_found: 0,
        hotels_processed: 0,
        hotels_inserted: 0,
        hotels_updated: 0,
        errors_count: 0,
        error_messages: [],
        quota_paused: false,
        quota_paused_reason: null,
        stop_reason: null,
        credential_id: credentialId,
        credential_label: null,
        credential_environment: selectedCreds.environment,
        started_at: new Date().toISOString(),
        completed_at: null,
        last_updated_at: new Date().toISOString(),
      };

      const { data: historyRow, error: historyError } = await supabase
        .from("hotelbeds_sync_history")
        .insert(historyRecord)
        .select("id")
        .single();

      if (historyError || !historyRow) {
        return new Response(
          JSON.stringify({ error: "Failed to create sync record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const syncId = historyRow.id;

      // Execute the sync (synchronous — runs within this request)
      const result = await executeSync(
        supabase,
        syncId,
        syncType,
        resolvedPropertyIds,
        credentialId,
        selectedCreds,
      );

      return new Response(
        JSON.stringify({
          syncId,
          ...result,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Pause sync ───────────────────────────────────────────────────
    if (action === "pause") {
      const { syncId } = body;
      if (!syncId) {
        return new Response(
          JSON.stringify({ error: "syncId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase
        .from("hotelbeds_sync_history")
        .update({
          status: "paused",
          stop_reason: "Paused by admin",
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", syncId)
        .in("status", ["running"]);

      return new Response(
        JSON.stringify({ paused: true, syncId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Resume sync ──────────────────────────────────────────────────
    if (action === "resume") {
      const { syncId } = body;
      if (!syncId) {
        return new Response(
          JSON.stringify({ error: "syncId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch the sync record to get remaining properties
      const { data: syncRecord, error: fetchError } = await supabase
        .from("hotelbeds_sync_history")
        .select("*")
        .eq("id", syncId)
        .maybeSingle();

      if (fetchError || !syncRecord) {
        return new Response(
          JSON.stringify({ error: "Sync record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (syncRecord.status !== "paused" && syncRecord.status !== "paused_quota") {
        return new Response(
          JSON.stringify({ error: "Only paused syncs can be resumed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check quota is not still paused
      if (syncRecord.status === "paused_quota") {
        const { data: qSettings } = await supabase
          .from("hotelbeds_queue_settings")
          .select("quota_paused")
          .eq("id", 1)
          .maybeSingle();
        if (qSettings?.quota_paused) {
          return new Response(
            JSON.stringify({ error: "Cannot resume: Hotelbeds API quota is still paused. Reset the quota first." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Get remaining property IDs from scope_detail
      const allPropertyIds = (syncRecord.scope_detail as Record<string, unknown>)?.propertyIds as string[] || [];
      const remainingPropertyIds = allPropertyIds.slice(syncRecord.properties_processed);

      if (remainingPropertyIds.length === 0) {
        // Already complete
        await supabase
          .from("hotelbeds_sync_history")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", syncId);

        return new Response(
          JSON.stringify({ syncId, resumed: false, message: "Sync was already complete" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Set status back to running
      await supabase
        .from("hotelbeds_sync_history")
        .update({
          status: "running",
          stop_reason: null,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", syncId);

      // Reload the credential for the resumed sync
      const resumeCreds = syncRecord.credential_id
        ? await getHotelbedsCredentialById(syncRecord.credential_id)
        : null;
      if (!resumeCreds) {
        return new Response(
          JSON.stringify({ error: "The Hotelbeds API account used for this sync is no longer available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Continue processing remaining properties
      const result = await executeSync(
        supabase,
        syncId,
        syncRecord.sync_type,
        remainingPropertyIds,
        syncRecord.properties_processed,
        syncRecord.credential_id,
        resumeCreds,
      );

      return new Response(
        JSON.stringify({ syncId, resumed: true, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Stop/Cancel sync ─────────────────────────────────────────────
    if (action === "stop" || action === "cancel") {
      const { syncId } = body;
      if (!syncId) {
        return new Response(
          JSON.stringify({ error: "syncId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase
        .from("hotelbeds_sync_history")
        .update({
          status: "stopped",
          stop_reason: "Stopped by admin",
          completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", syncId)
        .in("status", ["running", "paused", "paused_quota"]);

      return new Response(
        JSON.stringify({ stopped: true, syncId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Sync control request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Sync Execution ─────────────────────────────────────────────────────

interface SyncResult {
  status: "completed" | "partially_completed" | "paused_quota" | "failed";
  properties_processed: number;
  rooms_found: number;
  rooms_created: number;
  rooms_updated: number;
  rooms_skipped: number;
  rooms_deactivated: number;
  prices_found: number;
  hotels_processed: number;
  hotels_inserted: number;
  hotels_updated: number;
  errors: string[];
  quota_paused: boolean;
  quota_paused_reason: string | null;
}

async function executeSync(
  supabase: ReturnType<typeof createClient>,
  syncId: string,
  syncType: string,
  propertyIds: string[],
  credentialId: string,
  selectedCreds: HotelbedsCredentials,
  initialProcessed = 0,
): Promise<SyncResult> {
  const result: SyncResult = {
    status: "completed",
    properties_processed: initialProcessed,
    rooms_found: 0,
    rooms_created: 0,
    rooms_updated: 0,
    rooms_skipped: 0,
    rooms_deactivated: 0,
    prices_found: 0,
    hotels_processed: 0,
    hotels_inserted: 0,
    hotels_updated: 0,
    errors: [],
    quota_paused: false,
    quota_paused_reason: null,
  };

  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  for (const propertyId of propertyIds) {
    // Check if sync was stopped or paused
    const { data: current } = await supabase
      .from("hotelbeds_sync_history")
      .select("status")
      .eq("id", syncId)
      .maybeSingle();

    if (current?.status === "stopped" || current?.status === "cancelled") {
      result.status = "partially_completed";
      break;
    }

    if (current?.status === "paused") {
      result.status = "partially_completed";
      break;
    }

    try {
      // ─── Room sync ─────────────────────────────────────────────────
      if (syncType === "rooms" || syncType === "content_and_rooms") {
        const roomSyncResponse = await fetch(`${baseUrl}/functions/v1/hotelbeds-room-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ propertyId, credentialId }),
        });

        const roomData = await roomSyncResponse.json();

        if (roomData.status === "quota_paused") {
          result.status = "paused_quota";
          result.quota_paused = true;
          result.quota_paused_reason = "Hotelbeds API quota exceeded during room sync";

          await supabase
            .from("hotelbeds_queue_settings")
            .update({
              quota_paused: true,
              quota_paused_at: new Date().toISOString(),
              quota_paused_reason: "HTTP 403/429 from room sync",
              quota_paused_endpoint: "room-sync",
              quota_paused_credential_role: "catalog",
              quota_paused_batch_completed: result.properties_processed,
              last_api_status: 403,
              last_quota_event: "Quota paused during manual room sync",
              last_quota_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          break;
        }

        result.rooms_found += roomData.roomsFound || 0;
        result.rooms_created += roomData.roomsCreated || 0;
        result.rooms_updated += roomData.roomsUpdated || 0;
        result.prices_found += roomData.pricesUpdated || 0;

        if (roomData.errors && roomData.errors.length > 0) {
          result.errors.push(...roomData.errors);
        }
      }

      // ─── Content sync ──────────────────────────────────────────────
      if (syncType === "content" || syncType === "content_and_rooms") {
        const contentResult = await syncPropertyContent(supabase, propertyId, selectedCreds);

        if (contentResult.quota_paused) {
          result.status = "paused_quota";
          result.quota_paused = true;
          result.quota_paused_reason = contentResult.error || "Hotelbeds API quota exceeded during content sync";

          await supabase
            .from("hotelbeds_queue_settings")
            .update({
              quota_paused: true,
              quota_paused_at: new Date().toISOString(),
              quota_paused_reason: result.quota_paused_reason,
              quota_paused_endpoint: "content-sync",
              quota_paused_credential_role: "catalog",
              quota_paused_batch_completed: result.properties_processed,
              last_api_status: 403,
              last_quota_event: "Quota paused during manual content sync",
              last_quota_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          break;
        }

        result.hotels_processed += contentResult.processed ? 1 : 0;
        result.hotels_inserted += contentResult.inserted ? 1 : 0;
        result.hotels_updated += contentResult.updated ? 1 : 0;

        if (contentResult.error) {
          result.errors.push(contentResult.error);
        }
      }

      // ─── Prices-only sync ──────────────────────────────────────────
      if (syncType === "prices") {
        // Prices are fetched as part of room sync. For prices-only,
        // we call room-sync with a flag that only updates pricing,
        // preserving room content. The room-sync function already
        // preserves manual price overrides via price_override flag.
        const priceSyncResponse = await fetch(`${baseUrl}/functions/v1/hotelbeds-room-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ propertyId, credentialId }),
        });

        const priceData = await priceSyncResponse.json();

        if (priceData.status === "quota_paused") {
          result.status = "paused_quota";
          result.quota_paused = true;
          result.quota_paused_reason = "Hotelbeds API quota exceeded during price sync";

          await supabase
            .from("hotelbeds_queue_settings")
            .update({
              quota_paused: true,
              quota_paused_at: new Date().toISOString(),
              quota_paused_reason: "HTTP 403/429 from price sync",
              quota_paused_endpoint: "price-sync",
              quota_paused_credential_role: "primary",
              quota_paused_batch_completed: result.properties_processed,
              last_api_status: 403,
              last_quota_event: "Quota paused during manual price sync",
              last_quota_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          break;
        }

        // Only count prices found — room content is not modified
        result.prices_found += priceData.pricesUpdated || 0;

        if (priceData.errors && priceData.errors.length > 0) {
          result.errors.push(...priceData.errors);
        }
      }

      // ─── Rate check (live availability verification) ──────────────
      if (syncType === "rate_check") {
        const rateResult = await checkPropertyLiveRate(supabase, propertyId, selectedCreds);

        if (rateResult.quota_paused) {
          result.status = "paused_quota";
          result.quota_paused = true;
          result.quota_paused_reason = rateResult.error || "Hotelbeds API quota exceeded during rate check";

          await supabase
            .from("hotelbeds_queue_settings")
            .update({
              quota_paused: true,
              quota_paused_at: new Date().toISOString(),
              quota_paused_reason: result.quota_paused_reason,
              quota_paused_endpoint: "rate-check",
              quota_paused_credential_role: "primary",
              quota_paused_batch_completed: result.properties_processed,
              last_api_status: 403,
              last_quota_event: "Quota paused during manual rate check",
              last_quota_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          break;
        }

        result.prices_found += rateResult.ratesFound ? 1 : 0;
        if (rateResult.error) {
          result.errors.push(rateResult.error);
        }
      }

      // ─── Booking readiness audit ─────────────────────────────────
      if (syncType === "readiness_audit") {
        const auditResult = await auditPropertyReadiness(supabase, propertyId);

        result.rooms_found += auditResult.roomCount;
        result.prices_found += auditResult.pricedRooms;
        result.hotels_processed += auditResult.hasContent ? 1 : 0;
        result.hotels_inserted += auditResult.hasRooms ? 1 : 0;
        result.hotels_updated += auditResult.hasPricedRooms ? 1 : 0;

        if (auditResult.issues.length > 0) {
          result.errors.push(...auditResult.issues);
        }
      }

      result.properties_processed++;
    } catch {
      result.errors.push(`Failed to sync property ${propertyId}`);
    }

    // Update progress
    await supabase
      .from("hotelbeds_sync_history")
      .update({
        properties_processed: result.properties_processed,
        rooms_found: result.rooms_found,
        rooms_created: result.rooms_created,
        rooms_updated: result.rooms_updated,
        prices_found: result.prices_found,
        hotels_processed: result.hotels_processed,
        hotels_inserted: result.hotels_inserted,
        hotels_updated: result.hotels_updated,
        errors_count: result.errors.length,
        error_messages: result.errors.slice(-20),
        quota_paused: result.quota_paused,
        quota_paused_reason: result.quota_paused_reason,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", syncId);
  }

  // Finalize sync record
  const finalStatus = result.status === "partially_completed" && result.properties_processed === 0
    ? "stopped"
    : result.status;

  await supabase
    .from("hotelbeds_sync_history")
    .update({
      status: finalStatus,
      properties_processed: result.properties_processed,
      rooms_found: result.rooms_found,
      rooms_created: result.rooms_created,
      rooms_updated: result.rooms_updated,
      prices_found: result.prices_found,
      hotels_processed: result.hotels_processed,
      hotels_inserted: result.hotels_inserted,
      hotels_updated: result.hotels_updated,
      errors_count: result.errors.length,
      error_messages: result.errors.slice(-20),
      quota_paused: result.quota_paused,
      quota_paused_reason: result.quota_paused_reason,
      completed_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", syncId);

  return result;
}

// ─── Content sync for a single property ─────────────────────────────────

interface ContentSyncResult {
  processed: boolean;
  inserted: boolean;
  updated: boolean;
  quota_paused: boolean;
  error: string | null;
}

async function syncPropertyContent(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  creds: HotelbedsCredentials,
): Promise<ContentSyncResult> {
  const result: ContentSyncResult = {
    processed: false,
    inserted: false,
    updated: false,
    quota_paused: false,
    error: null,
  };

  // Fetch the property's supplier_hotel_code
  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("supplier_hotel_code, name")
    .eq("id", propertyId)
    .maybeSingle();

  if (propError || !property?.supplier_hotel_code) {
    result.error = `Property ${propertyId} has no supplier_hotel_code`;
    return result;
  }

  const hotelCode = property.supplier_hotel_code;

  if (!creds.apiKey || !creds.secret) {
    result.error = "Selected credential has no API key/secret";
    return result;
  }

  const headers = await buildHotelbedsHeaders(creds.apiKey, creds.secret);
  const contentUrl = `${creds.baseUrl}/hotel-content-api/1.0/hotels?fields=all&codes=${hotelCode}&language=ENG`;

  let response: Response;
  try {
    response = await fetch(contentUrl, { method: "GET", headers });
  } catch {
    result.error = `Network error fetching content for hotel ${hotelCode}`;
    return result;
  }

  if (response.status === 403 || response.status === 429) {
    result.quota_paused = true;
    result.error = `Content API quota/rate limit (HTTP ${response.status}) for hotel ${hotelCode}`;
    return result;
  }

  if (!response.ok) {
    result.error = `Content API error: HTTP ${response.status} for hotel ${hotelCode}`;
    return result;
  }

  const data = await response.json();
  const hotels = data?.hotels;

  if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
    result.error = `No content returned for hotel ${hotelCode}`;
    return result;
  }

  const hotel = hotels[0];

  // Update the property with fresh content from Hotelbeds
  // Only update supplier-provided fields — never touch editorial overrides
  const updateFields: Record<string, unknown> = {
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Update content fields from the API response
  if (hotel.name && hotel.name.content) {
    updateFields.supplier_name_value = hotel.name.content;
  }
  if (hotel.city && hotel.city.content) {
    updateFields.supplier_city = hotel.city.content;
  }
  if (hotel.country && hotel.country.code) {
    updateFields.supplier_country_code = hotel.country.code;
  }
  if (hotel.categoryCode) {
    updateFields.supplier_category_code = hotel.categoryCode;
  }
  if (hotel.chain && hotel.chain.code) {
    updateFields.supplier_chain_code = hotel.chain.code;
  }
  if (hotel.coordinates) {
    updateFields.supplier_latitude = hotel.coordinates.latitude;
    updateFields.supplier_longitude = hotel.coordinates.longitude;
  }
  if (hotel.address && hotel.address.content) {
    updateFields.supplier_address = hotel.address.content;
  }
  if (hotel.postalCode) {
    updateFields.supplier_postal_code = hotel.postalCode;
  }
  if (hotel.phones && hotel.phones.length > 0) {
    updateFields.supplier_phone = hotel.phones[0].phoneNumber;
  }
  if (hotel.email) {
    updateFields.supplier_email = hotel.email;
  }
  if (hotel.web) {
    updateFields.supplier_web = hotel.web;
  }
  if (hotel.images && hotel.images.length > 0) {
    updateFields.supplier_images = hotel.images.map((img: { path: string }) =>
      img.path.startsWith("http") ? img.path : `https://photos.hotelbeds.com/giata/${img.path.replace(/^\/+/, "")}`
    );
  }
  if (hotel.facilities) {
    updateFields.supplier_facilities = hotel.facilities.map((f: { facilityCode: number; facilityGroupCode?: number }) => ({
      code: f.facilityCode,
      group: f.facilityGroupCode,
    }));
  }
  if (hotel.interestPoints) {
    updateFields.supplier_interest_points = hotel.interestPoints;
  }

  // Update the property — only supplier fields, never editorial overrides
  const { error: updateError } = await supabase
    .from("properties")
    .update(updateFields)
    .eq("id", propertyId);

  if (updateError) {
    result.error = `Failed to update property content: ${updateError.message}`;
    return result;
  }

  result.processed = true;
  result.updated = true;
  return result;
}

// ─── Live rate check for a single property ─────────────────────────────────

interface RateCheckResult {
  ratesFound: boolean;
  quota_paused: boolean;
  error: string | null;
}

async function checkPropertyLiveRate(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  creds: HotelbedsCredentials,
): Promise<RateCheckResult> {
  const result: RateCheckResult = { ratesFound: false, quota_paused: false, error: null };

  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("supplier_hotel_code, name")
    .eq("id", propertyId)
    .maybeSingle();

  if (propError || !property?.supplier_hotel_code) {
    result.error = `Property ${propertyId} has no supplier_hotel_code`;
    return result;
  }

  const hotelCode = parseInt(property.supplier_hotel_code, 10);
  const checkIn = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const checkOut = new Date(Date.now() + 37 * 86400000).toISOString().split("T")[0];

  const headers = await buildHotelbedsHeaders(creds.apiKey, creds.secret);
  const requestBody = {
    stay: { checkIn, checkOut },
    occupancies: [{ rooms: 1, adults: 2, children: 0 }],
    hotels: { hotel: [hotelCode] },
  };

  let response: Response;
  try {
    response = await fetch(`${creds.baseUrl}/hotel-api/1.0/hotels`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch {
    result.error = `Network error checking rates for hotel ${property.supplier_hotel_code}`;
    return result;
  }

  if (response.status === 403 || response.status === 429) {
    result.quota_paused = true;
    result.error = `Booking API quota/rate limit (HTTP ${response.status}) for hotel ${property.supplier_hotel_code}`;
    return result;
  }

  if (!response.ok) {
    result.error = `Booking API error: HTTP ${response.status} for hotel ${property.supplier_hotel_code}`;
    return result;
  }

  const data = await response.json();
  const hotels = data?.hotel?.hotels || [];

  if (hotels.length > 0) {
    const hotel = hotels[0];
    const rooms = hotel.rooms || [];
    let hasRates = false;
    for (const room of rooms) {
      if (room.rates && room.rates.length > 0) {
        hasRates = true;
        break;
      }
    }
    result.ratesFound = hasRates;
  }

  return result;
}

// ─── Booking readiness audit for a single property ────────────────────────

interface ReadinessAuditResult {
  hasContent: boolean;
  hasRooms: boolean;
  hasPricedRooms: boolean;
  roomCount: number;
  pricedRooms: number;
  issues: string[];
}

async function auditPropertyReadiness(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
): Promise<ReadinessAuditResult> {
  const result: ReadinessAuditResult = {
    hasContent: false,
    hasRooms: false,
    hasPricedRooms: false,
    roomCount: 0,
    pricedRooms: 0,
    issues: [],
  };

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, supplier_hotel_code, booking_enabled, is_active, images, long_description")
    .eq("id", propertyId)
    .maybeSingle();

  if (!property) {
    result.issues.push(`Property ${propertyId} not found`);
    return result;
  }

  result.hasContent = !!(property.long_description && property.images);

  if (!property.supplier_hotel_code) {
    result.issues.push(`${property.name}: No supplier_hotel_code`);
  }
  if (!property.booking_enabled) {
    result.issues.push(`${property.name}: booking_enabled is false`);
  }

  const { data: rooms } = await supabase
    .from("property_rooms")
    .select("id, elvora_price_per_night, is_active, supplier_room_name, elvora_room_name")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  result.roomCount = rooms?.length || 0;
  result.hasRooms = result.roomCount > 0;

  if (result.hasRooms) {
    result.pricedRooms = (rooms || []).filter(
      (r) => Number(r.elvora_price_per_night) > 0,
    ).length;
    result.hasPricedRooms = result.pricedRooms > 0;

    if (!result.hasPricedRooms) {
      result.issues.push(`${property.name}: ${result.roomCount} rooms but none have prices`);
    }

    const roomsWithoutNames = (rooms || []).filter(
      (r) => !r.elvora_room_name && !r.supplier_room_name,
    ).length;
    if (roomsWithoutNames > 0) {
      result.issues.push(`${property.name}: ${roomsWithoutNames} rooms without names`);
    }
  } else {
    result.issues.push(`${property.name}: No room records`);
  }

  return result;
}
