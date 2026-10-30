import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

interface AvailabilityRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { propertyId, checkIn, checkOut, guests, rooms } =
      (await req.json()) as AvailabilityRequest;

    if (!propertyId || !checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: "propertyId, checkIn, and checkOut are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, name, slug, city, country, destination_name, currency, supplier_name, supplier_hotel_code")
      .eq("id", propertyId)
      .maybeSingle();

    if (propError) throw propError;

    if (!property) {
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Route to the correct supplier based on supplier_name
    if (property.supplier_name === "hotelbeds" && property.supplier_hotel_code) {
      return await checkHotelbedsAvailability(property, checkIn, checkOut, guests, rooms);
    }

    // Fall back to Duffel for non-Hotelbeds properties
    return await checkDuffelAvailability(property, checkIn, checkOut, guests, rooms);
  } catch (err) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "internal_error",
        message: "Live stay availability is currently unavailable.",
        rooms: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Hotelbeds availability ──────────────────────────────────────────────

async function checkHotelbedsAvailability(
  property: { id: string; name: string; city: string; country: string; currency: string; supplier_hotel_code: string },
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number,
): Promise<Response> {
  const { apiKey, secret, baseUrl } = getHotelbedsConfig();

  if (!apiKey || !secret) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "supplier_not_configured",
        message: "Live stay availability is currently unavailable.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headers = await buildHotelbedsHeaders(apiKey, secret);
  const hotelCode = parseInt(property.supplier_hotel_code, 10);

  const requestBody = {
    stay: { checkIn, checkOut },
    occupancies: [
      {
        rooms: rooms || 1,
        adults: guests || 2,
        children: 0,
      },
    ],
    hotels: { hotel: [hotelCode] },
  };

  let availResponse: Response;
  try {
    availResponse = await fetch(`${baseUrl}/hotel-api/1.0/hotels`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "supplier_error",
        message: "Live stay availability is currently unavailable for this property.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!availResponse.ok) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "supplier_error",
        message: "Live stay availability is currently unavailable for this property.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const availData = await availResponse.json();
  const hotels = availData?.hotel?.hotels || [];

  if (hotels.length === 0) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "no_availability",
        message: "No rooms are currently available for the selected dates.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const hotel = hotels[0];
  const hotelRooms = hotel.rooms || [];
  const currency = hotel.currency || availData?.hotel?.currency || property.currency || "USD";

  const mappedRooms = [];

  for (const room of hotelRooms) {
    const rates = room.rates || [];
    for (const rate of rates) {
      const cancellationPolicies = (rate.cancellationPolicies || []).map((cp: any) => {
        const amount = cp.amount || 0;
        const cur = rate.currency || currency;
        const fromDate = cp.from || "";
        const amountType = cp.amountType || "AMOUNT";
        if (amountType === "AMOUNT") {
          return `${amount} ${cur} cancellation fee applies if cancelled after ${fromDate}.`;
        } else if (amountType === "PERCENTAGE") {
          return `${amount}% cancellation fee applies if cancelled after ${fromDate}.`;
        }
        return `Cancellation fee applies if cancelled after ${fromDate}.`;
      }).join(" ");

      const cancellationText = cancellationPolicies || "Cancellation policy available at checkout";
      const rateKey = rate.rateKey || "";
      const boardName = rate.boardName || "Room only";
      const roomName = room.name || "Standard Room";
      const price = rate.sellingRate || rate.net || 0;
      const netPrice = rate.net || 0;
      const taxes = Math.max(0, price - netPrice);

      mappedRooms.push({
        roomId: `${room.code || roomName}-${rate.rateKey || ""}`.substring(0, 100),
        roomName,
        rateId: rateKey,
        supplierOfferId: rateKey,
        mealPlan: boardName,
        cancellationPolicy: cancellationText,
        maxGuests: guests,
        bedType: room.roomCharacteristics?.bedType || "Standard",
        currency: rate.currency || currency,
        pricePerNight: price / Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))),
        subtotal: netPrice,
        taxes: taxes,
        total: price,
        supplier: "hotelbeds",
        supplierPropertyId: property.supplier_hotel_code,
        priceTimestamp: new Date().toISOString(),
      });
    }
  }

  if (mappedRooms.length === 0) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "no_availability",
        message: "No rooms are currently available for the selected dates.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      available: true,
      rooms: mappedRooms,
      currency,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ─── Duffel availability (existing, for non-Hotelbeds properties) ──────────

async function checkDuffelAvailability(
  property: { id: string; name: string; city: string; country: string; destination_name: string | null; currency: string },
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number,
): Promise<Response> {
  const duffelToken = Deno.env.get("DUFFEL_ACCESS_TOKEN");

  if (!duffelToken) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "supplier_not_configured",
        message: "Live stay availability is currently unavailable.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const duffelHeaders = {
    "Authorization": `Bearer ${duffelToken}`,
    "Content-Type": "application/json",
    "Duffel-Version": "v2",
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
  };

  let accommodationId: string | null = null;

  try {
    const suggestionsResponse = await fetch(
      "https://api.duffel.com/stays/accommodation/suggestions",
      {
        method: "POST",
        headers: duffelHeaders,
        body: JSON.stringify({
          query: `${property.name} ${property.city}`,
        }),
      },
    );

    if (suggestionsResponse.ok) {
      const suggestionsData = await suggestionsResponse.json();
      const suggestions = suggestionsData?.data || [];
      if (suggestions.length > 0) {
        accommodationId = suggestions[0].accommodation_id || suggestions[0].id;
      }
    } else {
      return new Response(
        JSON.stringify({
          available: false,
          reason: "supplier_error",
          message: "Live stay availability is currently unavailable for this property.",
          rooms: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    // Suggestions failed — fall through to unavailable
  }

  if (!accommodationId) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "no_availability",
        message: "Live stay availability is currently unavailable for this property.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const guestsList = Array.from({ length: guests }, () => ({ type: "adult" }));
  if (guestsList.length === 0) guestsList.push({ type: "adult" });

  const searchResponse = await fetch(
    "https://api.duffel.com/stays/search",
    {
      method: "POST",
      headers: duffelHeaders,
      body: JSON.stringify({
        accommodation: {
          accommodation_id: accommodationId,
          check_in_date: checkIn,
          check_out_date: checkOut,
          guests: guestsList,
        },
        rooms: rooms,
      }),
    },
  );

  if (!searchResponse.ok) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "supplier_error",
        message: "Live stay availability is currently unavailable.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const searchData = await searchResponse.json();
  const searchResults = searchData?.data?.results || [];

  if (searchResults.length === 0) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "no_availability",
        message: "No rooms are currently available for the selected dates.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const firstResult = searchResults[0];
  const searchResultId = firstResult.id;

  const ratesResponse = await fetch(
    `https://api.duffel.com/stays/search_results/${searchResultId}/actions/fetch_all_rates`,
    {
      method: "POST",
      headers: duffelHeaders,
    },
  );

  let rateOffers: any[] = [];

  if (ratesResponse.ok) {
    const ratesData = await ratesResponse.json();
    rateOffers = ratesData?.data?.rates || ratesData?.data?.offers || [];
  } else {
    rateOffers = firstResult.rates ? [firstResult.rates?.[0] || firstResult.cheapest_rate] : [];
  }

  if (rateOffers.length === 0) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "no_availability",
        message: "No rooms are currently available for the selected dates.",
        rooms: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const mappedRooms = rateOffers.map((rate: any) => ({
    roomId: rate.room?.id || rate.id,
    roomName: rate.room?.name || "Room",
    rateId: rate.id,
    supplierOfferId: rate.id,
    mealPlan: rate.meal_plan?.name || rate.board_type || "Room only",
    cancellationPolicy: rate.cancellation_policy?.description ||
      rate.cancellation_details?.description ||
      "Cancellation policy available at checkout",
    maxGuests: guests,
    bedType: rate.room?.bed_configurations?.[0]?.beds?.[0]?.type || "Standard",
    currency: rate.total_currency || rate.currency || property.currency || "USD",
    pricePerNight: parseFloat(rate.per_night_amount || rate.nightly_amount || "0"),
    subtotal: parseFloat(rate.base_amount || rate.total_amount || "0"),
    taxes: parseFloat(rate.tax_amount || "0"),
    total: parseFloat(rate.total_amount || "0"),
    supplier: "duffel",
    supplierPropertyId: accommodationId,
    priceTimestamp: new Date().toISOString(),
  }));

  return new Response(
    JSON.stringify({
      available: true,
      rooms: mappedRooms,
      currency: property.currency || "USD",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
