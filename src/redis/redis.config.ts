import { RedisOptions } from 'ioredis';
import { REDIS_DEFAULT_KEY_PREFIX } from './redis.constants';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db: number;
  keyPrefix: string;
  connectTimeout: number;
  commandTimeout: number;
  maxRetriesPerRequest: number | null;
  enableReadyCheck: boolean;
  retryBaseDelay: number;
  retryMaxDelay: number;
  retryMaxAttempts?: number;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getRedisConfig(): RedisConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const maxRetriesPerRequest = process.env.REDIS_MAX_RETRIES_PER_REQUEST === 'null' ? null : toNumber(process.env.REDIS_MAX_RETRIES_PER_REQUEST, isProd ? 3 : 1);

  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: toNumber(process.env.REDIS_DB, 0),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? REDIS_DEFAULT_KEY_PREFIX,
    connectTimeout: toNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, isProd ? 10000 : 3000),
    commandTimeout: toNumber(process.env.REDIS_COMMAND_TIMEOUT_MS, isProd ? 5000 : 2000),
    maxRetriesPerRequest,
    enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== '0',
    retryBaseDelay: toNumber(process.env.REDIS_RETRY_BASE_DELAY_MS, isProd ? 200 : 100),
    retryMaxDelay: toNumber(process.env.REDIS_RETRY_MAX_DELAY_MS, isProd ? 5000 : 1000),
    retryMaxAttempts: isProd ? toOptionalNumber(process.env.REDIS_RETRY_MAX_ATTEMPTS) : toNumber(process.env.REDIS_RETRY_MAX_ATTEMPTS, 5),
  };
}

export function buildRedisOptions(config = getRedisConfig()): RedisOptions {
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix ? `${config.keyPrefix}:` : undefined,
    connectTimeout: config.connectTimeout,
    commandTimeout: config.commandTimeout,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: false,
    retryStrategy(times) {
      if (config.retryMaxAttempts !== undefined && times > config.retryMaxAttempts) {
        return null;
      }
      return Math.min(config.retryBaseDelay * 2 ** Math.min(times - 1, 8), config.retryMaxDelay);
    },
    reconnectOnError(error) {
      const message = error.message.toLowerCase();
      if (message.includes('readonly') || message.includes('etimedout') || message.includes('econnreset')) {
        return 2;
      }
      return false;
    },
  };
}
