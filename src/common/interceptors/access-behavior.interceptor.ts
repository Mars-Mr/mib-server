import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';
import { USER_BEHAVIOR_KEY } from '../decorators/user-behavior.decorator';
import { PageVisitAccumulatorService } from '../logger/page-visit.accumulator';
import { WinstonLoggersService } from '../logger/winston-loggers.service';

function stripQuery(url: string): string {
  return url.split('?')[0] ?? url;
}

/** Collapse UUID / long id / numeric id segments for page-visit aggregation keys. */
export function normalizeRouteKey(method: string, url: string): string {
  let path = stripQuery(url);
  path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id');
  path = path.replace(/\/[0-9a-f-]{24,}(?=\/|$)/gi, '/:id');
  path = path.replace(/\/\d+(?=\/|$)/g, '/:num');
  return `${method} ${path}`;
}

function safeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const o = { ...(body as Record<string, unknown>) };
  for (const k of ['password', 'passwordHash', 'token', 'authorization', 'refreshToken', 'accessToken', 'secret']) delete o[k];
  return o;
}

function slowRequestThresholdMs(): number {
  const raw = process.env.HTTP_SLOW_REQUEST_MS;
  if (raw === undefined || raw === '') return 2000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 2000;
}

function isMutation(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

@Injectable()
export class AccessBehaviorInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly winston: WinstonLoggersService,
    private readonly pageVisits: PageVisitAccumulatorService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const started = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap({
        finalize: () => {
          const res = context.switchToHttp().getResponse<Response>();
          const durationMs = Date.now() - started;
          const pathOnly = stripQuery(req.originalUrl || req.url || '');
          const routeKey = normalizeRouteKey(req.method, req.originalUrl || req.url || '');

          const threshold = slowRequestThresholdMs();
          const isSlow = durationMs >= threshold && pathOnly !== '/health';

          if (pathOnly !== '/health') {
            this.pageVisits.increment(routeKey);
            this.winston.logHttpAccess({
              type: 'http_access',
              reqId: req.id,
              requestId: req.id,
              method: req.method,
              path: pathOnly,
              routeKey,
              statusCode: res.statusCode,
              durationMs,
              slow: isSlow,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              userId: req.user?.userId,
              username: req.user?.username,
              role: req.user?.role,
              body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? safeBody(req.body) : undefined,
            });
          }

          if (isSlow) {
            this.winston.logApplication('warn', 'slow_http_request', {
              type: 'slow_http',
              requestId: req.id,
              method: req.method,
              path: pathOnly,
              routeKey,
              statusCode: res.statusCode,
              durationMs,
              thresholdMs: threshold,
              userId: req.user?.userId,
            });
          }

          const explicit = this.reflector.getAllAndOverride<string>(USER_BEHAVIOR_KEY, [context.getHandler(), context.getClass()]);
          const auditDesc = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]);
          if (pathOnly === '/health') return;

          if (auditDesc) {
            this.winston.logAudit({
              type: 'audit',
              action: auditDesc,
              reqId: req.id,
              requestId: req.id,
              method: req.method,
              path: pathOnly,
              userId: req.user?.userId,
              username: req.user?.username,
              role: req.user?.role,
              statusCode: res.statusCode,
              durationMs,
            });
          }

          if (explicit) {
            this.winston.logUserBehavior({
              type: 'user_behavior',
              action: explicit,
              reqId: req.id,
              requestId: req.id,
              method: req.method,
              path: pathOnly,
              userId: req.user?.userId,
              username: req.user?.username,
              role: req.user?.role,
              statusCode: res.statusCode,
              durationMs,
            });
          } else if (isMutation(req.method)) {
            this.winston.logUserBehavior({
              type: 'user_behavior',
              action: `${req.method} ${pathOnly}`,
              reqId: req.id,
              requestId: req.id,
              method: req.method,
              path: pathOnly,
              userId: req.user?.userId,
              username: req.user?.username,
              role: req.user?.role,
              statusCode: res.statusCode,
              durationMs,
            });
          }
        },
      }),
    );
  }
}
