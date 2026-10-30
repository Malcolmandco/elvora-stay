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
    const pickup = url.searchParams.get("pickup") || "";
    const dropoff = url.searchParams.get("dropoff") || pickup;
    const pickupDate = url.searchParams.get("pickupDate") || "";
    const dropoffDate = url.searchParams.get("dropoffDate") || "";
    const pickupTime = url.searchParams.get("pickupTime") || "10:00";
    const dropoffTime = url.searchParams.get("dropoffTime") || "10:00";
    const driverAge = url.searchParams.get("driverAge") || "30";

    const duffelToken = Deno.env.get("DUFFEL_ACCESS_TOKEN");

    if (!duffelToken) {
      return new Response(
        JSON.stringify({ error: "Duffel Cars API not configured. DUFFEL_ACCESS_TOKEN is missing." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Duffel Cars API call
    const requestBody = {
      data: {
        pickup_location_name: pickup,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        return_location_name: dropoff,
        return_date: dropoffDate,
        return_time: dropoffTime,
        driver_age: parseInt(driverAge, 10),
      },
    };

    const duffelResponse = await fetch("https://api.duffel.com/cars/offer_requests", {
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
      const errorData = await duffelResponse.text();
      return new Response(
        JSON.stringify({ error: `Duffel Cars API error: ${duffelResponse.status}` }),
        { status: duffelResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duffelData = await duffelResponse.json();
    const offers = duffelData.data?.offers || [];

    const results = offers.map((offer: any) => ({
      id: offer.id,
      vehicleName: offer.vehicle?.name || "Vehicle",
      supplier: offer.supplier?.name || "Supplier",
      seats: offer.vehicle?.seats || 0,
      doors: offer.vehicle?.doors || 0,
      transmission: offer.vehicle?.transmission || "Manual",
      fuel: offer.vehicle?.fuel || "Petrol",
      price: offer.total_amount || 0,
      currency: offer.total_currency || "USD",
      pickupLocation: pickup,
      dropoffLocation: dropoff,
    }));

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

