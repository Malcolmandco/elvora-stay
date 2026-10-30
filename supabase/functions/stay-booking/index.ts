import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          confirmed: false,
          error: "Payment has not been completed yet.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Server-side price recalculation from stored room price ────────
    // The browser sends a total; we recalculate from the stored room catalog
    // to ensure the customer wasn't overcharged or undercharged.
    const roomDetails = booking.room_details as Record<string, unknown> | null;
    const roomSnapshot = roomDetails?.roomSnapshot as Record<string, unknown> | null;
    const catalogRoomId = roomSnapshot?.roomId as string | undefined;

    if (catalogRoomId && booking.property_id) {
      const { data: storedRoom } = await supabase
        .from("property_rooms")
        .select("elvora_price_per_night, currency, is_active")
        .eq("id", catalogRoomId)
        .maybeSingle();

      if (storedRoom && storedRoom.is_active) {
        const storedPrice = Number(storedRoom.elvora_price_per_night) || 0;
        const checkIn = booking.check_in as string;
        const checkOut = booking.check_out as string;
        const nights = Math.max(1, Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
        ));
        const rooms = Math.max(1, booking.rooms || 1);
        const recalculatedTotal = Math.round(storedPrice * nights * rooms * 100) / 100;

        // Update the booking with the server-calculated total
        await supabase
          .from("bookings")
          .update({
            subtotal: recalculatedTotal,
            taxes: 0,
            total: recalculatedTotal,
            currency: storedRoom.currency || booking.currency,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        booking.total = recalculatedTotal;
        booking.subtotal = recalculatedTotal;
        booking.currency = storedRoom.currency || booking.currency;
      }
    }

    await supabase
      .from("bookings")
      .update({
        booking_status: "supplier_booking_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // Route to the correct supplier
    if (booking.supplier === "hotelbeds") {
      return await confirmHotelbedsBooking(supabase, booking);
    }

    // Fall back to Duffel
    return await confirmDuffelBooking(supabase, booking);
  } catch {
    return new Response(
      JSON.stringify({ error: "Booking processing is temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Hotelbeds booking ──────────────────────────────────────────────────

async function confirmHotelbedsBooking(supabase: any, booking: any): Promise<Response> {
  const { apiKey, secret, baseUrl } = getHotelbedsConfig();

  if (!apiKey || !secret) {
    return new Response(
      JSON.stringify({
        confirmed: false,
        bookingStatus: "booking_pending",
        paymentStatus: booking.payment_status,
        message: "Booking confirmation is being processed. Please check My Trips for updates.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rateKey = booking.supplier_offer_id;

  // ─── Stored room catalog bookings have no live rate key ──────────────
  // The supplier_offer_id is the roomCode (e.g. "SUI.2Q"), not a Hotelbeds
  // rate key. These bookings use stored pricing — skip CheckRate and booking
  // creation. The booking is confirmed locally with the stored price.
  const roomDetails = booking.room_details as Record<string, unknown> | null;
  const isCatalogBooking = !!(roomDetails?.roomSnapshot as Record<string, unknown> | undefined);

  if (!rateKey || isCatalogBooking) {
    // Catalog booking: confirm locally without calling Hotelbeds API
    await supabase
      .from("bookings")
      .update({
        booking_status: "confirmed",
        supplier_booking_reference: `ELV-${booking.reference || booking.id}`,
        room_details: {
          ...((booking.room_details as Record<string, unknown>) || {}),
          supplierStatus: "confirmed_local",
          bookingType: "stored_catalog",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        confirmed: true,
        bookingStatus: "confirmed",
        paymentStatus: booking.payment_status,
        supplierConfirmation: `ELV-${booking.reference || booking.id}`,
        reference: booking.reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── Live rate booking: CheckRate + Booking ──────────────────────────
  const headers = await buildHotelbedsHeaders(apiKey, secret);

  // Step 1: Check rate to confirm the rate key is still valid and get updated pricing
  let rateCheckOk = false;
  let confirmedRateKey = rateKey;

  try {
    const rateResponse = await fetch(`${baseUrl}/hotel-api/1.0/checkrates`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        rooms: [{ rateKey }],
      }),
    });

    if (rateResponse.ok) {
      rateCheckOk = true;
      const rateData = await rateResponse.json();
      const confirmedRooms = rateData?.hotel?.rooms || [];
      if (confirmedRooms.length > 0 && confirmedRooms[0].rates?.[0]?.rateKey) {
        confirmedRateKey = confirmedRooms[0].rates[0].rateKey;
      }
    } else if (rateResponse.status === 400 || rateResponse.status === 409) {
      await supabase
        .from("bookings")
        .update({
          booking_status: "supplier_booking_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      return new Response(
        JSON.stringify({
          confirmed: false,
          bookingStatus: "supplier_booking_failed",
          paymentStatus: booking.payment_status,
          message: "The selected rate is no longer available. Please search again for current rates.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    // Rate check failed — proceed with original rate key
  }

  // Step 2: Create the booking
  const bookingPayload = {
    holder: {
      name: booking.guest_first_name || "Guest",
      surname: booking.guest_last_name || "Guest",
    },
    rooms: [
      {
        rateKey: confirmedRateKey,
      },
    ],
    clientReference: booking.reference || "",
  };

  if (booking.guest_email) {
    (bookingPayload as any).holder.email = booking.guest_email;
  }

  if (booking.guest_phone) {
    (bookingPayload as any).holder.phoneNumber = booking.guest_phone;
  }

  let bookingResponse: Response;
  try {
    bookingResponse = await fetch(`${baseUrl}/hotel-api/1.0/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingPayload),
    });
  } catch {
    return new Response(
      JSON.stringify({
        confirmed: false,
        bookingStatus: "booking_pending",
        paymentStatus: booking.payment_status,
        message: "Booking confirmation is being processed. Please check My Trips for updates.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (bookingResponse.ok) {
    const bookingData = await bookingResponse.json();
    const bookingResult = bookingData?.booking || {};
    const supplierRef = bookingResult.reference || bookingResult.bookingReference || "";
    const supplierStatus = bookingResult.status || "";

    const cancellationInfo = bookingResult.hotel?.rooms?.[0]?.rates?.[0]?.cancellationPolicies || null;

    await supabase
      .from("bookings")
      .update({
        booking_status: "confirmed",
        supplier_booking_reference: supplierRef,
        room_details: {
          ...((booking.room_details as Record<string, unknown>) || {}),
          supplierStatus,
          cancellationPolicies: cancellationInfo,
          rateKey: confirmedRateKey,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        confirmed: true,
        bookingStatus: "confirmed",
        paymentStatus: booking.payment_status,
        supplierConfirmation: supplierRef,
        reference: booking.reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } else {
    const errBody = await bookingResponse.text().catch(() => "");
    let errorMsg = "Booking confirmation is being processed. Please check My Trips for updates.";

    try {
      const j = JSON.parse(errBody);
      const code = j?.error?.code || "";
      if (code === "007" || code === "008" || bookingResponse.status === 409) {
        await supabase
          .from("bookings")
          .update({
            booking_status: "supplier_booking_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        return new Response(
          JSON.stringify({
            confirmed: false,
            bookingStatus: "supplier_booking_failed",
            paymentStatus: booking.payment_status,
            message: "The selected rate is no longer available. Please search again for current rates.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch { /* keep default */ }

    return new Response(
      JSON.stringify({
        confirmed: false,
        bookingStatus: "booking_pending",
        paymentStatus: booking.payment_status,
        message: errorMsg,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

// ─── Duffel booking (existing) ───────────────────────────────────────────

async function confirmDuffelBooking(supabase: any, booking: any): Promise<Response> {
  const duffelToken = Deno.env.get("DUFFEL_ACCESS_TOKEN");

  if (!duffelToken || booking.supplier !== "duffel") {
    return new Response(
      JSON.stringify({
        confirmed: false,
        bookingStatus: "booking_pending",
        paymentStatus: booking.payment_status,
        message: "Booking confirmation is being processed. Please check My Trips for updates.",
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

  let quoteId: string | null = null;

  try {
    const quoteResponse = await fetch(
      "https://api.duffel.com/stays/quotes",
      {
        method: "POST",
        headers: duffelHeaders,
        body: JSON.stringify({
          rate_id: booking.supplier_offer_id,
        }),
      },
    );

    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      quoteId = quoteData?.data?.id;
    } else if (quoteResponse.status !== 404) {
      return new Response(
        JSON.stringify({
          confirmed: false,
          bookingStatus: "booking_pending",
          paymentStatus: booking.payment_status,
          message: "Booking confirmation is being processed. Please check My Trips for updates.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    // Quote failed — fall through to pending
  }

  const bookingPayload: Record<string, unknown> = {
    email: booking.guest_email,
    guests: [
      {
        given_name: booking.guest_first_name,
        family_name: booking.guest_last_name,
      },
    ],
  };

  if (quoteId) {
    bookingPayload.quote_id = quoteId;
  } else {
    bookingPayload.rate_id = booking.supplier_offer_id;
  }

  if (booking.guest_phone) {
    (bookingPayload.guests as any[])[0].phone_number = booking.guest_phone;
  }

  const duffelBookingResponse = await fetch(
    "https://api.duffel.com/stays/bookings",
    {
      method: "POST",
      headers: duffelHeaders,
      body: JSON.stringify(bookingPayload),
    },
  );

  if (duffelBookingResponse.ok) {
    const duffelBooking = await duffelBookingResponse.json();
    const supplierRef = duffelBooking?.data?.id || duffelBooking?.data?.reference || "";

    await supabase
      .from("bookings")
      .update({
        booking_status: "confirmed",
        supplier_booking_reference: supplierRef,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        confirmed: true,
        bookingStatus: "confirmed",
        paymentStatus: booking.payment_status,
        supplierConfirmation: supplierRef,
        reference: booking.reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } else {
    return new Response(
      JSON.stringify({
        confirmed: false,
        bookingStatus: "booking_pending",
        paymentStatus: booking.payment_status,
        message: "Booking confirmation is being processed. Please check My Trips for updates.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}
