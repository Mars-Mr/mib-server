export type NodeEnv = 'development' | 'production' | 'test';

export interface EnvConfig {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AUTH_LOGIN_MAX_ATTEMPTS: number;
  AUTH_LOGIN_WINDOW_SECONDS: number;
  /** Consecutive failures before account lock (default 5). */
  AUTH_LOGIN_LOCK_AFTER_FAILURES: number;
  /** Account lock duration in seconds (300–900, default 900). */
  AUTH_LOGIN_LOCK_SECONDS: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_KEY_PREFIX: string;
  REDIS_CONNECT_TIMEOUT_MS: number;
  REDIS_COMMAND_TIMEOUT_MS: number;
  REDIS_MAX_RETRIES_PER_REQUEST: number | null;
  REDIS_ENABLE_READY_CHECK: boolean;
  REDIS_RETRY_BASE_DELAY_MS: number;
  REDIS_RETRY_MAX_DELAY_MS: number;
  REDIS_RETRY_MAX_ATTEMPTS?: number;
  MYSQL_ROOT_PASSWORD?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;
  MYSQL_USER?: string;
  MYSQL_PORT?: number;
  MYSQL_IMAGE?: string;
  LOG_LEVEL: string;
  LOG_SERVICE_NAME: string;
  APP_VERSION: string;
  HTTP_SLOW_REQUEST_MS: number;
  LOG_DIR: string;
  PAGE_VISIT_FLUSH_CRON: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: string;
  LOG_ZIP_ARCHIVE: boolean;
  PRISMA_LOG_QUERIES: boolean;
  SWAGGER_PATH: string;
  SWAGGER_ENABLED: boolean;
  SWAGGER_HOST: string;
  SWAGGER_BASIC_USER?: string;
  SWAGGER_BASIC_PASSWORD?: string;
  /** When true, only private/loopback IPs may access Swagger routes (recommended in production). */
  SWAGGER_INTERNAL_ONLY: boolean;
  PAYMENT_WEBHOOK_SECRET: string;
}
