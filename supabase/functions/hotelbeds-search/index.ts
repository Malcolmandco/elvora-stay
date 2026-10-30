import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

interface AvailabilityRequest {
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childrenAges: number[];
}

interface NormalizedResult {
  supplier: string;
  supplierHotelCode: string;
  hotelName: string;
  category: string;
  categoryCode: string;
  destinationCode: string;
  destinationName: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  images: Array<{ url: string; typeCode: string; typeDescription?: string }>;
  description: string;
  amenities: string[];
  roomName: string;
  boardName: string;
  boardCode: string;
  rateKey: string;
  rateType: string;
  paymentType: string;
  price: number;
  netPrice: number;
  currency: string;
  cancellationPolicies: Array<{ amount: number; currency: string; fromDate: string; amountType: string }>;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  availability: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: AvailabilityRequest = await req.json();
    const { destinationCode, checkIn, checkOut, rooms, adults, children, childrenAges } = body;

    if (!destinationCode || !checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: "destinationCode, checkIn, and checkOut are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { apiKey, secret, baseUrl } = getHotelbedsConfig();

    if (!apiKey || !secret) {
      return new Response(
        JSON.stringify({ error: "Live stay search is currently unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = await buildHotelbedsHeaders(apiKey, secret);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const occupancy: Record<string, unknown> = {
      rooms: rooms || 1,
      adults: adults || 2,
      children: children || 0,
    };
    if (children > 0 && childrenAges.length > 0) {
      occupancy.childrenAges = childrenAges;
    }

    const requestBody: Record<string, unknown> = {
      stay: {
        checkIn,
        checkOut,
      },
      occupancies: [occupancy],
      destination: {
        code: destinationCode.toUpperCase(),
      },
    };

    const availResponse = await fetch(`${baseUrl}/hotel-api/1.0/hotels`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!availResponse.ok) {
      const errText = await availResponse.text().catch(() => "");
      let debugMsg = `status_${availResponse.status}`;
      try { const j = JSON.parse(errText); debugMsg = j?.error?.message || j?.message || debugMsg; } catch { /* keep default */ }
      return new Response(
        JSON.stringify({ error: "Live stay search is currently unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const availData = await availResponse.json();
    const hotels = availData?.hotel?.hotels || [];

    if (hotels.length === 0) {
      return new Response(
        JSON.stringify({ results: [], total: 0, currency: "USD" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hotelCodes = hotels.map((h: any) => String(h.code));
    const currency = hotels[0]?.currency || availData?.hotel?.currency || "USD";

    // ── Local DB lookup for content (primary source) ──────────────────────
    // Query our properties table for hotel codes returned by the availability API.
    // This avoids unnecessary Content API calls and quota consumption.
    let localContentMap: Record<string, any> = {};
    try {
      const { data: localProps } = await supabase
        .from("properties")
        .select("id, name, slug, long_description, address, latitude, longitude, rating, images, amenities, city, country, destination_name, supplier_hotel_code")
        .eq("supplier_name", "hotelbeds")
        .in("supplier_hotel_code", hotelCodes);

      if (localProps) {
        for (const prop of localProps) {
          if (prop.supplier_hotel_code) {
            localContentMap[prop.supplier_hotel_code] = prop;
          }
        }
      }
    } catch {
      // Local DB lookup failed — fall back to Content API below
    }

    // ── Content API fallback (only for hotels not found in local DB) ──────
    const missingCodes = hotelCodes.filter((code: string) => !localContentMap[code]);

    let contentMap: Record<string, any> = {};
    if (missingCodes.length > 0) {
      try {
        const contentResponse = await fetch(
          `${baseUrl}/hotel-content-api/1.0/hotels?fields=all&codes=${missingCodes.join(",")}&language=ENG&from=1&to=${missingCodes.length}`,
          { method: "GET", headers },
        );

        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          const contentHotels = contentData?.hotels?.hotels || [];
          for (const ch of contentHotels) {
            contentMap[ch.code] = ch;
          }
        }
      } catch {
        // Content fetch failed — continue with availability data only
      }
    }

    const results: NormalizedResult[] = [];

    for (const hotel of hotels) {
      const hotelCodeStr = String(hotel.code);
      const localProp = localContentMap[hotelCodeStr];
      const content = contentMap[hotel.code];

      // Prefer local DB data, then Content API, then availability data
      const hotelImages = (() => {
        if (localProp?.images && Array.isArray(localProp.images) && localProp.images.length > 0) {
          return localProp.images.slice(0, 5).map((img: any) => ({
            url: img.url || img.path || "",
            typeCode: img.typeCode || "",
            typeDescription: img.alt || img.typeDescription || "",
          })).filter((img: any) => img.url);
        }
        if (content?.images) {
          return (content.images || []).slice(0, 5).map((img: any) => ({
            url: img.path || "",
            typeCode: img.typeCode || "",
            typeDescription: img.typeDescription || "",
          })).filter((img: any) => img.url);
        }
        return (hotel.images || []).slice(0, 5).map((img: any) => ({
          url: img.path || "",
          typeCode: img.typeCode || "",
          typeDescription: img.typeDescription || "",
        })).filter((img: any) => img.url);
      })();

      const description = localProp?.long_description || content?.description?.content || "";
      const address = localProp?.address || content?.address?.content || "";
      const amenities: string[] = localProp?.amenities || (content?.facilities || []).map((f: any) => f?.description?.content || f?.name || "").filter((s: string) => s);
      const latitude = localProp?.latitude || content?.coordinates?.latitude || hotel.latitude || null;
      const longitude = localProp?.longitude || content?.coordinates?.longitude || hotel.longitude || null;
      const categoryName = content?.category?.name?.content || hotel.categoryName || "";
      const categoryCode = content?.categoryCode || hotel.categoryCode || "";
      const hotelName = localProp?.name || content?.name?.content || hotel.name || `Hotel ${hotel.code}`;

      const hotelRooms = hotel.rooms || [];
      for (const room of hotelRooms) {
        const rates = room.rates || [];
        for (const rate of rates) {
          const cancellationPolicies = (rate.cancellationPolicies || []).map((cp: any) => ({
            amount: cp.amount || 0,
            currency: rate.currency || currency,
            fromDate: cp.from || "",
            amountType: cp.amountType || "AMOUNT",
          }));

          results.push({
            supplier: "hotelbeds",
            supplierHotelCode: hotelCodeStr,
            hotelName,
            category: categoryName,
            categoryCode,
            destinationCode: hotel.destinationCode || destinationCode,
            destinationName: localProp?.destination_name || hotel.destinationName || "",
            address,
            latitude: latitude ? String(latitude) : null,
            longitude: longitude ? String(longitude) : null,
            images: hotelImages,
            description,
            amenities,
            roomName: room.name || "Standard Room",
            boardName: rate.boardName || "Room only",
            boardCode: rate.boardCode || "",
            rateKey: rate.rateKey || "",
            rateType: rate.rateType || "BOOKABLE",
            paymentType: rate.paymentType || "AT_HOTEL",
            price: rate.sellingRate || rate.net || 0,
            netPrice: rate.net || 0,
            currency: rate.currency || currency,
            cancellationPolicies,
            checkIn,
            checkOut,
            rooms: rate.rooms || rooms || 1,
            adults: rate.adults || adults || 2,
            children: rate.children || children || 0,
            availability: "AVAILABLE",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ results, total: results.length, currency }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Live stay search is currently unavailable. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
