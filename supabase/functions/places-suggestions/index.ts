import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";

    if (query.trim().length < 2) {
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const duffelToken = Deno.env.get("DUFFEL_ACCESS_TOKEN");

    if (!duffelToken) {
      return new Response(
        JSON.stringify({ error: "Airport search is temporarily unavailable. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const duffelResponse = await fetch(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${duffelToken}`,
          "Duffel-Version": "v2",
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
        },
      },
    );

    if (!duffelResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Airport search is temporarily unavailable. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const duffelData = await duffelResponse.json();
    const places = duffelData.data || [];

    return new Response(
      JSON.stringify({ data: places }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Airport search is temporarily unavailable. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
