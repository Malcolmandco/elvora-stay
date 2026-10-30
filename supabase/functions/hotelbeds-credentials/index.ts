// Hotelbeds credential management — admin-only CRUD + connection testing.
// Never returns decrypted API keys or secrets to the browser.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import {
  buildHotelbedsHeaders,
  corsHeaders,
  getHotelbedsConfig,
  getHotelbedsCatalogConfig,
  TEST_BASE,
  PRODUCTION_BASE,
} from "../_shared/hotelbeds-config.ts";

interface CredentialRow {
  id: string;
  label: string;
  environment: string;
  purpose: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_capabilities: Record<string, boolean> | null;
  is_legacy: boolean;
  legacy_role: string | null;
  created_at: string;
}

interface CapabilityResult {
  contentApi: boolean;
  bookingApi: boolean;
  transfers: boolean;
}

interface TestResult {
  status: string;
  environment: string;
  host: string;
  httpStatus?: number;
  message?: string;
  capabilities?: CapabilityResult;
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

    // ─── List credentials ─────────────────────────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from("hotelbeds_credentials")
        .select("id, label, environment, purpose, is_active, last_tested_at, last_test_status, last_test_capabilities, is_legacy, legacy_role, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch credentials" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const dbCreds = (data || []) as CredentialRow[];

      // Synthesize virtual entries for env-var credentials so they appear
      // in the dropdown without requiring the admin to re-enter them.
      // Sentinel IDs "legacy-primary" and "legacy-catalog" are resolved
      // server-side in getHotelbedsCredentialById() — no secrets are
      // returned here, only metadata.
      const env = (Deno.env.get("HOTELBEDS_ENV") || "test").toLowerCase();
      const environment = env === "production" || env === "prod" ? "production" : "test";

      const legacyEntries: CredentialRow[] = [];

      const primaryKey =
        Deno.env.get("HOTELBEDS_PRIMARY_API_KEY") ||
        Deno.env.get("HOTELBEDS_API_KEY") ||
        "";
      const primarySecret =
        Deno.env.get("HOTELBEDS_PRIMARY_SECRET") ||
        Deno.env.get("HOTELBEDS_SECRET") ||
        "";
      if (primaryKey && primarySecret) {
        legacyEntries.push({
          id: "legacy-primary",
          label: "Hotelbeds Primary (Environment)",
          environment,
          purpose: "Availability, checkrate, booking, transfers, destinations",
          is_active: true,
          last_tested_at: null,
          last_test_status: null,
          last_test_capabilities: null,
          is_legacy: true,
          legacy_role: "primary",
          created_at: "1970-01-01T00:00:00Z",
        });
      }

      const catalogKey =
        Deno.env.get("HOTELBEDS_CATALOG_API_KEY") ||
        Deno.env.get("HOTELBEDS_TEST_API_KEY") ||
        "";
      const catalogSecret =
        Deno.env.get("HOTELBEDS_CATALOG_SECRET") ||
        Deno.env.get("HOTELBEDS_TEST_SECRET") ||
        "";
      if (catalogKey && catalogSecret) {
        // Only add catalog if it's different from primary
        const isDistinct = catalogKey !== primaryKey || catalogSecret !== primarySecret;
        if (isDistinct) {
          legacyEntries.push({
            id: "legacy-catalog",
            label: "Hotelbeds Catalog (Environment)",
            environment,
            purpose: "Content API sync only",
            is_active: true,
            last_tested_at: null,
            last_test_status: null,
            last_test_capabilities: null,
            is_legacy: true,
            legacy_role: "catalog",
            created_at: "1970-01-01T00:00:00.001Z",
          });
        }
      }

      // Legacy entries first, then DB accounts sorted by created_at
      const allCreds = [...legacyEntries, ...dbCreds];

      return new Response(
        JSON.stringify({ credentials: allCreds }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Create credential ────────────────────────────────────────────
    if (action === "create") {
      const { label, environment, apiKey, apiSecret, purpose } = body;

      if (!label || !apiKey || !apiSecret) {
        return new Response(
          JSON.stringify({ error: "Label, API key, and API secret are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: newId, error: createError } = await supabase
        .rpc("upsert_hotelbeds_credential", {
          p_enc_key: serviceKey,
          p_label: label,
          p_environment: environment || "test",
          p_api_key: apiKey,
          p_api_secret: apiSecret,
          p_purpose: purpose || null,
        });

      if (createError || !newId) {
        return new Response(
          JSON.stringify({ error: "Failed to create credential" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ id: newId, created: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Update credential ────────────────────────────────────────────
    if (action === "update") {
      const { id, label, environment, apiKey, apiSecret, purpose } = body;

      if (!id || !label) {
        return new Response(
          JSON.stringify({ error: "ID and label are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // If new credentials are provided, update everything via the encrypt function
      if (apiKey && apiSecret) {
        const { error: updateError } = await supabase
          .rpc("upsert_hotelbeds_credential", {
            p_enc_key: serviceKey,
            p_id: id,
            p_label: label,
            p_environment: environment || "test",
            p_api_key: apiKey,
            p_api_secret: apiSecret,
            p_purpose: purpose || null,
          });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to update credential" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        // Only update non-secret fields
        const { error: updateError } = await supabase
          .from("hotelbeds_credentials")
          .update({
            label,
            environment: environment || "test",
            purpose: purpose || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to update credential" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      return new Response(
        JSON.stringify({ id, updated: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Delete credential ────────────────────────────────────────────
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(
          JSON.stringify({ error: "ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: deleteError } = await supabase
        .from("hotelbeds_credentials")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to delete credential" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ deleted: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Toggle active/inactive ───────────────────────────────────────
    if (action === "toggle") {
      const { id, isActive } = body;
      if (!id) {
        return new Response(
          JSON.stringify({ error: "ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: toggleError } = await supabase
        .from("hotelbeds_credentials")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (toggleError) {
        return new Response(
          JSON.stringify({ error: "Failed to toggle credential" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ id, isActive }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Test connection ──────────────────────────────────────────────
    if (action === "test") {
      const { id } = body;
      if (!id) {
        return new Response(
          JSON.stringify({ error: "ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Handle legacy env-var credentials (no DB row to decrypt)
      if (id === "legacy-primary" || id === "legacy-catalog") {
        const config = id === "legacy-primary"
          ? getHotelbedsConfig()
          : getHotelbedsCatalogConfig();

        if (!config.apiKey || !config.secret) {
          return new Response(
            JSON.stringify({ error: "Credential not found or inactive" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        let host: string;
        try { host = new URL(config.baseUrl).host; } catch { host = config.baseUrl; }

        const result = await testCredentialCapabilities(
          config.apiKey,
          config.secret,
          config.baseUrl,
          config.environment,
        );

        return new Response(
          JSON.stringify({ ...result, host }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Decrypt credentials via SECURITY DEFINER function
      const { data: credData, error: credError } = await supabase
        .rpc("get_hotelbeds_credential_secrets", {
          p_enc_key: serviceKey,
          p_id: id,
        });

      if (credError || !credData || credData.length === 0) {
        return new Response(
          JSON.stringify({ error: "Credential not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cred = credData[0];
      const baseUrl = cred.environment === "production" ? PRODUCTION_BASE : TEST_BASE;
      let host: string;
      try { host = new URL(baseUrl).host; } catch { host = baseUrl; }

      const result = await testCredentialCapabilities(
        cred.api_key,
        cred.api_secret,
        baseUrl,
        cred.environment,
      );

      // Update the credential record with test results
      await supabase
        .from("hotelbeds_credentials")
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: result.status,
          last_test_capabilities: result.capabilities || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({ ...result, host }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Credential request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Test what APIs this credential can access ──────────────────────────

async function testCredentialCapabilities(
  apiKey: string,
  secret: string,
  baseUrl: string,
  environment: string,
): Promise<TestResult> {
  const capabilities: CapabilityResult = {
    contentApi: false,
    bookingApi: false,
    transfers: false,
  };

  try {
    const headers = await buildHotelbedsHeaders(apiKey, secret);

    // Test Content API
    try {
      const contentRes = await fetch(
        `${baseUrl}/hotel-content-api/1.0/locations/countries`,
        { method: "GET", headers },
      );
      if (contentRes.ok) {
        capabilities.contentApi = true;
      } else if (contentRes.status === 401) {
        return {
          status: "auth_failed",
          environment,
          host: baseUrl,
          httpStatus: 401,
          message: "Authentication failed — check API key and secret",
        };
      } else if (contentRes.status === 429) {
        return {
          status: "quota_rate_limit",
          environment,
          host: baseUrl,
          httpStatus: 429,
          message: "Quota or rate limit exceeded",
        };
      }
    } catch { /* content API unreachable */ }

    // Test Booking API (status endpoint)
    try {
      const bookingRes = await fetch(
        `${baseUrl}/hotel-api/1.0/status`,
        { method: "GET", headers },
      );
      if (bookingRes.ok) {
        capabilities.bookingApi = true;
      }
    } catch { /* booking API unreachable */ }

    // Test Transfers API
    try {
      const transfersRes = await fetch(
        `${baseUrl}/transfer-api/1.0/status`,
        { method: "GET", headers },
      );
      if (transfersRes.ok) {
        capabilities.transfers = true;
      }
    } catch { /* transfers API unreachable */ }

    const anyConnected = capabilities.contentApi || capabilities.bookingApi || capabilities.transfers;

    return {
      status: anyConnected ? "connected" : "auth_failed",
      environment,
      host: baseUrl,
      httpStatus: 200,
      message: anyConnected
        ? "Connection successful"
        : "Could not access any Hotelbeds API with these credentials",
      capabilities,
    };
  } catch {
    return {
      status: "network_error",
      environment,
      host: baseUrl,
      message: "Network error — unable to reach Hotelbeds API",
    };
  }
}

