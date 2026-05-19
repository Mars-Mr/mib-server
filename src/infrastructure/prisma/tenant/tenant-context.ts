import { AsyncLocalStorage } from 'async_hooks';
import type { AccessContext } from '../../../common/rbac/data-scope.types';
import { getAccessContext } from '../../../common/rbac/request-context';

const tenantBypassStorage = new AsyncLocalStorage<boolean>();

export function isTenantBypass(): boolean {
  return tenantBypassStorage.getStore() === true;
}

/** Run DB ops without automatic `tenantId` filters (login, seed, platform jobs). */
export function runWithoutTenantScope<T>(fn: () => Promise<T>): Promise<T> {
  return tenantBypassStorage.run(true, fn);
}

export type TenantWhereClause = { tenantId: string } | { tenantId: { in: string[] } };

/**
 * Resolves automatic tenant filter for Prisma queries.
 * - `null` → no filter (unauthenticated or bypass)
 * - cross-tenant admin (`dataScope: all`) → no filter
 */
export function resolveTenantWhere(ctx?: AccessContext): TenantWhereClause | null {
  if (isTenantBypass()) return null;
  const access = ctx ?? getAccessContext();
  if (!access) return null;
  if (access.dataScope === 'all') return null;

  if (access.activeTenantId) {
    return { tenantId: access.activeTenantId };
  }
  if (access.tenantIds.length) {
    return { tenantId: { in: access.tenantIds } };
  }
  return { tenantId: '__no_tenant_access__' };
}

export function resolveTenantIdForWrite(ctx?: AccessContext): string | undefined {
  const access = ctx ?? getAccessContext();
  if (!access) return undefined;
  return access.activeTenantId ?? access.tenantIds[0];
}
