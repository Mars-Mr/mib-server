import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
  providers: [
    IdempotencyInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: IdempotencyInterceptor,
    },
  ],
  exports: [IdempotencyInterceptor],
})
export class IdempotencyModule {}
