// Hotelbeds rate validation - public, no JWT required
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

interface CheckRateRequest {
  rateKey: string;
}

interface CheckRateResponse {
  valid: boolean;
  hotel?: Record<string, unknown>;
  rooms?: Array<Record<string, unknown>>;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: CheckRateRequest = await req.json();
    const { rateKey } = body;

    if (!rateKey) {
      return new Response(
        JSON.stringify({ valid: false, error: "rateKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { apiKey, secret, baseUrl } = getHotelbedsConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({ valid: false, error: "Rate check is currently unavailable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = await buildHotelbedsHeaders(apiKey, secret);

    const requestBody = {
      rooms: [
        {
          rateKey,
        },
      ],
    };

    const response = await fetch(`${baseUrl}/hotel-api/1.0/checkrates`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: false, error: "We're having trouble loading live availability right now. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const hotel = data?.hotel;
    const rooms = hotel?.rooms || [];

    const result: CheckRateResponse = {
      valid: true,
      hotel,
      rooms,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: "We're having trouble loading live availability right now. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
