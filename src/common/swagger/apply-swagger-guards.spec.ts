import { describe, expect, it } from '@jest/globals';
import type { EnvConfig } from '../config/env.types';
import { applySwaggerGuards } from './apply-swagger-guards';

function prodEnv(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    NODE_ENV: 'production',
    SWAGGER_ENABLED: true,
    SWAGGER_PATH: 'api-docs',
    SWAGGER_HOST: 'localhost',
    SWAGGER_INTERNAL_ONLY: true,
    ...overrides,
  } as EnvConfig;
}

describe('applySwaggerGuards', () => {
  it('throws in production when basic auth is missing', () => {
    const app = { use: () => undefined } as never;
    expect(() =>
      applySwaggerGuards(app, prodEnv(), { ui: '/api-docs', json: '/api-docs-json', yaml: '/api-docs-yaml' }),
    ).toThrow(/SWAGGER_BASIC_USER/);
  });
});
