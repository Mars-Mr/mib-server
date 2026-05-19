import type { StringValue } from 'ms';
import { getEnvConfig, loadEnvFile } from './env.loader';
import type { EnvConfig } from './env.types';

export type { EnvConfig, NodeEnv } from './env.types';

/** @deprecated Prefer `getEnvConfig()` or inject `ConfigService`. */
export function validateEnvironment(): void {
  loadEnvFile();
  getEnvConfig();
}

export function getJwtSecret(): string {
  return getEnvConfig().JWT_SECRET;
}

export function getJwtExpiresIn(): StringValue | number {
  const value = getEnvConfig().JWT_EXPIRES_IN;
  const numeric = Number(value);
  return Number.isFinite(numeric) && value.trim() !== '' ? numeric : (value as StringValue);
}

/** JWT TTL in seconds (for token blacklist TTL). */
export function getJwtExpiresInSeconds(): number {
  const value = getEnvConfig().JWT_EXPIRES_IN.trim();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  const match = /^(\d+)\s*([smhd])$/i.exec(value);
  if (!match) return 7 * 24 * 3600;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return amount * factor;
}

export function getSwaggerBasicAuth(): { user: string; pass: string } | null {
  const { SWAGGER_BASIC_USER: user, SWAGGER_BASIC_PASSWORD: pass } = getEnvConfig();
  if (!user || !pass) return null;
  return { user, pass };
}

export function isProduction(): boolean {
  return getEnvConfig().NODE_ENV === 'production';
}
