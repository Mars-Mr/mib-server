import { randomBytes } from 'crypto';

/** Human-readable merchant order number (unique index enforced in DB). */
export function generateOrderNo(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `ORD${Date.now()}${suffix}`;
}
