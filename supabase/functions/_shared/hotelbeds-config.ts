// Shared Hotelbeds credential and configuration module.
// Supports two modes:
//
//   1. LEGACY — env-var credentials (HOTELBEDS_PRIMARY_*, HOTELBEDS_CATALOG_*).
//      Still the fallback for all existing functions.
//
//   2. MULTI-ACCOUNT — credentials stored encrypted in the hotelbeds_credentials
//      table. An admin selects a credential ID in the UI; the edge function
//      calls getHotelbedsCredentialById() to decrypt and use it.
//
// No credential values are ever exposed to the client.

import { createClient } from "npm:@supabase/supabase-js@2.58.0";

export type HotelbedsEnvironment = "test" | "production";

export interface HotelbedsCredentials {
  apiKey: string;
  secret: string;
  baseUrl: string;
  environment: HotelbedsEnvironment;
}

export const TEST_BASE = "https://api.test.hotelbeds.com";
export const PRODUCTION_BASE = "https://api.hotelbeds.com";

function getBaseUrl(): string {
  const env = (Deno.env.get("HOTELBEDS_ENV") || "test").toLowerCase();
  return env === "production" || env === "prod" ? PRODUCTION_BASE : TEST_BASE;
}

function getEnvironment(): HotelbedsEnvironment {
  const env = (Deno.env.get("HOTELBEDS_ENV") || "test").toLowerCase();
  return env === "production" || env === "prod" ? "production" : "test";
}

/** Primary credentials — availability, checkrate, booking, transfers, destinations. */
export function getHotelbedsConfig(): HotelbedsCredentials {
  const baseUrl = getBaseUrl();
  const environment = getEnvironment();

  const apiKey =
    Deno.env.get("HOTELBEDS_PRIMARY_API_KEY") ||
    Deno.env.get("HOTELBEDS_API_KEY") ||
    "";
  const secret =
    Deno.env.get("HOTELBEDS_PRIMARY_SECRET") ||
    Deno.env.get("HOTELBEDS_SECRET") ||
    "";

  return { apiKey, secret, baseUrl, environment };
}

/** Catalog credentials — Content API sync only. */
export function getHotelbedsCatalogConfig(): HotelbedsCredentials {
  const baseUrl = getBaseUrl();
  const environment = getEnvironment();

  const apiKey =
    Deno.env.get("HOTELBEDS_CATALOG_API_KEY") ||
    Deno.env.get("HOTELBEDS_TEST_API_KEY") ||
    "";
  const secret =
    Deno.env.get("HOTELBEDS_CATALOG_SECRET") ||
    Deno.env.get("HOTELBEDS_TEST_SECRET") ||
    "";

  // If catalog credentials are not set, fall back to primary
  if (!apiKey || !secret) {
    return getHotelbedsConfig();
  }

  return { apiKey, secret, baseUrl, environment };
}

export function hasHotelbedsCredentials(): boolean {
  const { apiKey, secret } = getHotelbedsConfig();
  return !!(apiKey && secret);
}

export function hasHotelbedsCatalogCredentials(): boolean {
  const { apiKey, secret } = getHotelbedsCatalogConfig();
  return !!(apiKey && secret);
}

// ─── Multi-account credential lookup ────────────────────────────────────
// Loads an encrypted credential from the database, decrypts it server-side,
// and returns a HotelbedsCredentials object. Only callable from edge functions
// (uses the service role key). Returns null if not found or inactive.

export async function getHotelbedsCredentialById(
  credentialId: string,
): Promise<HotelbedsCredentials | null> {
  // Legacy sentinel IDs — resolve from env vars, no DB lookup needed
  if (credentialId === "legacy-primary") {
    const config = getHotelbedsConfig();
    if (!config.apiKey || !config.secret) return null;
    return config;
  }
  if (credentialId === "legacy-catalog") {
    const config = getHotelbedsCatalogConfig();
    if (!config.apiKey || !config.secret) return null;
    return config;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encKey = serviceKey; // Use service role key as the PGP encryption key

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .rpc("get_hotelbeds_credential_secrets", {
      p_enc_key: encKey,
      p_id: credentialId,
    });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  const baseUrl = row.environment === "production" ? PRODUCTION_BASE : TEST_BASE;

  return {
    apiKey: row.api_key,
    secret: row.api_secret,
    baseUrl,
    environment: row.environment as HotelbedsEnvironment,
  };
}

export async function buildSignature(
  apiKey: string,
  secret: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const toHash = apiKey + secret + timestamp;
  const data = new TextEncoder().encode(toHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildHotelbedsHeaders(
  apiKey: string,
  secret: string,
): Promise<Record<string, string>> {
  return {
    "Api-key": apiKey,
    "X-Signature": await buildSignature(apiKey, secret),
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};


