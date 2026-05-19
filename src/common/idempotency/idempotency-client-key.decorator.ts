import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithIdempotency } from './idempotency.request';

/** Client idempotency key (set when route uses @Idempotent / @ApiIdempotent). */
export const IdempotencyClientKey = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithIdempotency>();
  return request.idempotencyClientKey;
});
