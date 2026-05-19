export const DEFAULT_CURRENCY = 'CNY';

/** Format minor units (e.g. fen) as major currency string with 2 decimal places. */
export function formatAmountFromCents(amountCents: number, _currency: string = DEFAULT_CURRENCY): string {
  const major = amountCents / 100;
  return major.toFixed(2);
}

/** Parse a decimal yuan string to integer cents (half-up). */
export function yuanStringToCents(yuan: string): number {
  const trimmed = yuan.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid money string: ${yuan}`);
  }
  const negative = trimmed.startsWith('-');
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}
