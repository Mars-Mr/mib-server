import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithAuditUser } from '../audit/audit-context';
import { LEGACY_ORG_HEADER, TENANT_HEADER } from '../decorators/tenant-scope.decorator';
import { accessContextStorage } from './request-context';
import type { AccessContext } from './data-scope.types';

@Injectable()
export class AccessContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId?: string; access?: AccessContext } | undefined;

    const run = (handler: () => Observable<unknown>) =>
      runWithAuditUser(user?.userId, handler);

    if (!user?.access) {
      return run(() => next.handle());
    }

    const headerTenant =
      (req.headers[TENANT_HEADER] as string | undefined) ??
      (req.headers[LEGACY_ORG_HEADER] as string | undefined);

    const access: AccessContext =
      headerTenant && user.access.tenantIds.includes(headerTenant)
        ? { ...user.access, activeTenantId: headerTenant }
        : user.access;

    return run(() => accessContextStorage.run(access, () => next.handle()));
  }
}
