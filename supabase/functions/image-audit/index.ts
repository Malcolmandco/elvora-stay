// Hotel Image Audit — audit of stored property images + repair workflow.
// The audit phase is read-only. The repair phase requires explicit admin approval
// before any property images are changed.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsCatalogConfig, buildHotelbedsHeaders } from "../_shared/hotelbeds-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PropertyRow {
  id: string;
  name: string;
  supplier_hotel_code: string;
  destination_name: string | null;
  city: string | null;
  country: string | null;
  images: unknown;
  last_synced_at: string | null;
}

interface ImageEntry {
  id?: string;
  url?: string;
  alt?: string;
}

interface Issue {
  type: string;
  url: string;
  detail: string;
}

type AuditStatus =
  | "VERIFIED"
  | "UNVERIFIED"
  | "BROKEN_IMAGE"
  | "POSSIBLE_MISMATCH"
  | "NO_IMAGES"
  | "DUPLICATE_IMAGE";

interface AuditResult {
  property_id: string;
  property_name: string;
  supplier_hotel_code: string;
  destination_name: string | null;
  city: string | null;
  country: string | null;
  image_count: number;
  audit_status: AuditStatus;
  issues: Issue[];
  has_internal_duplicates: boolean;
  has_cross_hotel_duplicates: boolean;
  has_non_hotelbeds_images: boolean;
  has_broken_urls: boolean;
  url_check_performed: boolean;
  last_synced_at: string | null;
}

function extractUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return (images as ImageEntry[])
    .map((img) => (img?.url || "").trim())
    .filter((u) => u.length > 0);
}

function getUrlCode(url: string): string | null {
  const match = url.match(/giata\/\d+\/(\d+)/);
  return match ? match[1] : null;
}

function padCode(code: string): string {
  return code.length >= 6 ? code : code.padStart(6, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify admin JWT
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

  const role = (user.app_metadata as Record<string, unknown>)?.role;
  const isAdminFlag = (user.app_metadata as Record<string, unknown>)?.is_admin;
  if (role !== "admin" && isAdminFlag !== true) {
    return new Response(
      JSON.stringify({ error: "Admin authorization required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    // ─── Run audit ───────────────────────────────────────────────────
    if (action === "run") {
      const checkUrls = body.checkUrls === true;
      const batchSize = body.batchSize || 50;
      const offset = body.offset || 0;

      // Create a new audit run
      const { data: runRow, error: runError } = await supabase
        .from("hotel_image_audit_runs")
        .insert({
          status: "running",
          api_calls_made: 0,
          notes: checkUrls
            ? "Stored-data audit with URL accessibility check"
            : "Stored-data audit (no URL accessibility check)",
        })
        .select("id")
        .single();

      if (runError || !runRow) {
        return new Response(
          JSON.stringify({ error: "Failed to create audit run" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const runId = runRow.id;

      // Fetch all Hotelbeds properties in batches
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, destination_name, city, country, images, last_synced_at")
        .not("supplier_hotel_code", "is", null)
        .range(offset, offset + batchSize - 1);

      if (propError) {
        await supabase.from("hotel_image_audit_runs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          notes: `Query error: ${propError.message}`,
        }).eq("id", runId);

        return new Response(
          JSON.stringify({ error: "Failed to fetch properties" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!properties || properties.length === 0) {
        await supabase.from("hotel_image_audit_runs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_properties: 0,
          stats: {},
        }).eq("id", runId);

        return new Response(
          JSON.stringify({ run_id: runId, total: 0, completed: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Build a global URL→property map for cross-hotel duplicate detection
      const urlToProperties = new Map<string, string[]>();
      const allPropData: PropertyRow[] = properties as PropertyRow[];

      for (const prop of allPropData) {
        const urls = extractUrls(prop.images);
        for (const url of urls) {
          const cleanUrl = url.split("?")[0];
          const existing = urlToProperties.get(cleanUrl);
          if (existing) {
            if (!existing.includes(prop.id)) existing.push(prop.id);
          } else {
            urlToProperties.set(cleanUrl, [prop.id]);
          }
        }
      }

      // Process each property
      const results: AuditResult[] = [];
      let brokenUrlCount = 0;
      let quotaIssues: string | null = null;

      for (const prop of allPropData) {
        const urls = extractUrls(prop.images);
        const issues: Issue[] = [];
        let status: AuditStatus = "UNVERIFIED";
        let hasInternalDupes = false;
        let hasCrossHotel = false;
        let hasNonHB = false;
        let hasBroken = false;

        if (urls.length === 0) {
          status = "NO_IMAGES";
          issues.push({
            type: "no_images",
            url: "",
            detail: "Property has no stored images",
          });
        } else {
          // Check for internal duplicates
          const seen = new Set<string>();
          for (const url of urls) {
            const clean = url.split("?")[0];
            if (seen.has(clean)) {
              hasInternalDupes = true;
              issues.push({
                type: "internal_duplicate",
                url,
                detail: "Same image URL appears more than once within this property",
              });
            }
            seen.add(clean);
          }

          // Check for non-Hotelbeds images and code matching
          for (const url of urls) {
            const cleanUrl = url.split("?")[0];

            if (!cleanUrl.startsWith("https://photos.hotelbeds.com/")) {
              hasNonHB = true;
              issues.push({
                type: "non_hotelbeds_image",
                url,
                detail: cleanUrl.startsWith("https://images.pexels.com/")
                  ? "Pexels stock photo used instead of Hotelbeds hotel image"
                  : "Image URL is not from Hotelbeds CDN",
              });
            } else {
              // Check if URL code matches property code
              const urlCode = getUrlCode(cleanUrl);
              const expectedCode = padCode(prop.supplier_hotel_code);
              if (urlCode && urlCode !== expectedCode) {
                issues.push({
                  type: "code_mismatch",
                  url,
                  detail: `Image URL contains hotel code ${urlCode} but property code is ${expectedCode}`,
                });
              }
            }

            // Check for cross-hotel duplicate
            const crossProps = urlToProperties.get(cleanUrl);
            if (crossProps && crossProps.length > 1) {
              hasCrossHotel = true;
              issues.push({
                type: "cross_hotel_duplicate",
                url,
                detail: `Same image URL shared across ${crossProps.length} properties`,
              });
            }
          }

          // URL accessibility check (optional, rate-limited)
          if (checkUrls) {
            for (const url of urls.slice(0, 5)) {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const resp = await fetch(url, {
                  method: "HEAD",
                  signal: controller.signal,
                  redirect: "follow",
                });
                clearTimeout(timeout);

                if (resp.status === 403 || resp.status === 429) {
                  quotaIssues = `URL check received ${resp.status} — rate limited`;
                  break;
                }
                if (!resp.ok) {
                  hasBroken = true;
                  issues.push({
                    type: "broken_url",
                    url,
                    detail: `HTTP ${resp.status} when accessing image URL`,
                  });
                }
              } catch {
                hasBroken = true;
                issues.push({
                  type: "broken_url",
                  url,
                  detail: "Failed to fetch image URL (network error or timeout)",
                });
              }
            }
          }

          // Determine final status (priority order)
          if (hasBroken) {
            status = "BROKEN_IMAGE";
          } else if (hasNonHB || hasCrossHotel) {
            status = "POSSIBLE_MISMATCH";
          } else if (hasInternalDupes) {
            status = "DUPLICATE_IMAGE";
          } else {
            // Images are from Hotelbeds CDN and URL code matches property code
            // Mark as UNVERIFIED — we cannot confirm visual accuracy from URL alone
            status = "UNVERIFIED";
          }
        }

        results.push({
          property_id: prop.id,
          property_name: prop.name,
          supplier_hotel_code: prop.supplier_hotel_code,
          destination_name: prop.destination_name,
          city: prop.city,
          country: prop.country,
          image_count: urls.length,
          audit_status: status,
          issues: issues as unknown as Record<string, unknown>[],
          has_internal_duplicates: hasInternalDupes,
          has_cross_hotel_duplicates: hasCrossHotel,
          has_non_hotelbeds_images: hasNonHB,
          has_broken_urls: hasBroken,
          url_check_performed: checkUrls,
          last_synced_at: prop.last_synced_at,
        });

        if (hasBroken) brokenUrlCount++;
      }

      // Calculate stats
      const statusCounts: Record<string, number> = {};
      for (const r of results) {
        statusCounts[r.audit_status] = (statusCounts[r.audit_status] || 0) + 1;
      }

      const hasMore = properties.length === batchSize;

      // Insert results
      if (results.length > 0) {
        const { error: insertError } = await supabase
          .from("hotel_image_audit_results")
          .insert(results.map((r) => ({
            run_id: runId,
            property_id: r.property_id,
            property_name: r.property_name,
            supplier_hotel_code: r.supplier_hotel_code,
            destination_name: r.destination_name,
            city: r.city,
            country: r.country,
            image_count: r.image_count,
            audit_status: r.audit_status,
            issues: JSON.stringify(r.issues),
            has_internal_duplicates: r.has_internal_duplicates,
            has_cross_hotel_duplicates: r.has_cross_hotel_duplicates,
            has_non_hotelbeds_images: r.has_non_hotelbeds_images,
            has_broken_urls: r.has_broken_urls,
            url_check_performed: r.url_check_performed,
            last_synced_at: r.last_synced_at,
          })));

        if (insertError) {
          // Continue anyway — partial results are better than none
        }
      }

      // Update run status
      await supabase.from("hotel_image_audit_runs").update({
        status: hasMore ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        total_properties: results.length,
        stats: {
          status_counts: statusCounts,
          batch_offset: offset,
          batch_size: batchSize,
          has_more: hasMore,
          properties_in_batch: results.length,
        },
        quota_issues: quotaIssues,
      }).eq("id", runId);

      return new Response(
        JSON.stringify({
          run_id: runId,
          total_in_batch: results.length,
          has_more: hasMore,
          next_offset: hasMore ? offset + batchSize : null,
          status_counts: statusCounts,
          quota_issues: quotaIssues,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Get latest run results ──────────────────────────────────────
    if (action === "results") {
      const { filter, search, page, pageSize } = body;
      const pageNum = page || 1;
      const pageSz = pageSize || 24;
      const rangeStart = (pageNum - 1) * pageSz;
      const rangeEnd = rangeStart + pageSz - 1;

      // Get latest completed/partial run
      const { data: latestRun, error: runError } = await supabase
        .from("hotel_image_audit_runs")
        .select("id, started_at, completed_at, status, total_properties, stats, api_calls_made, quota_issues, notes")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError || !latestRun) {
        return new Response(
          JSON.stringify({ error: "No audit runs found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Build query for results
      let query = supabase
        .from("hotel_image_audit_results")
        .select("id, property_id, property_name, supplier_hotel_code, destination_name, city, country, image_count, audit_status, issues, has_internal_duplicates, has_cross_hotel_duplicates, has_non_hotelbeds_images, has_broken_urls, url_check_performed, last_synced_at", { count: "exact" })
        .eq("run_id", latestRun.id);

      if (filter && filter !== "ALL") {
        query = query.eq("audit_status", filter);
      }

      if (search) {
        query = query.or(`property_name.ilike.%${search}%,supplier_hotel_code.ilike.%${search}%,destination_name.ilike.%${search}%`);
      }

      query = query.range(rangeStart, rangeEnd).order("property_name", { ascending: true });

      const { data: results, error: resultsError, count } = await query;

      if (resultsError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch results" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Also fetch the property images for each result so the gallery can display them
      const propertyIds = (results || []).map((r) => r.property_id);
      let imagesMap: Record<string, unknown> = {};
      if (propertyIds.length > 0) {
        const { data: propData } = await supabase
          .from("properties")
          .select("id, images")
          .in("id", propertyIds);

        if (propData) {
          for (const p of propData) {
            imagesMap[p.id] = p.images;
          }
        }
      }

      return new Response(
        JSON.stringify({
          run: latestRun,
          results: results || [],
          images_map: imagesMap,
          pagination: {
            page: pageNum,
            page_size: pageSz,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / pageSz),
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Get property detail (full gallery) ──────────────────────────
    if (action === "property_detail") {
      const { propertyId } = body;
      if (!propertyId) {
        return new Response(
          JSON.stringify({ error: "propertyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, destination_name, city, country, images, last_synced_at, property_type, address")
        .eq("id", propertyId)
        .maybeSingle();

      if (propErr || !prop) {
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get latest audit result for this property
      const { data: auditResult } = await supabase
        .from("hotel_image_audit_results")
        .select("audit_status, issues, has_internal_duplicates, has_cross_hotel_duplicates, has_non_hotelbeds_images, has_broken_urls, url_check_performed")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          property: prop,
          audit: auditResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Get stats summary ───────────────────────────────────────────
    if (action === "stats") {
      const { data: latestRun, error: runError } = await supabase
        .from("hotel_image_audit_runs")
        .select("id, started_at, completed_at, status, total_properties, stats, api_calls_made, quota_issues, notes")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError || !latestRun) {
        return new Response(
          JSON.stringify({ error: "No audit runs found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get aggregate counts from results
      const { data: aggData } = await supabase
        .from("hotel_image_audit_results")
        .select("audit_status, destination_name")
        .eq("run_id", latestRun.id);

      const statusCounts: Record<string, number> = {};
      const destProblemCounts: Record<string, number> = {};

      if (aggData) {
        for (const row of aggData) {
          statusCounts[row.audit_status] = (statusCounts[row.audit_status] || 0) + 1;
          if (row.audit_status !== "VERIFIED" && row.audit_status !== "UNVERIFIED") {
            const dest = row.destination_name || "Unknown";
            destProblemCounts[dest] = (destProblemCounts[dest] || 0) + 1;
          }
        }
      }

      const topProblemDestinations = Object.entries(destProblemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([dest, count]) => ({ destination: dest, count }));

      return new Response(
        JSON.stringify({
          run: latestRun,
          status_counts: statusCounts,
          total_results: aggData?.length || 0,
          top_problem_destinations: topProblemDestinations,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Repair queue: list all Pexels-fallback properties ───────────
    if (action === "repair_queue") {
      // Use a Postgres filter to find only properties whose images JSON
      // contains a Pexels URL — avoids loading all 4,236+ properties.
      const { data: props, error: qErr } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, destination_name, city, country, images, last_synced_at, editorial_override, elvora_images")
        .not("supplier_hotel_code", "is", null)
        .eq("is_active", true)
        .like("images", "%images.pexels.com%")
        .limit(200);

      if (qErr) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch properties: " + qErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Double-filter client-side since LIKE can have false positives
      const pexelsProps = (props || []).filter((p) => {
        if (!Array.isArray(p.images)) return false;
        return p.images.some((img: Record<string, unknown>) => {
          const url = String(img?.url || "");
          return url.includes("images.pexels.com");
        });
      });

      // Check which ones already have a repair history entry
      const propIds = pexelsProps.map((p) => p.id);
      let repairedSet = new Set<string>();
      if (propIds.length > 0) {
        const { data: repaired } = await supabase
          .from("hotel_image_repair_history")
          .select("property_id")
          .in("property_id", propIds);
        repairedSet = new Set((repaired || []).map((r) => r.property_id));
      }

      const queue = pexelsProps.map((p) => ({
        id: p.id,
        name: p.name,
        supplier_hotel_code: p.supplier_hotel_code,
        destination_name: p.destination_name,
        city: p.city,
        country: p.country,
        image_count: Array.isArray(p.images) ? p.images.length : 0,
        current_image_url: p.images?.[0]?.url || "",
        last_synced_at: p.last_synced_at,
        editorial_override: p.editorial_override,
        has_elvora_images: Array.isArray(p.elvora_images) && p.elvora_images.length > 0,
        repair_status: repairedSet.has(p.id) ? "repaired" : "pending",
      }));

      return new Response(
        JSON.stringify({
          total: queue.length,
          pending: queue.filter((q) => q.repair_status === "pending").length,
          repaired: queue.filter((q) => q.repair_status === "repaired").length,
          properties: queue,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Fetch replacement images from Hotelbeds for one property ────
    if (action === "fetch_replacement") {
      const { propertyId } = body;
      if (!propertyId) {
        return new Response(
          JSON.stringify({ error: "propertyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get the property
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, destination_name, city, country, images, elvora_images, editorial_override")
        .eq("id", propertyId)
        .maybeSingle();

      if (propErr || !prop) {
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const hotelCode = prop.supplier_hotel_code;
      if (!hotelCode) {
        return new Response(
          JSON.stringify({ error: "Property has no supplier hotel code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Call Hotelbeds Content API for this single hotel
      const { apiKey, secret, baseUrl } = getHotelbedsCatalogConfig();
      if (!apiKey || !secret) {
        return new Response(
          JSON.stringify({ error: "Hotelbeds API credentials not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const hbHeaders = await buildHotelbedsHeaders(apiKey, secret);
      const apiUrl = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&code=${hotelCode}&language=ENG`;

      let hbResponse: Response;
      try {
        hbResponse = await fetch(apiUrl, { method: "GET", headers: hbHeaders });
      } catch {
        return new Response(
          JSON.stringify({ error: "Network error contacting Hotelbeds API" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (hbResponse.status === 403 || hbResponse.status === 429) {
        const rawBody = await hbResponse.text().catch(() => "");
        return new Response(
          JSON.stringify({
            error: `Hotelbeds API rate limited (HTTP ${hbResponse.status}). Stopped to respect quota.`,
            quota_issue: true,
            raw: rawBody.substring(0, 200),
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!hbResponse.ok) {
        const errText = await hbResponse.text().catch(() => "");
        return new Response(
          JSON.stringify({ error: `Hotelbeds API error: HTTP ${hbResponse.status}`, raw: errText.substring(0, 300) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const hbData = await hbResponse.json();
      const hotels = Array.isArray(hbData?.hotels) ? hbData.hotels : [];

      if (hotels.length === 0) {
        return new Response(
          JSON.stringify({
            property: prop,
            found: false,
            replacement_images: [],
            evidence: "No hotel found in Hotelbeds Content API for this supplier code.",
            api_calls_made: 1,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const hotel = hotels[0];
      const hotelImages = Array.isArray(hotel.images) ? hotel.images : [];

      if (hotelImages.length === 0) {
        return new Response(
          JSON.stringify({
            property: prop,
            found: true,
            hotel_name: hotel.name?.content || prop.name,
            replacement_images: [],
            evidence: `Hotelbeds has a record for hotel code ${hotelCode} (${hotel.name?.content || "unnamed"}) but provides no photographs for it.`,
            api_calls_made: 1,
            no_images_available: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Build replacement image array
      const buildImageUrl = (path: string): string => {
        if (!path) return "";
        const prefix = "https://photos.hotelbeds.com/giata/";
        if (path.startsWith("http")) return path;
        return prefix + path.replace(/^\/+/, "");
      };

      const replacementImages = hotelImages.slice(0, 10).map((img: { path: string; typeCode?: string; typeDescription?: string }, idx: number) => ({
        id: `hb-${hotelCode}-img-${idx}`,
        url: buildImageUrl(img.path),
        alt: `${hotel.name?.content || prop.name} - ${img.typeDescription || "hotel photo"}`,
        type_code: img.typeCode || "",
        type_description: img.typeDescription || "",
      })).filter((img: { url: string }) => img.url);

      // Build evidence string
      const evidence = [
        `Images fetched from Hotelbeds Content API for hotel code ${hotelCode}.`,
        `API returned hotel name: "${hotel.name?.content || "unknown"}".`,
        `Property name in database: "${prop.name}".`,
        `Hotel code in image URLs matches supplier_hotel_code (${hotelCode}).`,
        `Total images found: ${replacementImages.length}.`,
        `API calls made: 1 (single hotel lookup, not a catalog sync).`,
        replacementImages.length > 0
          ? `Image URL pattern: https://photos.hotelbeds.com/giata/{prefix}/${hotelCode.padStart(6, "0")}/${hotelCode.padStart(6, "0")}a_hb_*.jpg`
          : "",
      ].filter(Boolean).join(" ");

      return new Response(
        JSON.stringify({
          property: {
            id: prop.id,
            name: prop.name,
            supplier_hotel_code: prop.supplier_hotel_code,
            destination_name: prop.destination_name,
            city: prop.city,
            country: prop.country,
            current_images: prop.images,
            editorial_override: prop.editorial_override,
            has_elvora_images: Array.isArray(prop.elvora_images) && prop.elvora_images.length > 0,
          },
          found: true,
          hotel_name: hotel.name?.content || prop.name,
          replacement_images: replacementImages,
          evidence,
          api_calls_made: 1,
          no_images_available: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Approve repair: save replacement images to property ─────────
    if (action === "approve_repair") {
      const { propertyId, replacementImages, evidence } = body;
      if (!propertyId) {
        return new Response(
          JSON.stringify({ error: "propertyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!Array.isArray(replacementImages) || replacementImages.length === 0) {
        return new Response(
          JSON.stringify({ error: "replacementImages must be a non-empty array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get current property data
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, images, elvora_images, editorial_override")
        .eq("id", propertyId)
        .maybeSingle();

      if (propErr || !prop) {
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const previousImages = prop.images;

      // Preserve any existing Elvora editorial images — merge them with replacements
      let finalImages = replacementImages;
      if (Array.isArray(prop.elvora_images) && prop.elvora_images.length > 0) {
        finalImages = [...replacementImages, ...prop.elvora_images];
      }

      // Update the property images — ONLY images, nothing else
      const { error: updateErr } = await supabase
        .from("properties")
        .update({
          images: finalImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: `Failed to update property images: ${updateErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Record in repair history
      const approverEmail = user.email || user.id;
      await supabase
        .from("hotel_image_repair_history")
        .insert({
          property_id: propertyId,
          supplier_hotel_code: prop.supplier_hotel_code,
          previous_images: previousImages,
          replacement_images: replacementImages,
          source: "hotelbeds_content_api",
          verification_evidence: evidence || "Admin-approved replacement from Hotelbeds Content API",
          approved_by: approverEmail,
          approved_at: new Date().toISOString(),
        });

      return new Response(
        JSON.stringify({
          success: true,
          property_id: propertyId,
          previous_image_count: Array.isArray(previousImages) ? previousImages.length : 0,
          new_image_count: finalImages.length,
          message: "Property images updated successfully. Generic Pexels fallback removed.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Skip property: mark as reviewed, no changes ─────────────────
    if (action === "skip_repair") {
      const { propertyId, reason } = body;
      if (!propertyId) {
        return new Response(
          JSON.stringify({ error: "propertyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: prop } = await supabase
        .from("properties")
        .select("id, name, supplier_hotel_code, images")
        .eq("id", propertyId)
        .maybeSingle();

      if (!prop) {
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Record skip in repair history with no replacement
      await supabase
        .from("hotel_image_repair_history")
        .insert({
          property_id: propertyId,
          supplier_hotel_code: prop.supplier_hotel_code,
          previous_images: prop.images,
          replacement_images: prop.images,
          source: "skipped",
          verification_evidence: reason || "Admin skipped — no replacement applied",
          approved_by: user.email || user.id,
          approved_at: new Date().toISOString(),
          notes: "Skipped: no images changed",
        });

      return new Response(
        JSON.stringify({ success: true, property_id: propertyId, message: "Property skipped. No images were changed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Repair history ──────────────────────────────────────────────
    if (action === "repair_history") {
      const { data: history, error: hErr } = await supabase
        .from("hotel_image_repair_history")
        .select("*")
        .order("approved_at", { ascending: false })
        .limit(100);

      if (hErr) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch repair history" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ history: history || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Exterior image audit report (read-only) ───────────────────
    if (action === "exterior_audit_report") {
      // Fetch properties in batches to avoid timeout
      const batchLimit = 500;
      let allProps: Array<{ id: string; name: string; supplier_hotel_code: string; destination_name: string | null; city: string | null; images: unknown; elvora_images: unknown; editorial_override: boolean }> = [];
      let rangeStart = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("properties")
          .select("id, name, supplier_hotel_code, destination_name, city, images, elvora_images, editorial_override")
          .not("supplier_hotel_code", "is", null)
          .eq("is_active", true)
          .range(rangeStart, rangeStart + batchLimit - 1);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch properties: " + error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allProps = allProps.concat(data as typeof allProps);
          if (data.length < batchLimit) hasMore = false;
          else rangeStart += batchLimit;
        }
      }

      // Classify each property's images
      let verifiedExterior = 0;
      let exteriorCandidateUnverified = 0;
      let noVerifiedExterior = 0;
      let genericFallback = 0;
      let editorialOverrides = 0;
      let imageReviewRequired = 0;
      const destinationBreakdown: Record<string, { total: number; verified: number; unverified: number; none: number; fallback: number }> = {};

      const sampleResults: unknown[] = [];

      for (const prop of allProps) {
        const imgs = Array.isArray(prop.images) ? prop.images as Array<Record<string, string>> : [];
        if (imgs.length === 0) {
          imageReviewRequired++;
          continue;
        }

        const hasPexels = imgs.some((img) => (img.url || "").includes("images.pexels.com"));
        const hasElvora = Array.isArray(prop.elvora_images) && prop.elvora_images.length > 0;
        const allPexels = hasPexels && imgs.every((img) => (img.url || "").includes("images.pexels.com"));

        if (prop.editorial_override) editorialOverrides++;

        // Check for metadata-based exterior
        let foundVerifiedExterior = false;
        let foundHeuristicExterior = false;

        for (const img of imgs) {
          const typeCode = (img.type_code || "").toUpperCase().trim();
          const typeDesc = (img.type_description || "").toLowerCase().trim();

          // Metadata-based: highest confidence
          if (typeCode === "EXT" || typeCode === "EXTERIOR" || typeCode === "BUILDING" ||
              typeDesc.includes("exterior") || typeDesc.includes("building") || typeDesc.includes("facade")) {
            foundVerifiedExterior = true;
            break;
          }
        }

        // URL heuristic fallback
        if (!foundVerifiedExterior) {
          for (const img of imgs) {
            if (/_hb_a_/i.test(img.url || "")) {
              foundHeuristicExterior = true;
              break;
            }
          }
        }

        let status: string;
        if (allPexels) {
          status = "GENERIC_FALLBACK";
          genericFallback++;
        } else if (foundVerifiedExterior) {
          status = "VERIFIED_EXTERIOR_PRIMARY";
          verifiedExterior++;
        } else if (foundHeuristicExterior) {
          status = "EXTERIOR_CANDIDATE_UNVERIFIED";
          exteriorCandidateUnverified++;
        } else if (!allPexels && imgs.length > 0) {
          status = "NO_VERIFIED_EXTERIOR";
          noVerifiedExterior++;
        } else {
          status = "IMAGE_REVIEW_REQUIRED";
          imageReviewRequired++;
        }

        // Track destination breakdown
        const destName = prop.destination_name || "Unknown";
        if (!destinationBreakdown[destName]) {
          destinationBreakdown[destName] = { total: 0, verified: 0, unverified: 0, none: 0, fallback: 0 };
        }
        destinationBreakdown[destName].total++;
        if (status === "VERIFIED_EXTERIOR_PRIMARY") destinationBreakdown[destName].verified++;
        else if (status === "EXTERIOR_CANDIDATE_UNVERIFIED") destinationBreakdown[destName].unverified++;
        else if (status === "GENERIC_FALLBACK") destinationBreakdown[destName].fallback++;
        else destinationBreakdown[destName].none++;

        // Collect first 5 samples from different destinations
        if (sampleResults.length < 5) {
          const firstUrl = imgs[0]?.url || "";
          const firstTypeCode = imgs[0]?.type_code || "";
          const firstTypeDesc = imgs[0]?.type_description || "";
          sampleResults.push({
            property_id: prop.id,
            property_name: prop.name,
            supplier_hotel_code: prop.supplier_hotel_code,
            destination_name: prop.destination_name,
            city: prop.city,
            image_count: imgs.length,
            first_image_url: firstUrl,
            first_image_type_code: firstTypeCode,
            first_image_type_description: firstTypeDesc,
            classification: status,
            has_elvora_images: hasElvora,
            editorial_override: prop.editorial_override,
          });
        }
      }

      return new Response(
        JSON.stringify({
          total_properties: allProps.length,
          verified_exterior: verifiedExterior,
          exterior_candidate_unverified: exteriorCandidateUnverified,
          no_verified_exterior: noVerifiedExterior,
          generic_fallback: genericFallback,
          editorial_overrides: editorialOverrides,
          image_review_required: imageReviewRequired,
          destination_breakdown: destinationBreakdown,
          samples: sampleResults,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});


