import type { Request } from 'express';

export type RequestWithIdempotency = Request & {
  /** Client idempotency key resolved by IdempotencyInterceptor. */
  idempotencyClientKey?: string;
  /** Full Redis scope key: `{scope}:{clientKey}`. */
  idempotencyScopeKey?: string;
};
