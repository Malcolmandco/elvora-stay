// Hotelbeds Queue Manager — controls the catalog sync queue
// Handles: seed, status, start, pause, resume, stop, verify, settings,
//          discover (single), discover_batch (max 5), reset_failed, reset_quota
// Version: 2026-10-15-quota-guards-v2
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsCatalogConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hotelbeds destination code → Elvora destination name lookup
// ROE is the verified code for Rome (ROM = La Romana, DR)
const HB_DEST_MAP: Record<string, string> = {
  PAR: "Paris", LON: "London", NYC: "New York", MIA: "Miami", DXB: "Dubai",
  DPS: "Bali", MLE: "Maldives", JTR: "Santorini", UKY: "Kyoto", TYO: "Tokyo",
  HKT: "Phuket", BCN: "Barcelona", ROE: "Rome", LIS: "Lisbon", BKK: "Bangkok",
  SIN: "Singapore", HKG: "Hong Kong", SYD: "Sydney", IST: "Istanbul",
  AMS: "Amsterdam", VIE: "Vienna", PRG: "Prague", BER: "Berlin", MAD: "Madrid",
  FLR: "Florence", VCE: "Venice", CUN: "Cancun", SJD: "Los Cabos",
  LAX: "Los Angeles", SFO: "San Francisco", LAS: "Las Vegas",
  FAO: "Algarve", NAP: "Amalfi Coast", CPT: "Cape Town", RAK: "Marrakech",
  AUH: "Abu Dhabi", NCE: "French Riviera", MCM: "Monaco", ZRH: "Zermatt",
  GVA: "Swiss Alps", INN: "Austrian Alps", NBO: "Kenya", SEZ: "Seychelles",
  MRU: "Mauritius", BOB: "Bora Bora", ZQN: "Queenstown", AKL: "Auckland",
  MEL: "Melbourne", SJO: "Costa Rica", BUE: "Buenos Aires", RIO: "Rio de Janeiro",
  ATH: "Athens", JMK: "Mykonos", RHO: "Greek Islands", IBZ: "Ibiza",
  PMI: "Mallorca", DBV: "Dubrovnik", SPU: "Split", TIV: "Montenegro",
  ZNZ: "Zanzibar", KGL: "Rwanda", MCT: "Oman", DOH: "Qatar", NAN: "Fiji",
  HNL: "Honolulu", OGG: "Maui", KOA: "Big Island", LIH: "Kauai",
  EYW: "Key West", NAS: "Bahamas", BGI: "Barbados", MBJ: "Jamaica",
  UVF: "St. Lucia", AUA: "Aruba", PUJ: "Dominican Republic", PLS: "Turks and Caicos",
  SAN: "San Diego", PSP: "Palm Springs", PHX: "Scottsdale", JAC: "Jackson Hole",
  DEN: "Aspen", SLC: "Park City", RNO: "Lake Tahoe", MCO: "Orlando",
  MSY: "New Orleans", AUS: "Austin", DFW: "Dallas", HOU: "Houston",
  PVR: "Puerto Vallarta", MEX: "Mexico City", CTG: "Cartagena", PTY: "Panama",
  SAO: "Sao Paulo", CUR: "Curacao", SJU: "Puerto Rico", USM: "Koh Samui",
  CTS: "Niseko", MIL: "Milan", FNC: "Madeira", TLN: "Saint-Tropez", TUY: "Tulum",
};

// Priority destinations (lower = higher priority)
const PRIORITY_DESTINATIONS: Record<string, number> = {
  "Tokyo": 10, "Singapore": 11, "New York": 12, "Los Angeles": 13,
  "Miami": 14, "San Francisco": 15, "Las Vegas": 16, "Sydney": 17,
  "Hong Kong": 18, "Istanbul": 19, "Amsterdam": 20, "Lisbon": 21,
  "Madrid": 22, "Milan": 23, "Vienna": 24, "Prague": 25, "Athens": 26,
  "Bali": 27, "Cape Town": 28, "Marrakech": 29, "Abu Dhabi": 30,
  "Dubai": 5, "Paris": 1, "London": 2, "Barcelona": 3, "Rome": 4,
  "Bangkok": 6,
};

// Protected verified codes — never re-discover these
const PROTECTED_CODES = ["PAR", "LON", "DXB", "BCN", "ROE", "BKK", "NRT"];

// Circuit breaker: check if quota is paused
// Fail-closed: if settings cannot be read, the row is missing, or
// quota_paused is null/undefined, treat the quota as paused so the
// queue cannot start or resume without a confirmed "not paused" state.
async function isQuotaPaused(): Promise<{ paused: boolean; reason?: string; pausedAt?: string }> {
  const { data: settings, error } = await supabase
    .from("hotelbeds_queue_settings")
    .select("quota_paused, quota_paused_reason, quota_paused_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return {
      paused: true,
      reason: "Quota status could not be verified — database error reading settings. Queue must remain paused.",
    };
  }

  if (!settings) {
    return {
      paused: true,
      reason: "Quota status could not be verified — settings row not found. Queue must remain paused.",
    };
  }

  if (settings.quota_paused === null || settings.quota_paused === undefined) {
    return {
      paused: true,
      reason: "Quota status could not be verified — quota_paused field is null or missing. Queue must remain paused.",
    };
  }

  if (settings.quota_paused) {
    return {
      paused: true,
      reason: settings.quota_paused_reason || "Quota paused",
      pausedAt: settings.quota_paused_at || undefined,
    };
  }

  return { paused: false };
}

// Circuit breaker: trigger quota pause
async function triggerQuotaPause(
  httpStatus: number,
  endpoint: string,
  credentialRole: string,
  batchCompleted: number,
): Promise<void> {
  await supabase
    .from("hotelbeds_queue_settings")
    .update({
      quota_paused: true,
      quota_paused_at: new Date().toISOString(),
      quota_paused_reason: `HTTP ${httpStatus} from ${endpoint}`,
      quota_paused_endpoint: endpoint,
      quota_paused_credential_role: credentialRole,
      quota_paused_batch_completed: batchCompleted,
      last_api_status: httpStatus,
      last_quota_event: `Quota paused: HTTP ${httpStatus} from ${endpoint} using ${credentialRole}`,
      last_quota_event_at: new Date().toISOString(),
    })
    .eq("id", 1);
}

interface QueueRow {
  id: string;
  destination_id: string | null;
  destination_name: string;
  destination_slug: string;
  hotelbeds_code: string;
  verified_hotelbeds_code: string | null;
  verification_status: string;
  sync_status: string;
  current_position: number;
  total_available: number;
  target_count: number;
  processed_count: number;
  inserted_count: number;
  updated_count: number;
  duplicate_count: number;
  failed_count: number;
  last_error: string | null;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_synced_at: string | null;
  next_resume_position: number | null;
  retry_count: number;
  discovery_retry_count: number;
  last_discovery_attempt_at: string | null;
  account_role: string;
  priority: number;
  verified_at: string | null;
  verification_evidence: Record<string, unknown> | null;
  discovery_candidates: unknown[] | null;
  discovery_notes: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "seed":
        return await seedQueue();
      case "status":
        return await getQueueStatus();
      case "start":
        return await startQueue();
      case "pause":
        return await pauseQueue();
      case "resume":
        return await resumeQueue();
      case "stop":
        return await stopQueue();
      case "verify":
        return await verifyDestination(body.destinationId as string);
      case "discover":
        return await discoverDestinationCode(body.destinationId as string);
      case "discover_batch":
        return await discoverBatch(body.destinationIds as string[] | undefined);
      case "discover_next":
        return await discoverNextBatch();
      case "reset_failed":
        return await resetFailedDestinations(body.destinationIds as string[] | undefined);
      case "reset_quota":
        return await resetQuotaPause();
      case "pause_discovery":
        return await pauseDiscovery();
      case "update_settings":
        return await updateSettings(body.settings);
      case "get_settings":
        return await getSettings();
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Queue manager failed";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ============================================================
// SEED
// ============================================================

async function seedQueue() {
  const { data: destinations, error: destError } = await supabase
    .from("destinations")
    .select("id, name, slug, country, stay_count")
    .order("name");

  if (destError) throw new Error(`Failed to fetch destinations: ${destError.message}`);

  const { data: syncLogs } = await supabase
    .from("hotelbeds_sync_log")
    .select("destination_id, hotelbeds_code, sync_status, last_page_from, total_hotels, hotels_processed, hotels_inserted, hotels_updated, duplicates_skipped, unmapped_count")
    .order("created_at", { ascending: false });

  const logMap = new Map<string, typeof syncLogs extends (infer T)[] ? T : never>();
  for (const log of syncLogs || []) {
    if (log.destination_id && !logMap.has(log.destination_id)) {
      logMap.set(log.destination_id, log);
    }
  }

  const { data: hbCounts } = await supabase.rpc("get_destinations_with_hb_counts");
  const countMap = new Map<string, number>();
  for (const row of hbCounts || []) {
    countMap.set(row.id, row.hb_count);
  }

  let inserted = 0;
  let skipped = 0;
  let updated = 0;

  for (const dest of destinations || []) {
    const hbCode = Object.entries(HB_DEST_MAP).find(
      ([, name]) => name.toLowerCase() === dest.name.toLowerCase(),
    )?.[0];

    if (!hbCode) continue;

    const { data: existing } = await supabase
      .from("hotelbeds_destination_queue")
      .select("id")
      .eq("destination_id", dest.id)
      .maybeSingle();

    if (existing) {
      const hbCount = countMap.get(dest.id) || 0;
      const log = logMap.get(dest.id);
      const isPartial = log?.sync_status === "partial" || (hbCount > 0 && hbCount < (log?.total_hotels || 0));
      const isCompleted = log?.sync_status === "completed" && hbCount >= (log?.total_hotels || 0);
      const isParis = dest.name.toLowerCase() === "paris";
      const protectParis = isParis && hbCount >= 1800;

      const syncStatus = protectParis ? "completed" : isPartial ? "partial" : isCompleted ? "completed" : "pending";
      const verificationStatus = PROTECTED_CODES.includes(hbCode) ? "verified" : "pending";

      const resumePos = log?.last_page_from
        ? (log.last_page_from + 25)
        : (hbCount > 0 ? hbCount + 1 : 1);

      await supabase
        .from("hotelbeds_destination_queue")
        .update({
          verified_hotelbeds_code: verificationStatus === "verified" ? hbCode : null,
          verification_status: verificationStatus,
          sync_status: syncStatus,
          current_position: resumePos,
          total_available: log?.total_hotels || 0,
          processed_count: log?.hotels_processed || hbCount,
          inserted_count: log?.hotels_inserted || hbCount,
          updated_count: log?.hotels_updated || 0,
          duplicate_count: log?.duplicates_skipped || 0,
          next_resume_position: isPartial ? resumePos : null,
          priority: PRIORITY_DESTINATIONS[dest.name] ?? 100,
        })
        .eq("id", existing.id);

      updated++;
      continue;
    }

    const hbCount = countMap.get(dest.id) || 0;
    const log = logMap.get(dest.id);
    const isPartial = log?.sync_status === "partial" || (hbCount > 0 && hbCount < (log?.total_hotels || 0));
    const isCompleted = log?.sync_status === "completed" && hbCount >= (log?.total_hotels || 0);
    const isParis = dest.name.toLowerCase() === "paris";
    const protectParis = isParis && hbCount >= 1800;

    const syncStatus = protectParis ? "completed" : isPartial ? "partial" : isCompleted ? "completed" : "pending";
    const verificationStatus = PROTECTED_CODES.includes(hbCode) ? "verified" : "pending";

    const resumePos = log?.last_page_from
      ? (log.last_page_from + 25)
      : (hbCount > 0 ? hbCount + 1 : 1);

    const { error: insertError } = await supabase
      .from("hotelbeds_destination_queue")
      .insert({
        destination_id: dest.id,
        destination_name: dest.name,
        destination_slug: dest.slug,
        hotelbeds_code: hbCode,
        verified_hotelbeds_code: verificationStatus === "verified" ? hbCode : null,
        verification_status: verificationStatus,
        sync_status: syncStatus,
        current_position: resumePos,
        total_available: log?.total_hotels || 0,
        processed_count: log?.hotels_processed || hbCount,
        inserted_count: log?.hotels_inserted || hbCount,
        updated_count: log?.hotels_updated || 0,
        duplicate_count: log?.duplicates_skipped || 0,
        next_resume_position: isPartial ? resumePos : null,
        priority: PRIORITY_DESTINATIONS[dest.name] ?? 100,
        account_role: "catalog",
      });

    if (insertError) {
      console.error(`Failed to insert queue record for ${dest.name}:`, insertError.message);
    } else {
      inserted++;
    }
  }

  return new Response(
    JSON.stringify({ seeded: true, inserted, updated, skipped }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// STATUS
// ============================================================

async function getQueueStatus() {
  const { data: queue, error } = await supabase
    .from("hotelbeds_destination_queue")
    .select("*")
    .order("priority");

  if (error) throw new Error(`Failed to fetch queue: ${error.message}`);

  const { data: settings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const stats = {
    total: queue?.length || 0,
    verified: queue?.filter((q: QueueRow) => q.verification_status === "verified").length || 0,
    pending_verification: queue?.filter((q: QueueRow) => q.verification_status === "pending").length || 0,
    verification_failed: queue?.filter((q: QueueRow) => q.verification_status === "verification_failed").length || 0,
    ambiguous: queue?.filter((q: QueueRow) => q.verification_status === "ambiguous").length || 0,
    discovering: queue?.filter((q: QueueRow) => q.verification_status === "discovering").length || 0,
    pending: queue?.filter((q: QueueRow) => q.sync_status === "pending").length || 0,
    ready: queue?.filter((q: QueueRow) => q.sync_status === "ready").length || 0,
    running: queue?.filter((q: QueueRow) => q.sync_status === "running").length || 0,
    partial: queue?.filter((q: QueueRow) => q.sync_status === "partial").length || 0,
    completed: queue?.filter((q: QueueRow) => q.sync_status === "completed").length || 0,
    paused: queue?.filter((q: QueueRow) => q.sync_status === "paused").length || 0,
    quota_paused: queue?.filter((q: QueueRow) => q.sync_status === "quota_paused").length || 0,
    failed: queue?.filter((q: QueueRow) => q.sync_status === "failed").length || 0,
    total_properties: queue?.reduce((sum: number, q: QueueRow) => sum + q.inserted_count, 0) || 0,
    total_target: queue?.reduce((sum: number, q: QueueRow) => sum + Math.min(q.target_count, q.total_available || q.target_count), 0) || 0,
  };

  return new Response(
    JSON.stringify({ queue: queue || [], stats, settings: settings || null }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// QUEUE CONTROL (hotel import queue — NOT discovery)
// ============================================================

async function startQueue() {
  // Block start if quota is paused — fail closed
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({
        started: false,
        quota_paused: true,
        reason: `Cannot start queue while quota is paused: ${quotaCheck.reason}`,
        paused_at: quotaCheck.pausedAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await supabase
    .from("hotelbeds_queue_settings")
    .update({ queue_running: true })
    .eq("id", 1);

  await supabase
    .from("hotelbeds_destination_queue")
    .update({ sync_status: "ready" })
    .eq("sync_status", "pending")
    .eq("verification_status", "verified");

  // Kick off worker invocations for each concurrent slot
  const { data: settings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("concurrent_destinations")
    .eq("id", 1)
    .maybeSingle();
  const concurrency = settings?.concurrent_destinations || 3;

  const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hotelbeds-queue-worker`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  for (let i = 0; i < concurrency; i++) {
    try {
      await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ workerId: `worker-${i + 1}`, batchSize: 25, maxHotels: 500 }),
      });
    } catch {
      // Worker invocation failed — queue is still running, can be retried
    }
  }

  return new Response(
    JSON.stringify({ started: true, workersLaunched: concurrency }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function pauseQueue() {
  await supabase
    .from("hotelbeds_queue_settings")
    .update({ queue_running: false })
    .eq("id", 1);

  await supabase
    .from("hotelbeds_destination_queue")
    .update({ sync_status: "paused" })
    .eq("sync_status", "running");

  return new Response(
    JSON.stringify({ paused: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function resumeQueue() {
  // Block resume if quota is paused — fail closed
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({
        resumed: false,
        quota_paused: true,
        reason: `Cannot resume queue while quota is paused: ${quotaCheck.reason}`,
        paused_at: quotaCheck.pausedAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await supabase
    .from("hotelbeds_queue_settings")
    .update({ queue_running: true })
    .eq("id", 1);

  // Restore paused destinations to ready — does NOT touch quota_paused destinations
  await supabase
    .from("hotelbeds_destination_queue")
    .update({ sync_status: "ready" })
    .eq("sync_status", "paused");

  return new Response(
    JSON.stringify({ resumed: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function stopQueue() {
  await supabase
    .from("hotelbeds_queue_settings")
    .update({ queue_running: false })
    .eq("id", 1);

  const { data: running } = await supabase
    .from("hotelbeds_destination_queue")
    .select("id, sync_status, processed_count, total_available")
    .in("sync_status", ["running", "ready"]);

  for (const row of running || []) {
    const newStatus = row.processed_count > 0 && row.processed_count < row.total_available ? "partial" : "pending";
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ sync_status: newStatus })
      .eq("id", row.id);
  }

  return new Response(
    JSON.stringify({ stopped: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// VERIFICATION (original verify action — tests existing code)
// ============================================================

async function verifyDestination(destinationId: string) {
  const { data: queueRow, error } = await supabase
    .from("hotelbeds_destination_queue")
    .select("*")
    .eq("destination_id", destinationId)
    .maybeSingle();

  if (error || !queueRow) {
    return new Response(
      JSON.stringify({ error: "Destination not found in queue" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Check circuit breaker
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({ verified: false, error: `Quota paused: ${quotaCheck.reason}`, quota_paused: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await supabase
    .from("hotelbeds_destination_queue")
    .update({ verification_status: "verifying", sync_status: "verifying" })
    .eq("id", queueRow.id);

  const candidateCode = queueRow.hotelbeds_code;
  const { apiKey, secret, baseUrl } = getHotelbedsCatalogConfig();

  if (!apiKey || !secret) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: "Catalog credentials not configured" })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: "Catalog credentials not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headers = await buildHotelbedsHeaders(apiKey, secret);
  const url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&destinationCode=${candidateCode.toUpperCase()}&language=ENG&from=1&to=3`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers });
  } catch {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: "Network error during verification" })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: "Network error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Circuit breaker: 403/429 → immediate pause
  if (response.status === 403 || response.status === 429) {
    await triggerQuotaPause(response.status, "hotels (verification)", "catalog", 0);
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: `HTTP ${response.status} — quota paused` })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: `Rate limited (HTTP ${response.status})`, quota_paused: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!response.ok) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: `HTTP ${response.status}` })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: `HTTP ${response.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const data = await response.json();
  const hotels = data?.hotels || [];
  const total = data?.total || 0;

  if (hotels.length === 0) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: "No hotels returned for this code" })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: "No hotels returned" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sampleHotels = hotels.slice(0, 3).map((h: any) => ({
    name: h.name?.content || "",
    city: h.city?.content || "",
    country: h.country?.description || h.country?.code || "",
    address: h.address?.content || "",
    latitude: h.coordinates?.latitude,
    longitude: h.coordinates?.longitude,
  }));

  const destNameLower = queueRow.destination_name.toLowerCase();
  const cityMatches = sampleHotels.some((h: any) => {
    const cityLower = (h.city || "").toLowerCase();
    return cityLower.includes(destNameLower) || destNameLower.includes(cityLower);
  });

  const isProtected = PROTECTED_CODES.includes(candidateCode.toUpperCase());

  if (!cityMatches && !isProtected) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({
        verification_status: "verification_failed",
        sync_status: "failed",
        last_error: `Code ${candidateCode} returned hotels in ${sampleHotels[0]?.city || "unknown"} — does not match ${queueRow.destination_name}`,
      })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ verified: false, error: `Code mismatch: returned hotels are in ${sampleHotels[0]?.city || "unknown"}, not ${queueRow.destination_name}`, sampleHotels }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await supabase
    .from("hotelbeds_destination_queue")
    .update({
      verification_status: "verified",
      verified_hotelbeds_code: candidateCode,
      sync_status: "ready",
      total_available: total,
      last_error: null,
    })
    .eq("id", queueRow.id);

  return new Response(
    JSON.stringify({ verified: true, code: candidateCode, total, sampleHotels }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// DESTINATION CODE DISCOVERY
// ============================================================

const CITY_NAME_ALIASES: Record<string, string[]> = {
  "rome": ["roma"], "florence": ["firenze"], "munich": ["münchen", "muenchen"],
  "cologne": ["köln", "koeln"], "vienna": ["wien"], "prague": ["praha"],
  "lisbon": ["lisboa"], "seville": ["sevilla"], "milan": ["milano"],
  "naples": ["napoli"], "venice": ["venezia"],
  "copenhagen": ["københavn", "kobenhavn"], "gothenburg": ["göteborg", "goteborg"],
  "helsinki": ["helsingfors"], "athens": ["athína", "athina"],
  "istanbul": ["i̇stanbul", "constantinople"],
  "moscow": ["москва", "moskva"], "saint petersburg": ["sankt-peterburg", "санкт-петербург"],
  "warsaw": ["warszawa"], "krakow": ["kraków"], "zurich": ["zürich"],
  "geneva": ["genève", "geneve"], "düsseldorf": ["dusseldorf"],
  "seoul": ["서울"], "tokyo": ["tōkyō", "toukyou"], "kyoto": ["kyōto", "kyouto"],
  "osaka": ["ōsaka", "oosaka"], "beijing": ["běijīng", "peking"],
  "shanghai": ["shànghǎi"], "taipei": ["táiběi"],
  "delhi": ["new delhi", "nai dilli"], "mumbai": ["bombay"],
  "kolkata": ["calcutta"], "bengaluru": ["bangalore"],
  "ho chi minh city": ["saigon", "thành phố hồ chí minh"],
  "yangon": ["rangoon"], "phnom penh": ["phnum pénh"], "vientiane": ["viang chan"],
  "riyadh": ["ar-riyāḍ"], "doha": ["ad-dawḥa"], "abu dhabi": ["abū ẓaby"],
  "muscat": ["maṣqaṭ"], "amman": ["ʿammān"], "beirut": ["bayrūt"],
  "dubai": ["dubayy"], "kuala lumpur": ["kuala lumpur"],
  "jakarta": ["jakarta"], "manila": ["maynila"],
  "bangkok": ["krung thep", "bangkok"], "chiang mai": ["chiangmai"],
  "melbourne": ["melbourne"], "sydney": ["sydney"],
  "rio de janeiro": ["rio de janeiro"], "buenos aires": ["buenos aires"],
  "sao paulo": ["são paulo"],
  "mexico city": ["ciudad de méxico", "ciudad de mexico", "méxico city"],
  "cancun": ["cancún"], "havana": ["la habana"],
  "cape town": ["kaapstad"], "marrakech": ["marrakesh", "marrūkush"],
  "cairo": ["al-qāhirah"], "nairobi": ["nairobi"], "addis ababa": ["addis abeba"],
  "auckland": ["tāmaki makaurau"], "wellington": ["te whanganui-a-tara"],
};

const CITY_COORDINATES: Record<string, [number, number, number]> = {
  "tokyo": [35.6762, 139.6503, 100], "singapore": [1.3521, 103.8198, 50],
  "new york": [40.7128, -74.006, 80], "los angeles": [34.0522, -118.2437, 80],
  "miami": [25.7617, -80.1918, 60], "san francisco": [37.7749, -122.4194, 60],
  "las vegas": [36.1699, -115.1398, 50], "sydney": [-33.8688, 151.2093, 80],
  "hong kong": [22.3193, 114.1694, 50], "istanbul": [41.0082, 28.9784, 80],
  "amsterdam": [52.3676, 4.9041, 50], "lisbon": [38.7223, -9.1393, 50],
  "madrid": [40.4168, -3.7038, 50], "milan": [45.4642, 9.19, 50],
  "vienna": [48.2082, 16.3738, 50], "prague": [50.0755, 14.4378, 50],
  "athens": [37.9838, 23.7275, 60], "bali": [-8.3405, 115.092, 100],
  "cape town": [-33.9249, 18.4241, 80], "marrakech": [31.6295, -7.9811, 50],
  "abu dhabi": [24.4539, 54.3773, 50], "dubai": [25.2048, 55.2708, 60],
  "paris": [48.8566, 2.3522, 60], "london": [51.5074, -0.1278, 80],
  "barcelona": [41.3851, 2.1734, 50], "rome": [41.9028, 12.4964, 60],
  "bangkok": [13.7563, 100.5018, 80], "seoul": [37.5665, 126.978, 80],
  "toronto": [43.6532, -79.3832, 60], "vancouver": [49.2827, -123.1207, 60],
  "mexico city": [19.4326, -99.1332, 60], "cancun": [21.1619, -86.8515, 60],
  "melbourne": [-37.8136, 144.9631, 60], "jakarta": [-6.2088, 106.8456, 80],
  "berlin": [52.52, 13.405, 60], "munich": [48.1351, 11.582, 50],
  "hamburg": [53.5511, 9.9937, 50], "zurich": [47.3769, 8.5417, 50],
  "dubrovnik": [42.6507, 18.0944, 30], "split": [43.5081, 16.4402, 30],
  "santorini": [36.3932, 25.4615, 30], "mykonos": [37.4462, 25.3287, 20],
  "ibiza": [38.9067, 1.4205, 30], "mallorca": [39.6951, 2.9022, 50],
  "madeira": [32.7607, -16.9595, 50], "algarve": [37.0194, -7.9304, 80],
  "amalfi coast": [40.634, 14.6027, 40], "florence": [43.7696, 11.2558, 40],
  "venice": [45.4408, 12.3155, 30], "sao paulo": [-23.5505, -46.6333, 80],
  "buenos aires": [-34.6037, -58.3816, 80], "rio de janeiro": [-22.9068, -43.1729, 80],
  "auckland": [-36.8485, 174.7633, 80], "queenstown": [-45.0312, 168.6626, 40],
  "honolulu": [21.3069, -157.8583, 50], "maui": [20.7984, -156.3319, 60],
  "fiji": [-17.7134, 178.065, 100], "mauritius": [-20.3484, 57.5522, 50],
  "zanzibar": [-6.1659, 39.2026, 40], "kenya": [-1.2921, 36.8219, 100],
  "rwanda": [-1.9706, 29.9153, 80], "oman": [23.588, 58.3829, 80],
  "qatar": [25.2854, 51.531, 50], "costa rica": [9.7489, -83.7533, 100],
  "panama": [8.9824, -79.5193, 60], "cartagena": [10.391, -75.4794, 40],
  "jamaica": [18.0179, -76.8099, 80], "bahamas": [25.0343, -77.3963, 80],
  "barbados": [13.1939, -59.5432, 40], "st. lucia": [13.9094, -60.9789, 40],
  "aruba": [12.5211, -69.9683, 40], "dominican republic": [18.7357, -70.1627, 80],
  "turks and caicos": [21.694, -71.7979, 40], "key west": [24.5551, -81.7797, 30],
  "san diego": [32.7157, -117.1611, 50], "palm springs": [33.8303, -116.5453, 30],
  "scottsdale": [33.4942, -111.9261, 30], "jackson hole": [43.4799, -110.7624, 40],
  "aspen": [39.1911, -106.8175, 30], "park city": [40.6461, -111.498, 30],
  "lake tahoe": [39.0968, -120.0324, 40], "orlando": [28.5383, -81.3792, 50],
  "new orleans": [29.9511, -90.0715, 50], "austin": [30.2672, -97.7431, 50],
  "dallas": [32.7767, -96.797, 50], "houston": [29.7604, -95.3698, 50],
  "puerto vallarta": [20.6534, -105.2253, 40], "los cabos": [22.8905, -109.9167, 40],
  "tulum": [20.2114, -87.4654, 40], "curacao": [12.1696, -68.99, 40],
  "puerto rico": [18.2208, -66.5901, 80], "koh samui": [9.5018, 99.9402, 40],
  "niseko": [42.8049, 140.6874, 30], "kyoto": [35.0116, 135.7681, 40],
  "phuket": [7.8804, 98.3923, 50], "saint-tropez": [43.2623, 6.6386, 30],
  "french riviera": [43.5858, 6.9963, 60], "monaco": [43.7384, 7.4246, 20],
  "zermatt": [45.9763, 7.6586, 30], "swiss alps": [46.5197, 7.451, 80],
  "austrian alps": [47.2628, 11.3946, 80], "bora bora": [-16.5004, -151.7415, 30],
  "maldives": [3.2028, 73.2207, 100], "montenegro": [42.7087, 19.3744, 60],
  "greek islands": [37.0882, 25.2437, 100],
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  "japan": ["jpn", "nippon", "nihon"], "south korea": ["kor", "korea"],
  "united states": ["usa", "us", "united states of america"],
  "united kingdom": ["uk", "gb", "great britain", "england", "britain"],
  "spain": ["esp", "españa", "espana"], "italy": ["ita", "italia"],
  "france": ["fra", "france"], "germany": ["deu", "deutschland"],
  "netherlands": ["nl", "holland", "nederland"], "switzerland": ["ch", "suisse", "schweiz"],
  "austria": ["at", "österreich", "osterreich"], "portugal": ["pt", "prt", "portugal"],
  "greece": ["gr", "hellas", "ellada"], "croatia": ["hr", "hrvatska"],
  "czech republic": ["cz", "ceska", "cesko"], "thailand": ["th", "prathet thai"],
  "indonesia": ["id", "indonesia"], "malaysia": ["my", "malaysia"],
  "philippines": ["ph", "pilipinas"], "vietnam": ["vn", "viet nam"],
  "australia": ["au", "oz"], "new zealand": ["nz", "aotearoa"],
  "canada": ["ca", "canada"], "mexico": ["mx", "méxico", "mexico"],
  "brazil": ["br", "brasil"], "argentina": ["ar", "argentina"],
  "south africa": ["za", "rsa"], "morocco": ["ma", "maroc", "maghrib"],
  "egypt": ["eg", "misr"], "kenya": ["ke", "kenya"], "rwanda": ["rw", "u rwanda"],
  "oman": ["om", "umman"], "qatar": ["qa", "dawlat qatar"],
  "uae": ["ae", "united arab emirates"], "saudi arabia": ["sa", "ksa", "al-mamlaka"],
  "turkey": ["tr", "türkiye", "turkiye"], "jamaica": ["jm", "jamaica"],
  "bahamas": ["bs", "bahamas"], "barbados": ["bb", "barbados"],
  "saint lucia": ["lc", "saint lucia"], "aruba": ["aw", "aruba"],
  "dominican republic": ["do", "dr", "república dominicana"],
  "panama": ["pa", "panamá"], "costa rica": ["cr", "costa rica"],
  "colombia": ["co", "colombia"], "fiji": ["fj", "fiji"],
  "mauritius": ["mu", "mauritius"], "montenegro": ["me", "crna gora"],
};

const COUNTRY_ISO_MAP: Record<string, string> = {
  "japan": "JP", "south korea": "KR", "united states": "US", "united kingdom": "GB",
  "spain": "ES", "italy": "IT", "france": "FR", "germany": "DE", "netherlands": "NL",
  "switzerland": "CH", "austria": "AT", "portugal": "PT", "greece": "GR",
  "croatia": "HR", "czech republic": "CZ", "thailand": "TH", "indonesia": "ID",
  "malaysia": "MY", "philippines": "PH", "vietnam": "VN", "australia": "AU",
  "new zealand": "NZ", "canada": "CA", "mexico": "MX", "brazil": "BR",
  "argentina": "AR", "south africa": "ZA", "morocco": "MA", "egypt": "EG",
  "kenya": "KE", "rwanda": "RW", "oman": "OM", "qatar": "QA",
  "united arab emirates": "AE", "saudi arabia": "SA", "turkey": "TR",
  "jamaica": "JM", "bahamas": "BS", "barbados": "BB", "saint lucia": "LC",
  "aruba": "AW", "dominican republic": "DO", "panama": "PA", "costa rica": "CR",
  "colombia": "CO", "fiji": "FJ", "seychelles": "SC", "mauritius": "MU",
  "montenegro": "ME", "hong kong": "HK", "singapore": "SG",
  "french polynesia": "PF", "maldives": "MV", "monaco": "MC",
  "puerto rico": "PR", "tanzania": "TZ", "turks and caicos islands": "TC",
  "st. lucia": "LC", "saint lucia": "LC",
};

function normalizeName(s: string): string {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function cityMatchesDestination(destName: string, city: string): boolean {
  const destLower = destName.toLowerCase().trim();
  const cityLower = (city || "").toLowerCase().trim();
  if (!cityLower || !destLower) return false;
  if (cityLower.includes(destLower) || destLower.includes(cityLower)) return true;
  const destNorm = normalizeName(destName);
  const cityNorm = normalizeName(city);
  if (destNorm && cityNorm && (cityNorm.includes(destNorm) || destNorm.includes(cityNorm))) return true;
  const aliases = CITY_NAME_ALIASES[destLower];
  if (aliases) {
    for (const alias of aliases) {
      const aliasNorm = normalizeName(alias);
      if (aliasNorm && (cityNorm.includes(aliasNorm) || aliasNorm.includes(cityNorm))) return true;
    }
  }
  for (const [canonical, aliasList] of Object.entries(CITY_NAME_ALIASES)) {
    if (normalizeName(canonical) === destNorm || canonical === destLower) continue;
    for (const alias of aliasList) {
      if (normalizeName(alias) === cityNorm && normalizeName(canonical) !== destNorm) {
        return false;
      }
    }
  }
  return false;
}

function countryMatches(elvoraCountry: string, hbCountry: string): boolean {
  const elvoraLower = (elvoraCountry || "").toLowerCase().trim();
  const hbLower = (hbCountry || "").toLowerCase().trim();
  if (!elvoraLower || !hbLower) return false;
  if (elvoraLower === hbLower) return true;
  if (elvoraLower.includes(hbLower) || hbLower.includes(elvoraLower)) return true;
  const elvoraNorm = normalizeName(elvoraCountry);
  const hbNorm = normalizeName(hbCountry);
  if (elvoraNorm && hbNorm && (elvoraNorm.includes(hbNorm) || hbNorm.includes(elvoraNorm))) return true;
  const aliases = COUNTRY_ALIASES[elvoraLower];
  if (aliases) {
    for (const alias of aliases) {
      if (normalizeName(alias) === hbNorm) return true;
    }
  }
  return false;
}

function coordinatesMatch(destName: string, lat: number | null, lon: number | null): boolean {
  if (lat == null || lon == null) return false;
  const destLower = destName.toLowerCase().trim();
  const ref = CITY_COORDINATES[destLower];
  if (!ref) return false;
  const [refLat, refLon, radiusKm] = ref;
  const R = 6371;
  const dLat = ((lat - refLat) * Math.PI) / 180;
  const dLon = ((lon - refLon) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((refLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusKm;
}

interface CandidateResult {
  code: string;
  name: string;
  country: string;
  countryCode: string;
  totalHotels: number;
  sampleHotels: Array<{ name: string; city: string; country: string; address: string; latitude: number | null; longitude: number | null; }>;
  cityMatch: boolean;
  countryMatch: boolean;
  coordMatch: boolean;
  score: number;
  rejected: boolean;
  rejectReason: string | null;
}

async function discoverDestinationCode(destinationId: string) {
  const { data: queueRow, error } = await supabase
    .from("hotelbeds_destination_queue")
    .select("*")
    .eq("destination_id", destinationId)
    .maybeSingle();

  if (error || !queueRow) {
    return new Response(
      JSON.stringify({ error: "Destination not found in queue" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // PROTECT VERIFIED DESTINATIONS — never re-run discovery
  if (queueRow.verification_status === "verified") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "Destination is already verified and protected" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Check circuit breaker BEFORE making any API call
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({ discovered: false, error: `Quota paused: ${quotaCheck.reason}`, quota_paused: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Mark as discovering
  await supabase
    .from("hotelbeds_destination_queue")
    .update({
      verification_status: "discovering",
      sync_status: "verifying",
      last_discovery_attempt_at: new Date().toISOString(),
      discovery_retry_count: (queueRow.discovery_retry_count || 0) + 1,
    })
    .eq("id", queueRow.id);

  const { apiKey, secret, baseUrl } = getHotelbedsCatalogConfig();

  if (!apiKey || !secret) {
    await supabase
      .from("hotelbeds_destination_queue")
      .update({ verification_status: "verification_failed", sync_status: "failed", last_error: "Catalog credentials not configured" })
      .eq("id", queueRow.id);
    return new Response(
      JSON.stringify({ discovered: false, error: "Catalog credentials not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headers = await buildHotelbedsHeaders(apiKey, secret);

  const { data: elvoraDest } = await supabase
    .from("destinations")
    .select("id, name, slug, country")
    .eq("id", destinationId)
    .maybeSingle();

  const elvoraCountry = elvoraDest?.country || "";
  const destName = queueRow.destination_name;

  const candidates: CandidateResult[] = [];
  const testedCodes = new Set<string>();
  let rateLimited = false;

  // STEP 1: Test the existing Hotelbeds code with a 3-hotel sample.
  // BEST CASE = 1 API request. If it passes, we stop immediately.
  if (queueRow.hotelbeds_code) {
    const origCode = queueRow.hotelbeds_code.toUpperCase();
    testedCodes.add(origCode);
    const candidate = await testCandidateCode(
      origCode, { code: origCode, name: { content: destName } }, destName, elvoraCountry, baseUrl, headers,
    );

    // Circuit breaker: if 403/429, trigger pause and stop immediately
    if (candidate.rejected && candidate.rejectReason?.includes("Rate limited")) {
      await triggerQuotaPause(403, "hotels (discovery)", "catalog", 0);
      await supabase
        .from("hotelbeds_destination_queue")
        .update({
          verification_status: "verification_failed",
          sync_status: "failed",
          last_error: "Rate limited — quota paused",
        })
        .eq("id", queueRow.id);
      return new Response(
        JSON.stringify({ discovered: false, error: "Rate limited — quota paused", quota_paused: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    candidates.push(candidate);

    // If original code verified with score >= 2, STOP — do not make any more API calls
    if (!candidate.rejected && candidate.score >= 2) {
      return await finalizeDiscovery(queueRow, candidate, candidates, destName, elvoraCountry);
    }
  }

  // STEP 2: Country-based discovery (only if original code failed)
  if (!rateLimited && !candidates.some((c) => !c.rejected && c.score >= 2)) {
    const countryCode = elvoraCountry ? COUNTRY_ISO_MAP[elvoraCountry.toLowerCase()] : null;
    if (countryCode) {
      const countryHotelUrl = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&countryCode=${countryCode}&language=ENG&from=1&to=200`;
      let countryResponse: Response;
      try {
        countryResponse = await fetch(countryHotelUrl, { method: "GET", headers });
      } catch {
        countryResponse = null as any;
      }

      if (countryResponse && countryResponse.ok) {
        const countryData = await countryResponse.json();
        const countryHotels = countryData?.hotels || [];

        const candidateCodes = new Map<string, number>();
        for (const hotel of countryHotels) {
          const hotelCity = hotel.city?.content || "";
          const hotelDestCode = hotel.destinationCode || "";
          if (hotelDestCode && !testedCodes.has(hotelDestCode)) {
            if (cityMatchesDestination(destName, hotelCity)) {
              candidateCodes.set(hotelDestCode, (candidateCodes.get(hotelDestCode) || 0) + 1);
            }
          }
        }

        const sortedCandidateCodes = [...candidateCodes.entries()].sort((a, b) => b[1] - a[1]);
        // Only test top 3 candidates to minimize API calls
        for (const [code, matchCount] of sortedCandidateCodes.slice(0, 3)) {
          if (testedCodes.has(code)) continue;
          testedCodes.add(code);

          // Check circuit breaker before each call
          const qCheck = await isQuotaPaused();
          if (qCheck.paused) {
            rateLimited = true;
            break;
          }

          const candidate = await testCandidateCode(
            code, { code, name: { content: destName } }, destName, elvoraCountry, baseUrl, headers,
          );
          candidate.name = `Country search: ${code} (${matchCount} city matches in ${countryCode})`;
          candidates.push(candidate);

          if (!candidate.rejected && candidate.score >= 2) break;
        }
      } else if (countryResponse && (countryResponse.status === 403 || countryResponse.status === 429)) {
        await triggerQuotaPause(countryResponse.status, "hotels (country search)", "catalog", 0);
        rateLimited = true;
      }
    }
  }

  // STEP 3: Destinations API search (final fallback — only if nothing else worked)
  if (!rateLimited && !candidates.some((c) => !c.rejected && c.score >= 2)) {
    const searchTerms = generateSearchTerms(destName);
    // Only try first 2 search terms to minimize API calls
    for (const term of searchTerms.slice(0, 2)) {
      if (rateLimited) break;
      if (candidates.some((c) => !c.rejected && c.score >= 2)) break;

      const qCheck = await isQuotaPaused();
      if (qCheck.paused) {
        rateLimited = true;
        break;
      }

      const destSearchUrl = `${baseUrl}/hotel-content-api/1.0/locations/destinations?fields=all&countryCodes=ALL&destinationCodes=&name=${encodeURIComponent(term)}&language=ENG&from=1&to=15`;

      let destResponse: Response;
      try {
        destResponse = await fetch(destSearchUrl, { method: "GET", headers });
      } catch {
        continue;
      }

      if (destResponse.status === 403 || destResponse.status === 429) {
        await triggerQuotaPause(destResponse.status, "destinations search", "catalog", 0);
        rateLimited = true;
        break;
      }

      if (!destResponse.ok) continue;

      const destData = await destResponse.json();
      const hbDestinations = destData?.destinations || [];

      // Only test first 3 results to minimize API calls
      for (const hbDest of hbDestinations.slice(0, 3)) {
        const code = hbDest.code || "";
        if (!code || testedCodes.has(code)) continue;
        testedCodes.add(code);

        const candidate = await testCandidateCode(
          code, hbDest, destName, elvoraCountry, baseUrl, headers,
        );
        candidates.push(candidate);

        if (!candidate.rejected && candidate.score >= 2) break;
      }
    }
  }

  return await finalizeDiscovery(queueRow, null, candidates, destName, elvoraCountry);
}

async function finalizeDiscovery(
  queueRow: any,
  bestCandidate: CandidateResult | null,
  candidates: CandidateResult[],
  destName: string,
  elvoraCountry: string,
): Promise<Response> {
  // If no explicit best candidate, find from candidates
  if (!bestCandidate) {
    const validCandidates = candidates.filter((c) => !c.rejected && c.totalHotels > 0);
    const sortedValid = validCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.totalHotels - a.totalHotels;
    });
    bestCandidate = sortedValid[0] || null;

    const isAmbiguous = sortedValid.length > 1 && sortedValid[0].score === sortedValid[1].score
      && sortedValid[0].totalHotels === sortedValid[1].totalHotels;

    if (isAmbiguous) {
      await supabase
        .from("hotelbeds_destination_queue")
        .update({
          verification_status: "ambiguous",
          sync_status: "failed",
          discovery_candidates: candidates,
          discovery_notes: `Ambiguous: ${sortedValid.length} candidates with equal score (${sortedValid[0].score}). Codes: ${sortedValid.map((c) => c.code).join(", ")}. Manual verification needed.`,
          last_error: "Ambiguous: multiple candidates with equal score",
        })
        .eq("id", queueRow.id);

      return new Response(
        JSON.stringify({ discovered: false, verified: false, ambiguous: true, candidates: sortedValid, reason: `Multiple candidates with equal score (${sortedValid[0].score})` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  if (bestCandidate && bestCandidate.score >= 2) {
    const sampleHotels = bestCandidate.sampleHotels;
    const evidence = {
      cityMatch: bestCandidate.cityMatch,
      countryMatch: bestCandidate.countryMatch,
      coordMatch: bestCandidate.coordMatch,
      score: bestCandidate.score,
      elvoraCountry,
      hbCountry: bestCandidate.country,
      hbCountryCode: bestCandidate.countryCode,
      candidateCount: candidates.length,
    };

    await supabase
      .from("hotelbeds_destination_queue")
      .update({
        verification_status: "verified",
        verified_hotelbeds_code: bestCandidate.code,
        sync_status: "ready",
        total_available: bestCandidate.totalHotels,
        verified_at: new Date().toISOString(),
        verification_sample: sampleHotels,
        verification_evidence: evidence,
        discovery_candidates: candidates,
        discovery_notes: `Verified code ${bestCandidate.code}. Score: ${bestCandidate.score}/3. City: ${bestCandidate.cityMatch}, Country: ${bestCandidate.countryMatch}, Coord: ${bestCandidate.coordMatch}.`,
        last_error: null,
      })
      .eq("id", queueRow.id);

    return new Response(
      JSON.stringify({ discovered: true, verified: true, originalCode: queueRow.hotelbeds_code, verifiedCode: bestCandidate.code, totalHotels: bestCandidate.totalHotels, score: bestCandidate.score, sampleHotels, evidence, candidates }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Failed
  const validCandidates = candidates.filter((c) => !c.rejected && c.totalHotels > 0);
  const bestScore = validCandidates.length > 0 ? Math.max(...validCandidates.map((c) => c.score)) : 0;
  const notes = candidates.length === 0
    ? "No candidates found"
    : `Best score ${bestScore}/3 from ${validCandidates.length} valid candidates out of ${candidates.length} total. All candidates: ${candidates.map((c) => c.code + "(" + c.score + ")" + (c.rejected ? "[rejected:" + c.rejectReason + "]" : "")).join(", ")}`;

  await supabase
    .from("hotelbeds_destination_queue")
    .update({
      verification_status: "verification_failed",
      sync_status: "failed",
      discovery_candidates: candidates,
      discovery_notes: notes,
      last_error: bestScore > 0 ? `Best candidate scored ${bestScore}/3 — insufficient evidence` : "No valid candidates found",
    })
    .eq("id", queueRow.id);

  return new Response(
    JSON.stringify({ discovered: false, verified: false, candidates, reason: notes }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function generateSearchTerms(destName: string): string[] {
  const terms: string[] = [destName];
  const parts = destName.split(/\s+/);
  if (parts.length > 1) {
    terms.push(parts[0]);
    terms.push(parts.slice(1).join(" "));
  }
  const destLower = destName.toLowerCase();
  const aliases = CITY_NAME_ALIASES[destLower];
  if (aliases) {
    for (const alias of aliases) {
      terms.push(alias);
    }
  }
  return [...new Set(terms)];
}

async function testCandidateCode(
  code: string,
  hbDest: any,
  destName: string,
  elvoraCountry: string,
  baseUrl: string,
  headers: Record<string, string>,
): Promise<CandidateResult> {
  const result: CandidateResult = {
    code,
    name: hbDest?.name?.content || hbDest?.name || "",
    country: hbDest?.country?.name?.content || hbDest?.country?.description || "",
    countryCode: hbDest?.countryCode || "",
    totalHotels: 0,
    sampleHotels: [],
    cityMatch: false,
    countryMatch: false,
    coordMatch: false,
    score: 0,
    rejected: false,
    rejectReason: null,
  };

  // Fetch 3 sample hotels only
  const hotelUrl = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&destinationCode=${code}&language=ENG&from=1&to=3`;

  let hotelResponse: Response;
  try {
    hotelResponse = await fetch(hotelUrl, { method: "GET", headers });
  } catch {
    result.rejected = true;
    result.rejectReason = "Network error testing code";
    return result;
  }

  if (hotelResponse.status === 403 || hotelResponse.status === 429) {
    result.rejected = true;
    result.rejectReason = `Rate limited (HTTP ${hotelResponse.status})`;
    return result;
  }

  if (!hotelResponse.ok) {
    result.rejected = true;
    result.rejectReason = `HTTP ${hotelResponse.status}`;
    return result;
  }

  const hotelData = await hotelResponse.json();
  const hotels = hotelData?.hotels || [];
  result.totalHotels = hotelData?.total || 0;

  if (hotels.length === 0) {
    result.rejected = true;
    result.rejectReason = "No hotels returned for this code";
    return result;
  }

  result.sampleHotels = hotels.slice(0, 3).map((h: any) => ({
    name: h.name?.content || "",
    city: h.city?.content || "",
    country: h.country?.description || h.country?.code || "",
    address: h.address?.content || "",
    latitude: h.coordinates?.latitude ?? null,
    longitude: h.coordinates?.longitude ?? null,
  }));

  const cityMatch = result.sampleHotels.some((h) => cityMatchesDestination(destName, h.city));
  result.cityMatch = cityMatch;
  if (cityMatch) result.score++;

  if (elvoraCountry) {
    const cMatch = result.sampleHotels.some((h) => {
      if (!h.country) return true;
      return countryMatches(elvoraCountry, h.country);
    });
    result.countryMatch = cMatch;
    if (cMatch) result.score++;
  } else {
    result.countryMatch = true;
    result.score++;
  }

  const coordMatch = result.sampleHotels.some((h) => coordinatesMatch(destName, h.latitude, h.longitude));
  result.coordMatch = coordMatch;
  if (coordMatch) result.score++;

  if (!cityMatch && result.sampleHotels.some((h) => h.city)) {
    const sampleCities = result.sampleHotels.map((h) => h.city).filter(Boolean);
    for (const sampleCity of sampleCities) {
      for (const [knownDest] of Object.entries(CITY_COORDINATES)) {
        if (knownDest === destName.toLowerCase()) continue;
        if (cityMatchesDestination(knownDest, sampleCity)) {
          result.rejected = true;
          result.rejectReason = `Hotels are in ${sampleCity}, which matches ${knownDest} — not ${destName}`;
          return result;
        }
      }
    }
  }

  return result;
}

// ============================================================
// BATCH DISCOVERY (max 5 per invocation)
// ============================================================

async function discoverBatch(destinationIds?: string[]) {
  // Check circuit breaker
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({ results: [], quota_paused: true, reason: `Quota paused: ${quotaCheck.reason}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Get settings for batch size
  const { data: settings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("discovery_batch_size")
    .eq("id", 1)
    .maybeSingle();
  const batchSize = settings?.discovery_batch_size || 5;

  let pending: any[];
  if (destinationIds && destinationIds.length > 0) {
    const { data, error } = await supabase
      .from("hotelbeds_destination_queue")
      .select("destination_id, destination_name, verification_status")
      .in("destination_id", destinationIds)
      .neq("verification_status", "verified")
      .order("priority")
      .limit(batchSize);
    if (error) throw new Error(`Failed to fetch destinations: ${error.message}`);
    pending = data || [];
  } else {
    const { data, error } = await supabase
      .from("hotelbeds_destination_queue")
      .select("destination_id, destination_name, verification_status")
      .in("verification_status", ["pending"])
      .order("priority")
      .limit(batchSize);
    if (error) throw new Error(`Failed to fetch destinations: ${error.message}`);
    pending = data || [];
  }

  return await runDiscoveryBatch(pending);
}

async function discoverNextBatch() {
  // Check circuit breaker
  const quotaCheck = await isQuotaPaused();
  if (quotaCheck.paused) {
    return new Response(
      JSON.stringify({ results: [], quota_paused: true, reason: `Quota paused: ${quotaCheck.reason}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: settings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("discovery_batch_size")
    .eq("id", 1)
    .maybeSingle();
  const batchSize = settings?.discovery_batch_size || 5;

  const { data, error } = await supabase
    .from("hotelbeds_destination_queue")
    .select("destination_id, destination_name, verification_status")
    .eq("verification_status", "pending")
    .order("priority")
    .limit(batchSize);

  if (error) throw new Error(`Failed to fetch pending destinations: ${error.message}`);

  return await runDiscoveryBatch(data || []);
}

async function runDiscoveryBatch(pending: any[]): Promise<Response> {
  const results: Array<{ destination: string; discovered: boolean; code?: string; error?: string; quota_paused?: boolean }> = [];
  let batchCompleted = 0;
  let quotaWasPaused = false;

  for (const dest of pending) {
    // Check circuit breaker before each destination
    const qCheck = await isQuotaPaused();
    if (qCheck.paused) {
      results.push({
        destination: dest.destination_name,
        discovered: false,
        error: `Skipped — quota paused: ${qCheck.reason}`,
        quota_paused: true,
      });
      quotaWasPaused = true;
      break;
    }

    const result = await discoverDestinationCode(dest.destination_id!);
    const data = await result.json();

    if (data.quota_paused) {
      results.push({
        destination: dest.destination_name,
        discovered: false,
        error: "Quota paused during discovery",
        quota_paused: true,
      });
      quotaWasPaused = true;
      break;
    }

    results.push({
      destination: dest.destination_name,
      discovered: data.discovered || false,
      code: data.verifiedCode,
      error: data.reason || data.error,
    });

    if (data.discovered) {
      batchCompleted++;
    }
  }

  return new Response(
    JSON.stringify({
      processed: results.length,
      results,
      batch_completed: batchCompleted,
      quota_paused: quotaWasPaused,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// CIRCUIT BREAKER CONTROLS
// ============================================================

async function resetQuotaPause() {
  // Clear the global quota-pause flag but do NOT start the queue.
  // queue_running stays false — admin must explicitly call start or resume.
  await supabase
    .from("hotelbeds_queue_settings")
    .update({
      quota_paused: false,
      quota_paused_at: null,
      quota_paused_reason: null,
      quota_paused_endpoint: null,
      quota_paused_credential_role: null,
      quota_paused_batch_completed: 0,
      last_api_status: null,
      last_quota_event: null,
      last_quota_event_at: null,
    })
    .eq("id", 1);

  // Restore quota_paused destinations to a resumable/eligible state.
  // Partially processed destinations → partial (preserves progress counters).
  // Unprocessed destinations → ready only if verification_status = 'verified'.
  // Unverified destinations → pending (still need verification before syncing).
  const { data: quotaPausedRows } = await supabase
    .from("hotelbeds_destination_queue")
    .select("id, processed_count, total_available, verification_status")
    .eq("sync_status", "quota_paused");

  let restoredPartial = 0;
  let restoredReady = 0;
  let restoredPending = 0;

  for (const row of quotaPausedRows || []) {
    const hasProgress = (row.processed_count || 0) > 0;
    const isVerified = row.verification_status === "verified";

    let newStatus: string;
    if (hasProgress) {
      newStatus = "partial";
      restoredPartial++;
    } else if (isVerified) {
      newStatus = "ready";
      restoredReady++;
    } else {
      newStatus = "pending";
      restoredPending++;
    }

    await supabase
      .from("hotelbeds_destination_queue")
      .update({ sync_status: newStatus, last_error: null })
      .eq("id", row.id);
  }

  return new Response(
    JSON.stringify({
      reset: true,
      queue_running: false,
      destinations_restored: {
        partial: restoredPartial,
        ready: restoredReady,
        pending: restoredPending,
      },
      message: "Quota pause cleared. Destinations restored. Queue remains stopped — call start or resume to begin processing.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function pauseDiscovery() {
  await supabase
    .from("hotelbeds_queue_settings")
    .update({
      quota_paused: true,
      quota_paused_at: new Date().toISOString(),
      quota_paused_reason: "Manually paused by admin",
    })
    .eq("id", 1);

  return new Response(
    JSON.stringify({ paused: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// RESET FAILED DESTINATIONS
// ============================================================

async function resetFailedDestinations(destinationIds?: string[]) {
  let count: number;

  if (destinationIds && destinationIds.length > 0) {
    const { data, error } = await supabase
      .from("hotelbeds_destination_queue")
      .update({
        verification_status: "pending",
        sync_status: "pending",
        last_error: null,
        discovery_notes: null,
      })
      .in("destination_id", destinationIds)
      .in("verification_status", ["verification_failed", "ambiguous"])
      .select("id");
    count = data?.length || 0;
    if (error) throw new Error(`Failed to reset: ${error.message}`);
  } else {
    const { data, error } = await supabase
      .from("hotelbeds_destination_queue")
      .update({
        verification_status: "pending",
        sync_status: "pending",
        last_error: null,
        discovery_notes: null,
      })
      .in("verification_status", ["verification_failed", "ambiguous"])
      .select("id");
    count = data?.length || 0;
    if (error) throw new Error(`Failed to reset: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ reset: true, count, message: `${count} failed destinations reset to pending` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ============================================================
// SETTINGS
// ============================================================

async function getSettings() {
  const { data } = await supabase
    .from("hotelbeds_queue_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return new Response(
    JSON.stringify(data || {}),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function updateSettings(settings: Record<string, unknown>) {
  const allowedFields = [
    "hotels_per_destination",
    "api_page_size",
    "concurrent_destinations",
    "automatic_resume",
    "rate_limit_protection",
    "discovery_batch_size",
    "discovery_sample_size",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in settings) updates[key] = settings[key];
  }

  if (Object.keys(updates).length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid settings to update" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error } = await supabase
    .from("hotelbeds_queue_settings")
    .update(updates)
    .eq("id", 1);

  if (error) throw new Error(`Failed to update settings: ${error.message}`);

  return new Response(
    JSON.stringify({ updated: true, settings: updates }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
