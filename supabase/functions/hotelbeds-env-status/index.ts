// Returns non-sensitive Hotelbeds environment info and connection test results.
// No credentials are ever exposed — only status indicators and safe error messages.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getHotelbedsConfig,
  getHotelbedsCatalogConfig,
  hasHotelbedsCredentials,
  hasHotelbedsCatalogCredentials,
  buildHotelbedsHeaders,
  corsHeaders,
} from "../_shared/hotelbeds-config.ts";

type ConnectionStatus =
  | "connected"
  | "not_configured"
  | "auth_failed"
  | "permission_denied"
  | "quota_rate_limit"
  | "network_error"
  | "configuration_error";

interface CredentialTest {
  configured: boolean;
  status: ConnectionStatus;
  environment: string;
  host: string;
  httpStatus?: number;
  message?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";

  // ─── Status only (no API call) ─────────────────────────────────────
  if (action === "status") {
    const primary = getHotelbedsConfig();
    const catalog = getHotelbedsCatalogConfig();

    let host: string;
    try {
      host = new URL(primary.baseUrl).host;
    } catch {
      host = primary.baseUrl;
    }

    return new Response(
      JSON.stringify({
        environment: primary.environment,
        host,
        primaryConfigured: hasHotelbedsCredentials(),
        catalogConfigured: hasHotelbedsCatalogCredentials(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── Test Primary Connection ───────────────────────────────────────
  if (action === "test_primary") {
    const result = await testCredentialConnection("primary");
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── Test Catalog Connection ───────────────────────────────────────
  if (action === "test_catalog") {
    const result = await testCredentialConnection("catalog");
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ error: "Unknown action" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function testCredentialConnection(credentialType: "primary" | "catalog"): Promise<CredentialTest> {
  const creds = credentialType === "primary"
    ? getHotelbedsConfig()
    : getHotelbedsCatalogConfig();

  const environment = creds.environment;
  let host: string;
  try {
    host = new URL(creds.baseUrl).host;
  } catch {
    host = creds.baseUrl;
  }

  if (!creds.apiKey || !creds.secret) {
    return {
      configured: false,
      status: "not_configured",
      environment,
      host,
      message: `${credentialType} credentials are not configured`,
    };
  }

  try {
    const headers = await buildHotelbedsHeaders(creds.apiKey, creds.secret);

    // Use a minimal status endpoint — the hotelbeds status API
    // For primary: use the status endpoint
    // For catalog: use a minimal content API call
    const endpoint = credentialType === "primary"
      ? `${creds.baseUrl}/hotel-api/1.0/status`
      : `${creds.baseUrl}/hotel-content-api/1.0/locations/countries`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      return {
        configured: true,
        status: "connected",
        environment,
        host,
        httpStatus: response.status,
        message: "Connection successful",
      };
    }

    if (response.status === 401 || response.status === 403) {
      // Distinguish auth failure from permission denial
      const body = await response.text().catch(() => "");
      const isAuth = response.status === 401 || body.includes("Invalid") || body.includes("authentication");
      return {
        configured: true,
        status: isAuth ? "auth_failed" : "permission_denied",
        environment,
        host,
        httpStatus: response.status,
        message: isAuth
          ? "Authentication failed — check API key and secret"
          : "Permission denied — this account lacks access to this endpoint",
      };
    }

    if (response.status === 429) {
      return {
        configured: true,
        status: "quota_rate_limit",
        environment,
        host,
        httpStatus: 429,
        message: "Quota or rate limit exceeded",
      };
    }

    return {
      configured: true,
      status: "network_error",
      environment,
      host,
      httpStatus: response.status,
      message: `Unexpected HTTP ${response.status}`,
    };
  } catch {
    return {
      configured: true,
      status: "network_error",
      environment,
      host,
      message: "Network error — unable to reach Hotelbeds API",
    };
  }
}
