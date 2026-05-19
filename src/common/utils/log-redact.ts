const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'refreshtoken',
  'accesstoken',
  'secret',
  'qrToken',
]);

const PII_KEYS = new Set(['phone', 'emergencyphone']);

function maskPhone(value: string): string {
  if (value.length <= 4) return '****';
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

/** Redact sensitive / PII fields before writing logs. */
export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) continue;
    if (PII_KEYS.has(lower) && typeof val === 'string') {
      out[key] = maskPhone(val);
    } else if (val && typeof val === 'object') {
      out[key] = redactForLog(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}
