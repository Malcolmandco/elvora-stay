import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin") || "";
    const destination = url.searchParams.get("destination") || "";
    const departDate = url.searchParams.get("departDate") || "";
    const returnDate = url.searchParams.get("returnDate") || "";
    const tripType = url.searchParams.get("tripType") || "roundtrip";
    const cabinClass = url.searchParams.get("cabinClass") || "any";
    const adults = parseInt(url.searchParams.get("adults") || "1", 10);
    const children = parseInt(url.searchParams.get("children") || "0", 10);
    const infants = parseInt(url.searchParams.get("infants") || "0", 10);

    const duffelToken = Deno.env.get("DUFFEL_ACCESS_TOKEN");

    if (!duffelToken) {
      return new Response(
        JSON.stringify({ error: "Flight search is currently unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const slices = [
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_date: departDate,
      },
    ];

    if (tripType === "roundtrip" && returnDate) {
      slices.push({
        origin: destination.toUpperCase(),
        destination: origin.toUpperCase(),
        departure_date: returnDate,
      });
    }

    const passengers: Array<{ type: string; given_name?: string; surname?: string }> = [];
    for (let i = 0; i < adults; i++) passengers.push({ type: "adult" });
    for (let i = 0; i < children; i++) passengers.push({ type: "child", given_name: "Child", surname: String(i + 1) });
    for (let i = 0; i < infants; i++) passengers.push({ type: "infant", given_name: "Infant", surname: String(i + 1) });

    if (passengers.length === 0) passengers.push({ type: "adult" });

    const requestBody = {
      data: {
        slices,
        passengers,
        cabin_class: cabinClass,
      },
    };

    const duffelResponse = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${duffelToken}`,
        "Content-Type": "application/json",
        "Duffel-Version": "v2",
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify(requestBody),
    });

    if (!duffelResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Flight search is currently unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const duffelData = await duffelResponse.json();
    const offers = duffelData.data?.offers || [];

    const results = offers.map((offer: any) => {
      const firstSlice = offer.slices?.[0];
      const firstSegment = firstSlice?.segments?.[0];
      const lastSegment = firstSlice?.segments?.[firstSlice.segments.length - 1];
      const totalStops = (firstSlice?.segments?.length || 1) - 1;

      return {
        id: offer.id,
        airline: firstSegment?.marketing_carrier?.name || "Unknown",
        flightNumber: firstSegment
          ? `${firstSegment.marketing_carrier?.iata_code || ""}${firstSegment.marketing_carrier_flight_number || ""}`
          : "",
        origin: firstSegment?.origin?.iata_city?.iata_code || firstSegment?.origin?.iata_code || origin,
        destination: lastSegment?.destination?.iata_city?.iata_code || lastSegment?.destination?.iata_code || destination,
        departureTime: firstSegment?.departing_at || "",
        arrivalTime: lastSegment?.arriving_at || "",
        duration: firstSlice?.duration || "",
        stops: totalStops,
        cabin: offer.cabin_class || cabinClass,
        price: offer.total_amount || 0,
        currency: offer.total_currency || "USD",
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Flight search is currently unavailable. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});



