import { RedisOptions } from 'ioredis';
import type { EnvConfig } from '../../common/config/env.types';
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

export function getRedisConfigFromEnv(env: EnvConfig): RedisConfig {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    username: env.REDIS_USERNAME || undefined,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX ?? REDIS_DEFAULT_KEY_PREFIX,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: env.REDIS_COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: env.REDIS_MAX_RETRIES_PER_REQUEST,
    enableReadyCheck: env.REDIS_ENABLE_READY_CHECK,
    retryBaseDelay: env.REDIS_RETRY_BASE_DELAY_MS,
    retryMaxDelay: env.REDIS_RETRY_MAX_DELAY_MS,
    retryMaxAttempts: env.REDIS_RETRY_MAX_ATTEMPTS,
  };
}

export function buildRedisOptions(config: RedisConfig): RedisOptions {
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
