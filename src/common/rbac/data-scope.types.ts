import type { UserRole } from '@prisma/client';
import type { PermissionCode } from './permission.codes';

/** How row-level filters are applied — separate from functional permissions. */
export type DataScopeKind = 'all' | 'organization' | 'coach_owned' | 'self';

export type AccessContext = {
  userId: string;
  role: UserRole;
  permissions: PermissionCode[];
  /** Tenants the user may access (primary + memberships). */
  tenantIds: string[];
  /** Active tenant from `X-Tenant-Id` when valid. */
  activeTenantId?: string;
  coachId?: string;
  studentId?: string;
  dataScope: DataScopeKind;
};
