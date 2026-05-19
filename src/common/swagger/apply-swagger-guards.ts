import type { INestApplication } from '@nestjs/common';
import type { RequestHandler } from 'express';
import type { EnvConfig } from '../config/env.types';
import { swaggerBasicAuthMiddleware } from './swagger-basic-auth.middleware';
import { swaggerInternalNetworkMiddleware } from './swagger-internal-network.middleware';

function mountGuards(app: INestApplication, paths: string[], handlers: RequestHandler[]): void {
  for (const route of paths) {
    for (const handler of handlers) {
      app.use(route, handler);
    }
  }
}

/**
 * Production: Basic Auth is mandatory when Swagger is on.
 * Optional `SWAGGER_INTERNAL_ONLY` limits docs to private/loopback IPs (set `trust proxy` behind LB).
 */
export function applySwaggerGuards(
  app: INestApplication,
  env: EnvConfig,
  docPaths: { ui: string; json: string; yaml: string },
): void {
  const isProd = env.NODE_ENV === 'production';
  const hasBasicAuth = Boolean(env.SWAGGER_BASIC_USER && env.SWAGGER_BASIC_PASSWORD);

  if (isProd && !hasBasicAuth) {
    throw new Error(
      'SWAGGER_ENABLED is true in production but SWAGGER_BASIC_USER / SWAGGER_BASIC_PASSWORD are missing. ' +
        'Set strong credentials or set SWAGGER_ENABLED=0.',
    );
  }

  const handlers: RequestHandler[] = [];

  if (env.SWAGGER_INTERNAL_ONLY) {
    handlers.push(swaggerInternalNetworkMiddleware());
  }

  if (hasBasicAuth) {
    handlers.push(swaggerBasicAuthMiddleware(env.SWAGGER_BASIC_USER!, env.SWAGGER_BASIC_PASSWORD!));
  }

  if (handlers.length) {
    mountGuards(app, [docPaths.ui, docPaths.json, docPaths.yaml], handlers);
  }
}
