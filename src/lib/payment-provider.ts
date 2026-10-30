import { supabase } from '@/lib/supabase';

export interface CreatePaymentParams {
  bookingId: string;
  amount: number;
  currency: string;
  reference: string;
}

export interface ConfirmPaymentParams {
  bookingId: string;
  paymentMethodToken: string;
}

export interface PaymentResult {
  configured: boolean;
  provider?: string;
  paymentReference?: string;
  transactionId?: string;
  clientSecret?: string;
  error?: string;
}

export interface PaymentConfirmationResult {
  confirmed: boolean;
  status: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  confirmPayment(params: ConfirmPaymentParams): Promise<PaymentConfirmationResult>;
  getPaymentStatus(bookingId: string): Promise<PaymentVerificationResult>;
}

class PaymentgateProvider implements PaymentProvider {
  name = 'paymentgate';

  isConfigured(): boolean {
    return true;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paymentgate-payment`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bookingId: params.bookingId,
            action: 'create_intent',
          }),
        },
      );

      if (!response.ok) {
        return { configured: true, error: 'Unable to start payment. Please try again.' };
      }

      const result = await response.json();

      if (result.error) {
        return { configured: true, error: result.error };
      }

      return {
        configured: true,
        provider: 'paymentgate',
        paymentReference: result.intentId,
        clientSecret: result.clientSecret,
      };
    } catch {
      return { configured: true, error: 'Unable to reach payment provider. Please try again.' };
    }
  }

  async confirmPayment(params: ConfirmPaymentParams): Promise<PaymentConfirmationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paymentgate-payment`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bookingId: params.bookingId,
            action: 'confirm_intent',
            paymentMethodToken: params.paymentMethodToken,
          }),
        },
      );

      if (!response.ok) {
        return { confirmed: false, status: 'failed', error: 'Payment processing failed.' };
      }

      const result = await response.json();

      return {
        confirmed: result.confirmed ?? false,
        status: result.status ?? 'failed',
        transactionId: result.transactionId,
        error: result.error,
      };
    } catch {
      return { confirmed: false, status: 'failed', error: 'Unable to reach payment provider.' };
    }
  }

  async getPaymentStatus(bookingId: string): Promise<PaymentVerificationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paymentgate-payment`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bookingId,
            action: 'get_status',
          }),
        },
      );

      if (!response.ok) {
        return { verified: false, paymentStatus: 'pending' };
      }

      const result = await response.json();

      return {
        verified: result.paymentStatus === 'paid',
        paymentStatus: result.paymentStatus || 'pending',
      };
    } catch {
      return { verified: false, paymentStatus: 'pending' };
    }
  }
}

export const paymentProvider: PaymentProvider = new PaymentgateProvider();
