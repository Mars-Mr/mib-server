/** Values that must never be used as secrets in production. */
export const FORBIDDEN_SECRET_VALUES = new Set([
  '',
  'password',
  'change_me_in_production',
  'your_jwt_secret_key_123456',
  'dev_only_jwt_secret_change_me_32_chars',
  'dev_payment_webhook_secret_32_chars',
  'change_me_swagger_password',
  'mib_password',
]);

/** Development-only fallbacks (never used when NODE_ENV=production). */
export const DEV_JWT_SECRET = 'dev_only_jwt_secret_change_me_32_chars';

export const DEV_PAYMENT_WEBHOOK_SECRET = 'dev_payment_webhook_secret_32_chars';

export const DEV_DATABASE_URL = 'mysql://root:password@localhost:3306/mib_server';

/** All built-in dev defaults — production must not use any of these. */
export const DEV_ONLY_SECRET_VALUES: readonly string[] = [
  DEV_JWT_SECRET,
  DEV_PAYMENT_WEBHOOK_SECRET,
  DEV_DATABASE_URL,
];

export const PRODUCTION_MIN_LENGTHS = {
  JWT_SECRET: 32,
  DATABASE_URL: 12,
  REDIS_PASSWORD: 16,
  MYSQL_ROOT_PASSWORD: 16,
  MYSQL_PASSWORD: 16,
  SWAGGER_BASIC_PASSWORD: 12,
  PAYMENT_WEBHOOK_SECRET: 32,
} as const;

export function isForbiddenSecretValue(value: string): boolean {
  return FORBIDDEN_SECRET_VALUES.has(value) || DEV_ONLY_SECRET_VALUES.includes(value);
}
