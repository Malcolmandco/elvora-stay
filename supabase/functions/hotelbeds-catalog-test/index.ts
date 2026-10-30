// Minimal Hotelbeds Content API capability test for the catalog account.
// Makes ONE small request to verify authentication, Content API access,
// quota, and response structure. Does NOT import anything.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getHotelbedsCatalogConfig,
  buildHotelbedsHeaders,
  corsHeaders,
} from "../_shared/hotelbeds-config.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, secret, baseUrl, environment } = getHotelbedsCatalogConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          contentApiAccess: false,
          error: "Catalog credentials not configured.",
          environment,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const headers = await buildHotelbedsHeaders(apiKey, secret);

    // Minimal request: fetch 5 hotels for a small destination (LIS - Lisbon)
    const testDest = "LIS";
    const url = `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&destinationCode=${testDest}&language=ENG&from=1&to=5`;

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers });
    } catch (err) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          contentApiAccess: false,
          error: `Network error: ${(err as Error).message}`,
          environment,
          host: new URL(baseUrl).host,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const httpStatus = response.status;

    if (response.status === 403 || response.status === 429) {
      const rawBody = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({
          authenticated: false,
          contentApiAccess: false,
          quotaExceeded: true,
          httpStatus,
          error: `Access denied or quota exceeded (HTTP ${response.status}).`,
          responseSnippet: rawBody.substring(0, 200),
          environment,
          host: new URL(baseUrl).host,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errorMsg = `HTTP ${response.status}`;
      try {
        const j = JSON.parse(errText);
        errorMsg = j?.error?.message || j?.message || errorMsg;
      } catch { /* keep default */ }

      return new Response(
        JSON.stringify({
          authenticated: response.status !== 401,
          contentApiAccess: false,
          httpStatus,
          error: errorMsg,
          environment,
          host: new URL(baseUrl).host,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
    const total = data?.total || 0;

    // Inspect first hotel for content structure
    const sample = hotels.length > 0 ? hotels[0] : null;
    const hasContent = !!(
      sample &&
      sample.code &&
      sample.name?.content &&
      (sample.images?.length > 0 || sample.description?.content || sample.coordinates)
    );

    const sampleFields: Record<string, boolean> = {
      code: !!sample?.code,
      name: !!sample?.name?.content,
      description: !!sample?.description?.content,
      country: !!sample?.country?.code,
      city: !!sample?.city?.content,
      address: !!sample?.address?.content,
      coordinates: !!(sample?.coordinates?.latitude && sample?.coordinates?.longitude),
      category: !!sample?.category?.code,
      images: !!(sample?.images?.length > 0),
      facilities: !!(sample?.facilities?.length > 0),
      destinationCode: !!sample?.destinationCode,
    };

    return new Response(
      JSON.stringify({
        authenticated: true,
        contentApiAccess: true,
        quotaExceeded: false,
        httpStatus,
        environment,
        host: new URL(baseUrl).host,
        testDestination: testDest,
        totalHotelsAvailable: total,
        hotelsReturned: hotels.length,
        hasRealContent: hasContent,
        sampleFields,
        sampleHotel: sample
          ? {
              code: sample.code,
              name: sample.name?.content || "",
              city: sample.city?.content || "",
              country: sample.country?.code || "",
              category: sample.category?.code || "",
              imageCount: sample.images?.length || 0,
              hasDescription: !!sample.description?.content,
              hasCoordinates: !!(sample.coordinates?.latitude && sample.coordinates?.longitude),
            }
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        contentApiAccess: false,
        error: (err as Error).message || "Test failed unexpectedly.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
