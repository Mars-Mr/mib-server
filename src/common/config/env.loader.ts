import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { validateEnvConfig } from './env.schema';
import type { EnvConfig } from './env.types';

let dotenvLoaded = false;

function loadEnvFileIfExists(path: string, override: boolean): void {
  if (existsSync(path)) {
    loadDotenv({ path, override });
  }
}

/**
 * Load environment files (first match wins unless override):
 * - `.env`
 * - `.env.{NODE_ENV}` (e.g. `.env.production` on deploy — do not commit real secrets)
 */
export function loadEnvFile(): void {
  if (dotenvLoaded) return;

  const cwd = process.cwd();
  const base = resolve(cwd, '.env');
  loadEnvFileIfExists(base, false);

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const envSpecific = resolve(cwd, `.env.${nodeEnv}`);
  loadEnvFileIfExists(envSpecific, true);

  dotenvLoaded = true;
}

/** Load `.env` (once) and return validated configuration. */
export function getEnvConfig(): EnvConfig {
  loadEnvFile();
  return validateEnvConfig(process.env as Record<string, unknown>);
}
