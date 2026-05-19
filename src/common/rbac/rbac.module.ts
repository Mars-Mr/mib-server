import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AccessContextInterceptor } from './access-context.interceptor';
import { AccessContextService } from './access-context.service';
import { DataScopeService } from './data-scope.service';

@Global()
@Module({
  providers: [
    AccessContextService,
    DataScopeService,
    { provide: APP_INTERCEPTOR, useClass: AccessContextInterceptor },
  ],
  exports: [AccessContextService, DataScopeService],
})
export class RbacModule {}
