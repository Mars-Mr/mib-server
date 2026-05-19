import { z } from 'zod';
import {
  DEV_DATABASE_URL,
  DEV_JWT_SECRET,
  DEV_PAYMENT_WEBHOOK_SECRET,
  isForbiddenSecretValue,
  PRODUCTION_MIN_LENGTHS,
} from './env.constants';
import type { EnvConfig, NodeEnv } from './env.types';

const nodeEnvSchema = z.enum(['development', 'production', 'test']);

const rawEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.optional(),
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().optional(),
  AUTH_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().optional(),
  AUTH_LOGIN_LOCK_AFTER_FAILURES: z.coerce.number().int().positive().optional(),
  AUTH_LOGIN_LOCK_SECONDS: z.coerce.number().int().min(300).max(900).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).optional(),
  REDIS_KEY_PREFIX: z.string().optional(),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  REDIS_MAX_RETRIES_PER_REQUEST: z.string().optional(),
  REDIS_ENABLE_READY_CHECK: z.string().optional(),
  REDIS_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().optional(),
  REDIS_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().optional(),
  REDIS_RETRY_MAX_ATTEMPTS: z.string().optional(),
  MYSQL_ROOT_PASSWORD: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PORT: z.coerce.number().int().positive().optional(),
  MYSQL_IMAGE: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  LOG_SERVICE_NAME: z.string().optional(),
  APP_VERSION: z.string().optional(),
  HTTP_SLOW_REQUEST_MS: z.coerce.number().int().positive().optional(),
  LOG_DIR: z.string().optional(),
  PAGE_VISIT_FLUSH_CRON: z.string().optional(),
  LOG_MAX_SIZE: z.string().optional(),
  LOG_MAX_FILES: z.string().optional(),
  LOG_ZIP_ARCHIVE: z.string().optional(),
  PRISMA_LOG_QUERIES: z.string().optional(),
  SWAGGER_PATH: z.string().optional(),
  SWAGGER_ENABLED: z.string().optional(),
  SWAGGER_HOST: z.string().optional(),
  SWAGGER_BASIC_USER: z.string().optional(),
  SWAGGER_BASIC_PASSWORD: z.string().optional(),
  SWAGGER_INTERNAL_ONLY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
});

function normalizeRawEnv(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }
  return out;
}

function parseBoolFlag(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const s = String(value).toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return fallback;
}

function parseSwaggerEnabled(value: unknown, nodeEnv: NodeEnv): boolean {
  if (value === undefined) return nodeEnv !== 'production';
  return parseBoolFlag(value, nodeEnv !== 'production');
}

function isInsecureSecret(value: string, minLength: number): boolean {
  return value.length < minLength || isForbiddenSecretValue(value);
}

function assertProductionSecret(
  errors: string[],
  name: string,
  value: string | undefined,
  minLength: number,
  required = true,
) {
  if (!value) {
    if (required) errors.push(`Missing required environment variable: ${name}`);
    return;
  }
  if (isInsecureSecret(value, minLength)) {
    errors.push(`Insecure production environment variable: ${name}`);
  }
}

function assertDatabaseUrl(errors: string[], url: string | undefined) {
  if (!url) {
    errors.push('Missing required environment variable: DATABASE_URL');
    return;
  }
  if (isInsecureSecret(url, PRODUCTION_MIN_LENGTHS.DATABASE_URL)) {
    errors.push('Insecure production environment variable: DATABASE_URL');
    return;
  }
  if (/:password@/i.test(url)) {
    errors.push('Insecure production environment variable: DATABASE_URL (contains default password)');
  }
}

function validateProductionSecrets(config: EnvConfig): void {
  const errors: string[] = [];

  assertProductionSecret(errors, 'JWT_SECRET', config.JWT_SECRET, PRODUCTION_MIN_LENGTHS.JWT_SECRET);
  assertProductionSecret(
    errors,
    'PAYMENT_WEBHOOK_SECRET',
    config.PAYMENT_WEBHOOK_SECRET,
    PRODUCTION_MIN_LENGTHS.PAYMENT_WEBHOOK_SECRET,
  );
  assertDatabaseUrl(errors, config.DATABASE_URL);
  assertProductionSecret(errors, 'REDIS_PASSWORD', config.REDIS_PASSWORD, PRODUCTION_MIN_LENGTHS.REDIS_PASSWORD);
  assertProductionSecret(
    errors,
    'MYSQL_ROOT_PASSWORD',
    config.MYSQL_ROOT_PASSWORD,
    PRODUCTION_MIN_LENGTHS.MYSQL_ROOT_PASSWORD,
  );
  assertProductionSecret(
    errors,
    'MYSQL_PASSWORD',
    config.MYSQL_PASSWORD,
    PRODUCTION_MIN_LENGTHS.MYSQL_PASSWORD,
    false,
  );

  if (config.SWAGGER_ENABLED) {
    assertProductionSecret(errors, 'SWAGGER_BASIC_USER', config.SWAGGER_BASIC_USER, 1);
    assertProductionSecret(
      errors,
      'SWAGGER_BASIC_PASSWORD',
      config.SWAGGER_BASIC_PASSWORD,
      PRODUCTION_MIN_LENGTHS.SWAGGER_BASIC_PASSWORD,
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

function buildEnvConfig(parsed: z.infer<typeof rawEnvSchema>): EnvConfig {
  const nodeEnv: NodeEnv = parsed.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const redisMaxRetriesRaw = parsed.REDIS_MAX_RETRIES_PER_REQUEST;
  const redisMaxRetries =
    redisMaxRetriesRaw === 'null' ? null : redisMaxRetriesRaw ? Number(redisMaxRetriesRaw) : isProd ? 3 : 1;

  const redisRetryMaxAttemptsRaw = parsed.REDIS_RETRY_MAX_ATTEMPTS;
  const redisRetryMaxAttempts =
    redisRetryMaxAttemptsRaw === undefined || redisRetryMaxAttemptsRaw === ''
      ? isProd
        ? undefined
        : 5
      : Number(redisRetryMaxAttemptsRaw);

  const swaggerEnabled = parseSwaggerEnabled(parsed.SWAGGER_ENABLED, nodeEnv);

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    PORT: parsed.PORT ?? 3000,
    DATABASE_URL: parsed.DATABASE_URL ?? (isProd ? '' : DEV_DATABASE_URL),
    JWT_SECRET: parsed.JWT_SECRET ?? (isProd ? '' : DEV_JWT_SECRET),
    JWT_EXPIRES_IN: parsed.JWT_EXPIRES_IN ?? '7d',
    AUTH_LOGIN_MAX_ATTEMPTS: parsed.AUTH_LOGIN_MAX_ATTEMPTS ?? 10,
    AUTH_LOGIN_WINDOW_SECONDS: parsed.AUTH_LOGIN_WINDOW_SECONDS ?? 900,
    AUTH_LOGIN_LOCK_AFTER_FAILURES: parsed.AUTH_LOGIN_LOCK_AFTER_FAILURES ?? 5,
    AUTH_LOGIN_LOCK_SECONDS: parsed.AUTH_LOGIN_LOCK_SECONDS ?? 900,
    REDIS_HOST: parsed.REDIS_HOST ?? '127.0.0.1',
    REDIS_PORT: parsed.REDIS_PORT ?? 6379,
    REDIS_USERNAME: parsed.REDIS_USERNAME,
    REDIS_PASSWORD: parsed.REDIS_PASSWORD,
    REDIS_DB: parsed.REDIS_DB ?? 0,
    REDIS_KEY_PREFIX: parsed.REDIS_KEY_PREFIX ?? 'mib',
    REDIS_CONNECT_TIMEOUT_MS: parsed.REDIS_CONNECT_TIMEOUT_MS ?? (isProd ? 10000 : 3000),
    REDIS_COMMAND_TIMEOUT_MS: parsed.REDIS_COMMAND_TIMEOUT_MS ?? (isProd ? 5000 : 2000),
    REDIS_MAX_RETRIES_PER_REQUEST: Number.isFinite(redisMaxRetries) ? redisMaxRetries : isProd ? 3 : 1,
    REDIS_ENABLE_READY_CHECK: parseBoolFlag(parsed.REDIS_ENABLE_READY_CHECK, true),
    REDIS_RETRY_BASE_DELAY_MS: parsed.REDIS_RETRY_BASE_DELAY_MS ?? (isProd ? 200 : 100),
    REDIS_RETRY_MAX_DELAY_MS: parsed.REDIS_RETRY_MAX_DELAY_MS ?? (isProd ? 5000 : 1000),
    REDIS_RETRY_MAX_ATTEMPTS: Number.isFinite(redisRetryMaxAttempts) ? redisRetryMaxAttempts : undefined,
    MYSQL_ROOT_PASSWORD: parsed.MYSQL_ROOT_PASSWORD,
    MYSQL_PASSWORD: parsed.MYSQL_PASSWORD,
    MYSQL_DATABASE: parsed.MYSQL_DATABASE,
    MYSQL_USER: parsed.MYSQL_USER,
    MYSQL_PORT: parsed.MYSQL_PORT,
    MYSQL_IMAGE: parsed.MYSQL_IMAGE,
    LOG_LEVEL: parsed.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    LOG_SERVICE_NAME: parsed.LOG_SERVICE_NAME ?? 'mib-server',
    APP_VERSION: parsed.APP_VERSION ?? '0.0.1',
    HTTP_SLOW_REQUEST_MS: parsed.HTTP_SLOW_REQUEST_MS ?? 2000,
    LOG_DIR: parsed.LOG_DIR ?? 'logs',
    PAGE_VISIT_FLUSH_CRON: parsed.PAGE_VISIT_FLUSH_CRON ?? '*/5 * * * *',
    LOG_MAX_SIZE: parsed.LOG_MAX_SIZE ?? '20m',
    LOG_MAX_FILES: parsed.LOG_MAX_FILES ?? '14d',
    LOG_ZIP_ARCHIVE: parseBoolFlag(parsed.LOG_ZIP_ARCHIVE, false),
    PRISMA_LOG_QUERIES: parseBoolFlag(parsed.PRISMA_LOG_QUERIES, false),
    SWAGGER_PATH: parsed.SWAGGER_PATH ?? 'api-docs',
    SWAGGER_ENABLED: swaggerEnabled,
    SWAGGER_HOST: parsed.SWAGGER_HOST ?? 'localhost',
    SWAGGER_BASIC_USER: parsed.SWAGGER_BASIC_USER,
    SWAGGER_BASIC_PASSWORD: parsed.SWAGGER_BASIC_PASSWORD,
    SWAGGER_INTERNAL_ONLY: parseBoolFlag(parsed.SWAGGER_INTERNAL_ONLY, isProd && swaggerEnabled),
    PAYMENT_WEBHOOK_SECRET:
      parsed.PAYMENT_WEBHOOK_SECRET ?? (isProd ? '' : DEV_PAYMENT_WEBHOOK_SECRET),
  };

  return config;
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(issue => `${issue.path.join('.') || 'env'}: ${issue.message}`).join('; ');
}

let cachedConfig: EnvConfig | null = null;

export function resetEnvConfigCache(): void {
  cachedConfig = null;
}

/** Parse and validate environment; caches result for the process lifetime. */
export function validateEnvConfig(raw: Record<string, unknown>): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = rawEnvSchema.safeParse(normalizeRawEnv(raw));
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${formatZodError(result.error)}`);
  }

  const config = buildEnvConfig(result.data);
  if (config.NODE_ENV === 'production') {
    validateProductionSecrets(config);
  }

  cachedConfig = config;
  return config;
}
