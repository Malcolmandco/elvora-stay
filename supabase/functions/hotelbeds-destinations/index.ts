// Hotelbeds destination autocomplete - public, no JWT required
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

interface DestinationSuggestion {
  type: "destination";
  name: string;
  country: string;
  countryCode: string;
  destinationCode: string;
  displayName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";

    if (query.trim().length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { apiKey, secret, baseUrl } = getHotelbedsConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({ suggestions: [], error: "Destination search is currently unavailable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = await buildHotelbedsHeaders(apiKey, secret);

    const response = await fetch(
      `${baseUrl}/hotel-content-api/1.0/locations/destinations?fields=all&countryCodes=ALL&destinationCodes=&name=${encodeURIComponent(query)}&language=ENG&from=1&to=20`,
      { method: "GET", headers },
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ suggestions: [], error: "Destination search is currently unavailable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const destinations = data?.destinations || [];

    const suggestions: DestinationSuggestion[] = destinations.map((d: any) => ({
      type: "destination" as const,
      name: d.name?.content || d.name || "",
      country: d.country?.name?.content || d.country?.description || "",
      countryCode: d.countryCode || "",
      destinationCode: d.code || "",
      displayName: `${d.name?.content || d.name || ""}${d.country?.name?.content ? ", " + d.country.name.content : ""}`,
    }));

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ suggestions: [], error: "Destination search is currently unavailable." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
