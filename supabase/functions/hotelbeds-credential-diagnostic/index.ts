// Safe credential configuration diagnostics.
// Reports whether primary and catalog credentials are configured,
// whether catalog is falling back to primary, which environment is active,
// and whether separate credential values exist — WITHOUT making any API
// request or exposing any secret values.
//
// verify_jwt = true (admin only)

import {
  getHotelbedsConfig,
  getHotelbedsCatalogConfig,
  corsHeaders,
} from "../_shared/hotelbeds-config.ts";

interface DiagnosticResult {
  primary: {
    configured: boolean;
    environment: string;
    host: string;
  };
  catalog: {
    configured: boolean;
    environment: string;
    host: string;
    fallingBackToPrimary: boolean;
  };
  sharedEnvironment: boolean;
  separateCredentialValues: boolean;
  // Never includes actual key/secret values, hashes, or fragments
  summary: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Only respond to GET for safety — no mutations possible
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Only GET is supported" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const primary = getHotelbedsConfig();
  const catalog = getHotelbedsCatalogConfig();

  const primaryConfigured = !!(primary.apiKey && primary.secret);
  const catalogConfigured = !!(catalog.apiKey && catalog.secret);

  // Determine if catalog fell back to primary:
  // getHotelbedsCatalogConfig() returns primary config when catalog env vars are absent.
  // We detect this by checking whether the catalog-specific env vars exist.
  const catalogEnvKey = Deno.env.get("HOTELBEDS_CATALOG_API_KEY") || Deno.env.get("HOTELBEDS_TEST_API_KEY");
  const catalogEnvSecret = Deno.env.get("HOTELBEDS_CATALOG_SECRET") || Deno.env.get("HOTELBEDS_TEST_SECRET");
  const catalogEnvVarsExist = !!(catalogEnvKey && catalogEnvSecret);
  const fallingBackToPrimary = catalogConfigured && !catalogEnvVarsExist;

  // Check if the resolved credential values are distinct.
  // We only report a boolean — never the values themselves.
  const separateCredentialValues = primaryConfigured && catalogConfigured &&
    (primary.apiKey !== catalog.apiKey || primary.secret !== catalog.secret);

  const sharedEnvironment = primary.environment === catalog.environment;

  let host = "unknown";
  try {
    host = new URL(primary.baseUrl).host;
  } catch {
    host = primary.baseUrl;
  }

  const parts: string[] = [];
  if (primaryConfigured) {
    parts.push(`Primary credentials are configured (${primary.environment} environment).`);
  } else {
    parts.push("Primary credentials are NOT configured.");
  }
  if (catalogConfigured) {
    if (fallingBackToPrimary) {
      parts.push("Catalog credentials are NOT independently configured — falling back to primary credentials.");
    } else {
      parts.push(`Catalog credentials are independently configured (${catalog.environment} environment).`);
    }
  } else {
    parts.push("Catalog credentials are NOT configured.");
  }
  if (separateCredentialValues) {
    parts.push("Primary and catalog use distinct credential values.");
  } else if (primaryConfigured && catalogConfigured) {
    parts.push("Primary and catalog use the same credential values.");
  }
  if (sharedEnvironment) {
    parts.push(`Both roles target the ${primary.environment} environment (${host}).`);
  } else {
    parts.push(`Primary targets ${primary.environment}, catalog targets ${catalog.environment}.`);
  }

  const result: DiagnosticResult = {
    primary: {
      configured: primaryConfigured,
      environment: primary.environment,
      host,
    },
    catalog: {
      configured: catalogConfigured,
      environment: catalog.environment,
      host: host,
      fallingBackToPrimary,
    },
    sharedEnvironment,
    separateCredentialValues,
    summary: parts.join(" "),
  };

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
