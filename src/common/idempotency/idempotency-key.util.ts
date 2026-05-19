import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
} from './idempotency.constants';

export function normalizeIdempotencyClientKey(raw: string | undefined): string | null {
  const key = raw?.trim();
  if (!key) return null;
  if (key.length < IDEMPOTENCY_KEY_MIN_LENGTH || key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    return null;
  }
  return key;
}

export function buildScopedIdempotencyKey(scope: string, clientKey: string): string {
  return `${scope}:${clientKey}`;
}

export function getNestedBodyField(body: unknown, path: string): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = body;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function deriveIdempotencyKeyFromBody(body: unknown, fields: string[]): string | null {
  const parts: string[] = [];
  for (const field of fields) {
    const value = getNestedBodyField(body, field);
    if (value === undefined || value === null || value === '') return null;
    parts.push(String(value));
  }
  const derived = parts.join(':');
  return normalizeIdempotencyClientKey(derived) ?? (derived.length >= 8 ? derived.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH) : null);
}
