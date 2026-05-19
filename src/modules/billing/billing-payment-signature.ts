import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider } from '@prisma/client';

export type PaymentCallbackSignInput = {
  orderNo: string;
  provider: PaymentProvider;
  providerTradeNo: string;
  event: string;
  paidAt?: string;
};

export function buildPaymentCallbackSignPayload(input: PaymentCallbackSignInput): string {
  return [input.orderNo, input.provider, input.providerTradeNo, input.event, input.paidAt ?? ''].join('\n');
}

export function signPaymentCallback(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyPaymentCallbackSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature?.trim() || !secret) return false;
  const normalized = signature.trim().replace(/^sha256=/i, '');
  const expected = signPaymentCallback(payload, secret);
  try {
    const a = Buffer.from(normalized, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
