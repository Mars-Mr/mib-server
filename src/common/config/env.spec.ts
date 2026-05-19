import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DEV_JWT_SECRET, DEV_PAYMENT_WEBHOOK_SECRET } from './env.constants';
import { getJwtExpiresIn } from './env';
import { resetEnvConfigCache, validateEnvConfig } from './env.schema';

describe('environment config', () => {
  beforeEach(() => {
    resetEnvConfigCache();
  });

  afterEach(() => {
    resetEnvConfigCache();
  });

  it('uses a development-only JWT secret fallback outside production', () => {
    const config = validateEnvConfig({ NODE_ENV: 'development' });
    expect(config.JWT_SECRET).toBe(DEV_JWT_SECRET);
  });

  it('rejects missing JWT_SECRET in production', () => {
    expect(() => validateEnvConfig({ NODE_ENV: 'production' })).toThrow('JWT_SECRET');
  });

  it('rejects built-in dev JWT_SECRET in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: DEV_JWT_SECRET,
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
        PAYMENT_WEBHOOK_SECRET: 'production_payment_webhook_secret_32',
      }),
    ).toThrow('JWT_SECRET');
  });

  it('rejects dev PAYMENT_WEBHOOK_SECRET in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
        PAYMENT_WEBHOOK_SECRET: DEV_PAYMENT_WEBHOOK_SECRET,
      }),
    ).toThrow('PAYMENT_WEBHOOK_SECRET');
  });

  it('rejects forbidden JWT_SECRET in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'your_jwt_secret_key_123456',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
      }),
    ).toThrow('JWT_SECRET');
  });

  it('requires REDIS_PASSWORD and MYSQL_ROOT_PASSWORD in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
      }),
    ).toThrow('REDIS_PASSWORD');

    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
      }),
    ).toThrow('MYSQL_ROOT_PASSWORD');
  });

  it('rejects DATABASE_URL with default password segment in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://root:password@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
      }),
    ).toThrow('DATABASE_URL');
  });

  it('parses numeric JWT expiration values', () => {
    validateEnvConfig({ NODE_ENV: 'development', JWT_EXPIRES_IN: '3600' });
    expect(getJwtExpiresIn()).toBe(3600);
  });

  it('defaults swagger off in production when unset', () => {
    const config = validateEnvConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
      DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
      REDIS_PASSWORD: 'strong_redis_password_16',
      MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
      PAYMENT_WEBHOOK_SECRET: 'production_payment_webhook_secret_32',
    });
    expect(config.SWAGGER_ENABLED).toBe(false);
  });

  it('requires PAYMENT_WEBHOOK_SECRET in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
      }),
    ).toThrow('PAYMENT_WEBHOOK_SECRET');
  });

  it('requires swagger basic auth when swagger is enabled in production', () => {
    expect(() =>
      validateEnvConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
        DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
        REDIS_PASSWORD: 'strong_redis_password_16',
        MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
        PAYMENT_WEBHOOK_SECRET: 'production_payment_webhook_secret_32',
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow('SWAGGER_BASIC_USER');
  });

  it('allows swagger in production when basic auth credentials are set', () => {
    const config = validateEnvConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'production_jwt_secret_at_least_32_chars',
      DATABASE_URL: 'mysql://user:strongpass@localhost:3306/mib',
      REDIS_PASSWORD: 'strong_redis_password_16',
      MYSQL_ROOT_PASSWORD: 'strong_mysql_root_pass',
      PAYMENT_WEBHOOK_SECRET: 'production_payment_webhook_secret_32',
      SWAGGER_ENABLED: '1',
      SWAGGER_BASIC_USER: 'docs_admin',
      SWAGGER_BASIC_PASSWORD: 'production_swagger_docs_pw',
    });
    expect(config.SWAGGER_ENABLED).toBe(true);
    expect(config.SWAGGER_INTERNAL_ONLY).toBe(true);
  });

  it('defaults swagger internal-only off in development', () => {
    const config = validateEnvConfig({ NODE_ENV: 'development' });
    expect(config.SWAGGER_ENABLED).toBe(true);
    expect(config.SWAGGER_INTERNAL_ONLY).toBe(false);
  });
});
