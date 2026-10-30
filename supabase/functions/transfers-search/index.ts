import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

// Hotelbeds uses a two-step process:
// 1. Get an access token (or use API key + secret signature)
// 2. Search for transfer availability

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const airport = url.searchParams.get("airport") || "";
    const destination = url.searchParams.get("destination") || "";
    const date = url.searchParams.get("date") || "";
    const time = url.searchParams.get("time") || "";
    const pax = url.searchParams.get("pax") || "1";
    const luggage = url.searchParams.get("luggage") || "1";
    const transferType = url.searchParams.get("transferType") || "private";

    const { apiKey, secret, baseUrl } = getHotelbedsConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({
          error: "Hotelbeds Transfers API not configured. Credentials are required.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = await buildHotelbedsHeaders(apiKey, secret);

    // Search for transfer availability
    const requestBody = {
      pickup: {
        type: "airport",
        iata: airport.toUpperCase(),
      },
      destination: {
        type: "hotel",
        name: destination,
      },
      date,
      time,
      pax: parseInt(pax, 10),
      luggage: parseInt(luggage, 10),
      transferType,
    };

    const hbResponse = await fetch(`${baseUrl}/transfers/availability`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!hbResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Hotelbeds API error: ${hbResponse.status}` }),
        { status: hbResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hbData = await hbResponse.json();
    const transfers = hbData.transfers || hbData.availability || [];

    const results = transfers.map((tr: any) => ({
      id: tr.id || tr.code,
      vehicleType: tr.vehicle?.type || tr.vehicleType || "Vehicle",
      provider: tr.provider || tr.supplier?.name || "Provider",
      transferType: tr.transferType || transferType,
      passengerCapacity: tr.vehicle?.maxPax || tr.passengerCapacity || 4,
      luggageCapacity: tr.vehicle?.maxLuggage || tr.luggageCapacity || 2,
      pickup: airport,
      destination,
      price: tr.totalAmount || tr.price || 0,
      currency: tr.currency || "USD",
      cancellationPolicy: tr.cancellationPolicy || "See terms",
    }));

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
