import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RedisBusinessService } from '../../infrastructure/redis/redis-business.service';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
  IDEMPOTENCY_PROCESSING_POLL_MS,
  IDEMPOTENCY_PROCESSING_TTL_SECONDS,
  IDEMPOTENCY_PROCESSING_WAIT_MS,
  IDEMPOTENCY_RESULT_TTL_SECONDS,
  IDEMPOTENT_METADATA_KEY,
} from './idempotency.constants';
import {
  buildScopedIdempotencyKey,
  deriveIdempotencyKeyFromBody,
  normalizeIdempotencyClientKey,
} from './idempotency-key.util';
import type { RequestWithIdempotency } from './idempotency.request';
import type { IdempotentOptions } from './idempotency.types';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisBiz: RedisBusinessService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<IdempotentOptions | undefined>(
      IDEMPOTENT_METADATA_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithIdempotency>();
    const response = http.getResponse<Response>();

    const defaultStatusCode =
      this.reflector.get<number>(HttpCode, context.getHandler()) ??
      (request.method === 'POST' ? 201 : 200);

    return from(this.prepare(meta, request)).pipe(
      mergeMap(prepared => {
        if (prepared.kind === 'skip') return next.handle();
        if (prepared.kind === 'replay') {
          response.status(prepared.statusCode);
          return of(prepared.body);
        }

        const { scopeKey } = prepared;
        const successStatusCode = prepared.defaultStatusCode ?? defaultStatusCode;
        const resultTtl = meta.resultTtlSeconds ?? IDEMPOTENCY_RESULT_TTL_SECONDS;

        return next.handle().pipe(
          mergeMap(body =>
            from(
              (async () => {
                const code =
                  response.statusCode >= 200 && response.statusCode < 600
                    ? response.statusCode
                    : successStatusCode;
                if (code >= 200 && code < 300) {
                  await this.redisBiz.completeRequestIdempotency(
                    scopeKey,
                    { statusCode: code, body },
                    resultTtl,
                  );
                } else {
                  await this.redisBiz.failRequestIdempotency(scopeKey);
                }
                return body;
              })(),
            ),
          ),
          catchError(err =>
            from(this.redisBiz.failRequestIdempotency(scopeKey)).pipe(
              mergeMap(() => throwError(() => err)),
            ),
          ),
        );
      }),
    );
  }

  private async prepare(
    meta: IdempotentOptions,
    request: RequestWithIdempotency,
  ): Promise<
    | { kind: 'skip' }
    | { kind: 'replay'; statusCode: number; body: unknown }
    | { kind: 'proceed'; scopeKey: string; defaultStatusCode: number }
  > {
    const clientKey = this.resolveClientKey(request, meta);
    const required = meta.required !== false;

    if (!clientKey) {
      if (required) {
        throw new BadRequestException(
          `Idempotency-Key header is required (${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH} characters)`,
        );
      }
      return { kind: 'skip' };
    }

    const scopeKey = buildScopedIdempotencyKey(meta.scope, clientKey);
    request.idempotencyClientKey = clientKey;
    request.idempotencyScopeKey = scopeKey;

    const processingTtl = meta.processingTtlSeconds ?? IDEMPOTENCY_PROCESSING_TTL_SECONDS;
    const waitMs = meta.waitForProcessingMs ?? IDEMPOTENCY_PROCESSING_WAIT_MS;

    let begin = await this.redisBiz.beginRequestIdempotency(scopeKey, processingTtl);

    if (begin.action === 'in_progress') {
      const waited = await this.redisBiz.waitForRequestIdempotencyCompletion(
        scopeKey,
        waitMs,
        IDEMPOTENCY_PROCESSING_POLL_MS,
      );
      if (waited) {
        return { kind: 'replay', statusCode: waited.statusCode, body: waited.body };
      }
      begin = await this.redisBiz.beginRequestIdempotency(scopeKey, processingTtl);
    }

    if (begin.action === 'replay') {
      return { kind: 'replay', statusCode: begin.statusCode, body: begin.body };
    }

    if (begin.action === 'in_progress') {
      throw new ConflictException('相同幂等键的请求正在处理中，请稍后重试');
    }

    return { kind: 'proceed', scopeKey, defaultStatusCode: request.method === 'POST' ? 201 : 200 };
  }

  private resolveClientKey(request: RequestWithIdempotency, meta: IdempotentOptions): string | null {
    const header = request.headers[IDEMPOTENCY_KEY_HEADER];
    const fromHeader = normalizeIdempotencyClientKey(
      Array.isArray(header) ? header[0] : header,
    );
    if (fromHeader) return fromHeader;

    if (meta.bodyKeyFields?.length) {
      return deriveIdempotencyKeyFromBody(request.body, meta.bodyKeyFields);
    }
    return null;
  }
}
