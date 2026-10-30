import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, Check, Lock, Loader2, AlertCircle,
  Calendar, Users, BedDouble, CreditCard, Hotel, ArrowLeft, Clock,
  XCircle,
} from 'lucide-react';
import { useBooking } from '@/context/booking-context';
import { supabase } from '@/lib/supabase';
import { paymentProvider } from '@/lib/payment-provider';
import { getPropertyBySlug } from '@/data/properties';

type CheckoutStep = 'guest_details' | 'review' | 'payment' | 'processing' | 'result';

export function CheckoutPage() {
  const { draft, clearDraft, pendingRedirect, setPendingRedirect } = useBooking();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('guest_details');
  const [user, setUser] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Guest details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Booking record
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<{
    confirmed: boolean;
    bookingStatus: string;
    paymentStatus: string;
    supplierConfirmation?: string;
    message?: string;
    reference?: string;
  } | null>(null);

  // Payment state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [intentCreated, setIntentCreated] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const paymentReady = paymentProvider.isConfigured();

  const property = draft?.propertySlug ? getPropertyBySlug(draft.propertySlug) : undefined;

  const nights = useMemo(() => {
    if (!draft?.checkIn || !draft?.checkOut) return 0;
    const diff = new Date(draft.checkOut).getTime() - new Date(draft.checkIn).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [draft?.checkIn, draft?.checkOut]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email ?? '',
            fullName: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? '',
          });
          setFirstName(authUser.user_metadata?.full_name?.split(' ')[0] ?? '');
          setLastName(authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '');
          setEmail(authUser.email ?? '');
        } else {
          setShowAuthPrompt(true);
        }
      } catch {
        setShowAuthPrompt(true);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  if (!draft || !draft.selectedRoom) {
    return (
      <div className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="font-serif text-3xl font-light text-foreground">No room selected</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please select a property and room to begin booking.
          </p>
          <Link
            to="/stays"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
          >
            Browse stays
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  void pendingRedirect;
  void setPendingRedirect;

  const steps: { id: CheckoutStep; label: string }[] = [
    { id: 'guest_details', label: 'Guest Details' },
    { id: 'review', label: 'Review' },
    { id: 'payment', label: 'Payment' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const handleContinueToReview = () => {
    if (!firstName || !lastName || !email || !phone) return;
    setStep('review');
  };

  const createBookingRecord = async (): Promise<string | null> => {
    const total = draft.selectedRoom!.total;
    const taxes = draft.selectedRoom!.taxes;
    const currency = draft.selectedRoom!.currency;
    const room = draft.selectedRoom!;

    const { data: refData } = await supabase.rpc('generate_booking_reference');
    const reference = refData as string;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user!.id,
        booking_type: 'stay',
        property_id: draft.propertyId,
        property_name: draft.propertyName,
        property_image: draft.propertyImage,
        destination_name: draft.destinationName,
        supplier: room.supplier,
        supplier_property_id: room.supplierPropertyId,
        supplier_offer_id: room.supplierOfferId,
        check_in: draft.checkIn,
        check_out: draft.checkOut,
        guests: draft.guests,
        rooms: draft.rooms,
        room_name: room.roomName,
        room_details: {
          ...((room.roomSnapshot) || {}),
          bedType: room.roomName,
          rateId: room.rateId,
        },
        meal_plan: room.mealPlan,
        cancellation_policy: room.cancellationPolicy,
        currency,
        subtotal: total - taxes,
        taxes,
        total,
        payment_status: 'pending',
        booking_status: 'availability_checked',
        guest_first_name: firstName,
        guest_last_name: lastName,
        guest_email: email,
        guest_phone: phone,
        price_timestamp: room.priceTimestamp,
        reference,
      })
      .select('id')
      .single();

    if (error) {
      return null;
    }

    setBookingReference(reference);
    return data.id;
  };

  const handleContinueToPayment = async () => {
    const id = await createBookingRecord();
    if (!id) {
      setPaymentError('Unable to create your booking. Please try again.');
      return;
    }
    setBookingId(id);
    setStep('payment');
  };

  const handleConfirmBooking = async () => {
    if (!bookingId) return;
    if (!cardNumber || !cardExpiry || !cardCvc) {
      setPaymentError('Please enter your card details.');
      return;
    }

    setPaymentError(null);
    setPaymentSubmitting(true);

    try {
      // Step 1: Create payment intent via edge function
      const intentResult = await paymentProvider.createPayment({
        bookingId,
        amount: draft.selectedRoom!.total,
        currency: draft.selectedRoom!.currency,
        reference: bookingReference,
      });

      if (intentResult.error || !intentResult.clientSecret) {
        setPaymentError(intentResult.error || 'Unable to start payment. Please try again.');
        setPaymentSubmitting(false);
        return;
      }

      setClientSecret(intentResult.clientSecret);
      setIntentCreated(true);

      // Step 2: Tokenize card and confirm payment via edge function
      // Paymentgate uses pm_card_visa style tokens for test mode
      // In production, Paymentgate's hosted fields SDK would tokenize
      // For sandbox, we use the test card token format
      const paymentMethodToken = `pm_card_${cardNumber.replace(/\s/g, '').slice(-4)}`;

      const confirmResult = await paymentProvider.confirmPayment({
        bookingId,
        paymentMethodToken,
      });

      if (confirmResult.confirmed) {
        // Payment succeeded — proceed to supplier booking
        setStep('processing');

        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stay-booking`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ bookingId }),
          },
        );

        const result = await response.json();

        setBookingResult({
          confirmed: result.confirmed,
          bookingStatus: result.bookingStatus,
          paymentStatus: result.paymentStatus,
          supplierConfirmation: result.supplierConfirmation,
          message: result.message,
          reference: result.reference || bookingReference,
        });

        setStep('result');
        clearDraft();
      } else if (confirmResult.status === 'processing') {
        // Payment is processing — webhook will finalize
        setStep('processing');

        // Poll for status update
        let pollCount = 0;
        const maxPolls = 12;
        const pollInterval = setInterval(async () => {
          pollCount++;
          const statusResult = await paymentProvider.getPaymentStatus(bookingId);

          if (statusResult.paymentStatus === 'paid') {
            clearInterval(pollInterval);
            // Trigger supplier booking
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stay-booking`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({ bookingId }),
              },
            );

            const result = await response.json();

            setBookingResult({
              confirmed: result.confirmed,
              bookingStatus: result.bookingStatus,
              paymentStatus: result.paymentStatus,
              supplierConfirmation: result.supplierConfirmation,
              message: result.message,
              reference: result.reference || bookingReference,
            });

            setStep('result');
            clearDraft();
          } else if (statusResult.paymentStatus === 'failed') {
            clearInterval(pollInterval);
            setBookingResult({
              confirmed: false,
              bookingStatus: 'payment_failed',
              paymentStatus: 'failed',
              message: 'Payment was declined. Please try again with a different card.',
              reference: bookingReference,
            });
            setStep('result');
            clearDraft();
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setBookingResult({
              confirmed: false,
              bookingStatus: 'payment_processing',
              paymentStatus: 'pending',
              message: 'Payment is still processing. Please check My Trips for updates.',
              reference: bookingReference,
            });
            setStep('result');
            clearDraft();
          }
        }, 5000);
      } else {
        // Payment failed
        setPaymentError(confirmResult.error || 'Payment was declined. Please try a different card.');
        setPaymentSubmitting(false);
      }
    } catch {
      setPaymentError('Unable to process payment. Please try again.');
      setPaymentSubmitting(false);
    }
  };

  const formatCardNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const total = draft.selectedRoom.total;
  const taxes = draft.selectedRoom.taxes;
  const currency = draft.selectedRoom.currency;
  const subtotal = total - taxes;

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Checkout</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Complete your booking
        </h1>

        {/* Steps indicator */}
        {step !== 'processing' && step !== 'result' && (
          <div className="mt-8 flex items-center gap-2 overflow-x-auto">
            {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  currentStepIndex > idx
                    ? 'bg-accent text-white'
                    : currentStepIndex === idx
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {currentStepIndex > idx ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : idx + 1}
                </div>
                <span className={`hidden whitespace-nowrap text-sm sm:inline ${
                  currentStepIndex === idx ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
                {idx < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border sm:w-12" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* AUTH PROMPT */}
            {showAuthPrompt && (
              <div className="space-y-6">
                <div className="border border-border bg-secondary p-8 text-center">
                  <h2 className="font-serif text-2xl font-light text-foreground">Sign in to continue</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You need an account to complete your booking. Your selected room and dates will be saved.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center bg-foreground px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="inline-flex items-center justify-center border border-border px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-secondary"
                    >
                      Create Account
                    </Link>
                  </div>
                  <button
                    onClick={() => setShowAuthPrompt(false)}
                    className="mt-4 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* GUEST DETAILS STEP */}
            {step === 'guest_details' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-medium text-foreground">Guest information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">First Name</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="First name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Name</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="Your phone number" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAuthPrompt(false)} className="border border-border px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary">
                    Back
                  </button>
                  <button
                    onClick={handleContinueToReview}
                    disabled={!firstName || !lastName || !email || !phone}
                    className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue to review
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* REVIEW STEP */}
            {step === 'review' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-medium text-foreground">Your stay</h2>
                <div className="border border-border bg-card p-6">
                  <div className="flex gap-4">
                    {draft.propertyImage && (
                      <div className="h-20 w-24 shrink-0 overflow-hidden bg-muted">
                        <img src={draft.propertyImage} alt={draft.propertyName} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">{draft.propertyName}</h3>
                      <p className="text-sm text-muted-foreground">{draft.destinationName}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-in</p>
                      <p className="mt-1 font-medium text-foreground">{draft.checkIn}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-out</p>
                      <p className="mt-1 font-medium text-foreground">{draft.checkOut}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Guests</p>
                      <p className="mt-1 font-medium text-foreground">{draft.guests} {draft.guests === 1 ? 'guest' : 'guests'} · {draft.rooms} {draft.rooms === 1 ? 'room' : 'rooms'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Room</p>
                      <p className="mt-1 font-medium text-foreground">{draft.selectedRoom.roomName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Rate</p>
                      <p className="mt-1 font-medium text-foreground">{draft.selectedRoom.mealPlan}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Cancellation</p>
                      <p className="mt-1 font-medium text-foreground">{draft.selectedRoom.cancellationPolicy}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                    <div className="flex justify-between text-foreground">
                      <span>Subtotal</span>
                      <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes & fees</span>
                      <span>{currency} {taxes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 font-medium text-foreground">
                      <span>Total</span>
                      <span className="font-serif text-lg">{currency} {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('guest_details')} className="border border-border px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary">
                    Back
                  </button>
                  <button
                    onClick={handleContinueToPayment}
                    className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                  >
                    <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {/* PAYMENT STEP */}
            {step === 'payment' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-medium text-foreground">Payment</h2>

                {paymentError && (
                  <div className="border border-error/30 bg-error/5 p-4 text-sm text-error">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                      {paymentError}
                    </div>
                  </div>
                )}

                {paymentReady && (
                  <div className="border border-border bg-card p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" strokeWidth={1.5} />
                      Secure payment via Paymentgate
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Card Number</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Expiry</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground"
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">CVC</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground"
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.5} />
                      Your payment is processed securely by Paymentgate. We never store your card details.
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      disabled={paymentSubmitting || !cardNumber || !cardExpiry || !cardCvc}
                      className="mt-6 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {paymentSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                          Processing payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Pay {currency} {total.toLocaleString()}
                        </>
                      )}
                    </button>

                    {intentCreated && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Payment intent created. Confirming with your bank...
                      </p>
                    )}
                  </div>
                )}

                {!paymentReady && (
                  <div className="border border-border bg-secondary p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <CreditCard className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-light text-foreground">
                      Payment gateway is not configured
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Payment processing is temporarily unavailable. Please try again later.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Booking reference: <span className="font-medium text-foreground">{bookingReference}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PROCESSING STEP */}
            {step === 'processing' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-foreground" strokeWidth={1.5} />
                <h2 className="mt-6 font-serif text-2xl font-light text-foreground">Processing your booking</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Confirming payment and booking with the supplier. Please do not close this page.
                </p>
              </div>
            )}

            {/* RESULT STEP */}
            {step === 'result' && bookingResult && (
              <div className="py-10 text-center">
                {bookingResult.confirmed ? (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                      <Check className="h-8 w-8 text-accent" strokeWidth={1.5} />
                    </div>
                    <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-accent">
                      Booking Confirmed
                    </p>
                    <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground">
                      You're all set
                    </h1>
                  </>
                ) : bookingResult.bookingStatus === 'payment_failed' ? (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                      <XCircle className="h-8 w-8 text-error" strokeWidth={1.5} />
                    </div>
                    <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-error">
                      Payment Failed
                    </p>
                    <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground">
                      Payment could not be processed
                    </h1>
                  </>
                ) : bookingResult.bookingStatus === 'supplier_booking_failed' ? (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                      <AlertCircle className="h-8 w-8 text-warning" strokeWidth={1.5} />
                    </div>
                    <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-warning">
                      Payment Received — Supplier Booking Pending
                    </p>
                    <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground">
                      Your payment was successful
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                      We received your payment but could not confirm the hotel reservation immediately.
                      Our team will complete your booking shortly. Your payment is protected.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                      <Clock className="h-8 w-8 text-warning" strokeWidth={1.5} />
                    </div>
                    <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.25em] text-warning">
                      Booking Pending
                    </p>
                    <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground">
                      Booking confirmation in progress
                    </h1>
                  </>
                )}

                <p className="mt-3 text-sm text-muted-foreground">
                  {bookingResult.message || 'Your booking is being processed.'}
                </p>

                <div className="mx-auto mt-8 max-w-md border border-border bg-card p-6 text-left">
                  <div className="text-center">
                    <span className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Booking Reference
                    </span>
                    <p className="mt-2 font-serif text-2xl font-medium text-foreground">
                      {bookingResult.reference || bookingReference}
                    </p>
                  </div>
                  {property && (
                    <div className="mt-5 flex gap-4 border-t border-border pt-5">
                      {draft.propertyImage && (
                        <div className="h-16 w-20 shrink-0 overflow-hidden bg-muted">
                          <img src={draft.propertyImage} alt={draft.propertyName} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="font-serif text-sm font-medium text-foreground">{draft.propertyName}</p>
                        <p className="text-xs text-muted-foreground">{draft.destinationName}</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Check-in</p>
                      <p className="font-medium text-foreground">{draft.checkIn}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out</p>
                      <p className="font-medium text-foreground">{draft.checkOut}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Guests</p>
                      <p className="font-medium text-foreground">{draft.guests}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Room</p>
                      <p className="font-medium text-foreground">{draft.selectedRoom?.roomName}</p>
                    </div>
                    {bookingResult.supplierConfirmation && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Supplier Confirmation</p>
                        <p className="font-medium text-foreground">{bookingResult.supplierConfirmation}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium text-foreground">{currency} {total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
                  >
                    <Hotel className="h-3.5 w-3.5" strokeWidth={1.5} />
                    View My Trip
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 border border-border px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:bg-secondary"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Back to Discover
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          {step !== 'result' && step !== 'processing' && (
            <div className="lg:col-span-1">
              <div className="sticky top-28 border border-border bg-card p-6">
                {draft.propertyImage && (
                  <div className="flex gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden bg-muted">
                      <img src={draft.propertyImage} alt={draft.propertyName} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">{draft.propertyName}</h3>
                      <p className="text-xs text-muted-foreground">{draft.destinationName}</p>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" strokeWidth={1.5} />
                    <span>{draft.checkIn} → {draft.checkOut}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" strokeWidth={1.5} />
                    <span>{draft.guests} {draft.guests === 1 ? 'guest' : 'guests'} · {draft.rooms} {draft.rooms === 1 ? 'room' : 'rooms'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BedDouble className="h-4 w-4" strokeWidth={1.5} />
                    <span>{draft.selectedRoom.roomName}</span>
                  </div>
                  {nights > 0 && (
                    <p className="text-xs text-muted-foreground">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                  <div className="flex justify-between text-foreground">
                    <span>Subtotal</span>
                    <span>{currency} {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes & fees</span>
                    <span>{currency} {taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 font-medium text-foreground">
                    <span>Total</span>
                    <span className="font-serif text-lg">{currency} {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  Secure booking through Elvora Stay
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
