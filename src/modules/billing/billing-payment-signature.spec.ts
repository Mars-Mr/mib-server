import { describe, expect, it } from '@jest/globals';
import { PaymentProvider } from '@prisma/client';
import { PaymentCallbackEvent } from './dto/payment-callback.dto';
import {
  buildPaymentCallbackSignPayload,
  signPaymentCallback,
  verifyPaymentCallbackSignature,
} from './billing-payment-signature';

describe('billing-payment-signature', () => {
  const secret = 'test_webhook_secret_32_chars_min';

  const input = {
    orderNo: 'ORD12345678ABCD',
    provider: PaymentProvider.MOCK,
    providerTradeNo: 'MOCK_TX_001',
    event: PaymentCallbackEvent.PAID,
    paidAt: '2026-05-19T12:00:00.000Z',
  };

  it('builds stable canonical payload', () => {
    expect(buildPaymentCallbackSignPayload(input)).toBe(
      'ORD12345678ABCD\nMOCK\nMOCK_TX_001\npaid\n2026-05-19T12:00:00.000Z',
    );
  });

  it('verifies valid HMAC signature', () => {
    const payload = buildPaymentCallbackSignPayload(input);
    const signature = signPaymentCallback(payload, secret);
    expect(verifyPaymentCallbackSignature(payload, signature, secret)).toBe(true);
    expect(verifyPaymentCallbackSignature(payload, `sha256=${signature}`, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    const payload = buildPaymentCallbackSignPayload(input);
    expect(verifyPaymentCallbackSignature(payload, 'deadbeef', secret)).toBe(false);
    expect(verifyPaymentCallbackSignature(payload, undefined, secret)).toBe(false);
  });
});
