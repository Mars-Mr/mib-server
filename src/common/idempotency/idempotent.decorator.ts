import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
  IDEMPOTENT_METADATA_KEY,
} from './idempotency.constants';
import type { IdempotentOptions } from './idempotency.types';

export function Idempotent(scope: string, options?: Omit<IdempotentOptions, 'scope'>) {
  const meta: IdempotentOptions = { scope, ...options };
  return SetMetadata(IDEMPOTENT_METADATA_KEY, meta);
}

/** @Idempotent + Swagger Idempotency-Key header documentation. */
export function ApiIdempotent(scope: string, options?: Omit<IdempotentOptions, 'scope'>) {
  const required = options?.required !== false;
  return applyDecorators(
    Idempotent(scope, options),
    ApiHeader({
      name: 'Idempotency-Key',
      required,
      description: required
        ? `请求幂等键（${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH} 字符）。重复请求返回首次成功响应。`
        : `可选请求幂等键；未提供时可按业务字段派生（scope: ${scope}）。`,
      schema: {
        type: 'string',
        minLength: IDEMPOTENCY_KEY_MIN_LENGTH,
        maxLength: IDEMPOTENCY_KEY_MAX_LENGTH,
        example: `${scope}-7f3c2a1b-9e4d-4b2c-8a1f6d3e5c7b`,
      },
    }),
  );
}
