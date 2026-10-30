import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAYMENTGATE_API_BASE = "https://api.paymentgate.com/v2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { bookingId, action } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const secretKey = Deno.env.get("PAYMENTGATE_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Payment provider is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    if (action === "create_intent") {
      return await createPaymentIntent(supabase, booking, secretKey);
    }

    if (action === "confirm_intent") {
      const { paymentMethodToken } = await req.json();
      return await confirmPaymentIntent(supabase, booking, secretKey, paymentMethodToken);
    }

    if (action === "get_status") {
      return await getPaymentStatus(supabase, booking, secretKey);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use create_intent, confirm_intent, or get_status." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Payment processing is temporarily unavailable." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Create PaymentIntent ────────────────────────────────────────────────

async function createPaymentIntent(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  secretKey: string,
): Promise<Response> {
  const amount = Math.round(Number(booking.total) * 100);
  const currency = (String(booking.currency) || "USD").toLowerCase();
  const reference = String(booking.reference) || "";

  if (amount <= 0) {
    return new Response(
      JSON.stringify({ error: "Invalid booking amount." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const idempotencyKey = `elvora_${reference}_${booking.id}`;

  const response = await fetch(`${PAYMENTGATE_API_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount,
      currency,
      payment_method_types: ["card"],
      metadata: {
        booking_id: String(booking.id),
        booking_reference: reference,
        supplier: String(booking.supplier || ""),
        supplier_property_id: String(booking.supplier_property_id || ""),
        supplier_offer_id: String(booking.supplier_offer_id || ""),
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Unable to create payment. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const intent = await response.json();
  const intentId = intent.id;
  const clientSecret = intent.client_secret;

  await supabase
    .from("bookings")
    .update({
      payment_provider: "paymentgate",
      payment_reference: intentId,
      payment_amount: Number(booking.total),
      payment_currency: String(booking.currency),
      payment_metadata: { intent_id: intentId, client_secret: clientSecret },
      booking_status: "payment_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(booking.id));

  return new Response(
    JSON.stringify({
      intentId,
      clientSecret,
      amount,
      currency,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ─── Confirm PaymentIntent ───────────────────────────────────────────────

async function confirmPaymentIntent(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  secretKey: string,
  paymentMethodToken: string,
): Promise<Response> {
  const intentId = String(booking.payment_reference || "");
  if (!intentId) {
    return new Response(
      JSON.stringify({ error: "No payment intent found for this booking." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const idempotencyKey = `elvora_confirm_${booking.id}`;

  const response = await fetch(`${PAYMENTGATE_API_BASE}/payment_intents/${intentId}/confirm`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      payment_method: paymentMethodToken,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || "Payment was declined. Please try a different card.";

    await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
        booking_status: "payment_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(booking.id));

    return new Response(
      JSON.stringify({ confirmed: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const confirmed = await response.json();
  const status = confirmed.status;
  const transactionId = confirmed.latest_charge?.id || confirmed.id;

  if (status === "succeeded" || status === "requires_capture") {
    await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_transaction_id: transactionId,
        payment_metadata: {
          ...(booking.payment_metadata as Record<string, unknown> || {}),
          transaction_id: transactionId,
          confirmed_at: new Date().toISOString(),
        },
        booking_status: "payment_paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(booking.id));

    return new Response(
      JSON.stringify({
        confirmed: true,
        status: "paid",
        transactionId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Still processing — webhook will finalize
  await supabase
    .from("bookings")
    .update({
      booking_status: "payment_processing",
      payment_transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(booking.id));

  return new Response(
    JSON.stringify({
      confirmed: false,
      status: "processing",
      message: "Payment is being processed. You will be notified once it completes.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ─── Get Payment Status ───────────────────────────────────────────────────

async function getPaymentStatus(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  secretKey: string,
): Promise<Response> {
  const intentId = String(booking.payment_reference || "");
  if (!intentId) {
    return new Response(
      JSON.stringify({ paymentStatus: booking.payment_status || "pending" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`${PAYMENTGATE_API_BASE}/payment_intents/${intentId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ paymentStatus: booking.payment_status || "pending" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const intent = await response.json();
  const status = intent.status;

  let paymentStatus = "pending";
  if (status === "succeeded") paymentStatus = "paid";
  else if (status === "canceled") paymentStatus = "failed";
  else if (status === "requires_payment_method" && booking.payment_status === "failed") paymentStatus = "failed";

  return new Response(
    JSON.stringify({ paymentStatus, intentStatus: status }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
