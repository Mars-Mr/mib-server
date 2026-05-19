import { describe, expect, it } from '@jest/globals';
import { formatAmountFromCents, yuanStringToCents } from './money';

describe('money', () => {
  it('formats cents to yuan string', () => {
    expect(formatAmountFromCents(399900)).toBe('3999.00');
    expect(formatAmountFromCents(9950)).toBe('99.50');
    expect(formatAmountFromCents(1)).toBe('0.01');
  });

  it('parses yuan string to cents', () => {
    expect(yuanStringToCents('3999')).toBe(399900);
    expect(yuanStringToCents('99.5')).toBe(9950);
    expect(yuanStringToCents('0.01')).toBe(1);
  });
});
