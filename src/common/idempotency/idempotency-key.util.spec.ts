import { describe, expect, it } from '@jest/globals';
import {
  buildScopedIdempotencyKey,
  deriveIdempotencyKeyFromBody,
  normalizeIdempotencyClientKey,
} from './idempotency-key.util';

describe('idempotency-key.util', () => {
  it('normalizes valid client keys', () => {
    expect(normalizeIdempotencyClientKey('  abcdefgh  ')).toBe('abcdefgh');
    expect(normalizeIdempotencyClientKey('short')).toBeNull();
  });

  it('builds scoped keys', () => {
    expect(buildScopedIdempotencyKey('order:create', 'key-1')).toBe('order:create:key-1');
  });

  it('derives keys from body fields', () => {
    const key = deriveIdempotencyKeyFromBody(
      { provider: 'MOCK', providerTradeNo: 'TX_001', event: 'paid' },
      ['provider', 'providerTradeNo', 'event'],
    );
    expect(key).toBe('MOCK:TX_001:paid');
  });
});
