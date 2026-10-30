import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getHotelbedsConfig, buildHotelbedsHeaders, corsHeaders } from "../_shared/hotelbeds-config.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("pg-signature") || "";

    const webhookSecret = Deno.env.get("PAYMENTGATE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify HMAC-SHA256 signature before trusting anything
    const expectedSig = await hmacSha256(webhookSecret, rawBody);
    if (!timingSafeEqual(signature, expectedSig)) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const paymentData = event.data?.object || {};

    const intentId = paymentData.id;
    const metadata = paymentData.metadata || {};

    if (!intentId) {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find booking by payment_reference (intent ID)
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("payment_reference", intentId)
      .maybeSingle();

    if (!booking) {
      return new Response(
        JSON.stringify({ received: true, message: "Booking not found for this payment." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atomic idempotency guard: only proceed if payment is not already paid.
    // Uses a conditional UPDATE that sets payment_status to a transitional
    // state only if the current value is NOT "paid", preventing race conditions
    // where two concurrent webhooks both pass a read-then-write check.
    if (eventType === "payment_intent.succeeded") {
      const { data: updated, error: guardError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_transaction_id: String(
            (paymentData.latest_charge as Record<string, unknown>)?.id || paymentData.id
          ),
          booking_status: "supplier_booking_pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(booking.id))
        .neq("payment_status", "paid")
        .select("id")
        .maybeSingle();

      if (guardError || !updated) {
        // Either an error occurred, or the booking was already marked paid
        // by a previous webhook — either way, don't process again.
        return new Response(
          JSON.stringify({ received: true, message: "Already processed." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Payment marked paid atomically — now trigger supplier booking
      const freshBooking = { ...booking, payment_status: "paid" };
      if (booking.supplier === "hotelbeds") {
        await confirmHotelbedsBooking(supabase, freshBooking);
      }
    } else if (eventType === "payment_intent.payment_failed") {
      await supabase
        .from("bookings")
        .update({
          payment_status: "failed",
          booking_status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(booking.id));
    } else if (eventType === "payment_intent.canceled") {
      await supabase
        .from("bookings")
        .update({
          payment_status: "failed",
          booking_status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(booking.id));
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Webhook processing failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Hotelbeds booking confirmation ──────────────────────────────────────

async function confirmHotelbedsBooking(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
): Promise<void> {
  const { apiKey, secret, baseUrl } = getHotelbedsConfig();

  if (!apiKey || !secret) return;

  const headers = await buildHotelbedsHeaders(apiKey, secret);
  const rateKey = String(booking.supplier_offer_id || "");
  if (!rateKey) return;

  // Step 1: CheckRates to validate the rate key
  let confirmedRateKey = rateKey;
  try {
    const rateResponse = await fetch(`${baseUrl}/hotel-api/1.0/checkrates`, {
      method: "POST",
      headers,
      body: JSON.stringify({ rooms: [{ rateKey }] }),
    });

    if (rateResponse.status === 400 || rateResponse.status === 409) {
      await supabase
        .from("bookings")
        .update({
          booking_status: "supplier_booking_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(booking.id));
      return;
    }

    if (rateResponse.ok) {
      const rateData = await rateResponse.json();
      const confirmedRooms = rateData?.hotel?.rooms || [];
      if (confirmedRooms.length > 0 && confirmedRooms[0].rates?.[0]?.rateKey) {
        confirmedRateKey = confirmedRooms[0].rates[0].rateKey;
      }
    }
  } catch {
    // Proceed with original rate key
  }

  // Step 2: Create the Hotelbeds booking
  const bookingPayload: Record<string, unknown> = {
    holder: {
      name: String(booking.guest_first_name || "Guest"),
      surname: String(booking.guest_last_name || "Guest"),
    },
    rooms: [{ rateKey: confirmedRateKey }],
    clientReference: String(booking.reference || ""),
  };

  if (booking.guest_email) {
    (bookingPayload.holder as Record<string, unknown>).email = String(booking.guest_email);
  }
  if (booking.guest_phone) {
    (bookingPayload.holder as Record<string, unknown>).phoneNumber = String(booking.guest_phone);
  }

  try {
    const bookingResponse = await fetch(`${baseUrl}/hotel-api/1.0/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingPayload),
    });

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
        .eq("id", String(booking.id));
    } else {
      const errBody = await bookingResponse.text().catch(() => "");
      let errorMsg = "Supplier booking failed after payment.";
      try {
        const j = JSON.parse(errBody);
        const code = j?.error?.code || "";
        if (code === "007" || code === "008" || bookingResponse.status === 409) {
          errorMsg = "The selected rate is no longer available.";
        }
      } catch { /* keep default */ }

      await supabase
        .from("bookings")
        .update({
          booking_status: "supplier_booking_failed",
          room_details: {
            ...((booking.room_details as Record<string, unknown>) || {}),
            supplierBookingError: errorMsg,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(booking.id));
    }
  } catch {
    await supabase
      .from("bookings")
      .update({
        booking_status: "supplier_booking_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(booking.id));
  }
}

// ─── Crypto helpers ───────────────────────────────────────────────────────

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
