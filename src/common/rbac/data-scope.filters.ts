import type { Prisma } from '@prisma/client';
import type { AccessContext } from './data-scope.types';
import { Permission } from './permission.codes';
import { hasPermission } from './permission.utils';

function effectiveTenantIds(ctx: AccessContext): string[] {
  if (ctx.activeTenantId && ctx.tenantIds.includes(ctx.activeTenantId)) {
    return [ctx.activeTenantId];
  }
  return ctx.tenantIds;
}

export function studentDataScopeWhere(ctx: AccessContext | undefined): Prisma.StudentWhereInput | undefined {
  if (!ctx) return undefined;
  switch (ctx.dataScope) {
    case 'all':
      return undefined;
    case 'organization': {
      const tenantIds = effectiveTenantIds(ctx);
      if (!tenantIds.length) return { id: '__no_access__' };
      return { tenantId: { in: tenantIds } };
    }
    case 'coach_owned':
      if (!ctx.coachId) return { id: '__no_access__' };
      return {
        OR: [
          { classStudents: { some: { class: { coachId: ctx.coachId } } } },
          { attendanceRecords: { some: { schedule: { coachId: ctx.coachId } } } },
        ],
      };
    case 'self':
      return ctx.studentId ? { id: ctx.studentId } : { id: '__no_access__' };
    default:
      return undefined;
  }
}

export function scheduleDataScopeWhere(ctx: AccessContext | undefined): Prisma.ScheduleWhereInput | undefined {
  if (!ctx) return undefined;
  switch (ctx.dataScope) {
    case 'all':
      return undefined;
    case 'organization': {
      const tenantIds = effectiveTenantIds(ctx);
      if (!tenantIds.length) return { id: '__no_access__' };
      return {
        OR: [
          { tenantId: { in: tenantIds } },
          { venue: { tenantId: { in: tenantIds } } },
          { class: { tenantId: { in: tenantIds } } },
        ],
      };
    }
    case 'coach_owned':
      return ctx.coachId ? { coachId: ctx.coachId } : { id: '__no_access__' };
    case 'self':
      return ctx.studentId
        ? { class: { students: { some: { studentId: ctx.studentId } } } }
        : { id: '__no_access__' };
    default:
      return undefined;
  }
}

export function coachDataScopeWhere(ctx: AccessContext | undefined): Prisma.CoachWhereInput | undefined {
  if (!ctx) return undefined;
  switch (ctx.dataScope) {
    case 'all':
      return undefined;
    case 'organization': {
      const tenantIds = effectiveTenantIds(ctx);
      if (!tenantIds.length) return { id: '__no_access__' };
      return { tenantId: { in: tenantIds } };
    }
    case 'coach_owned':
      return ctx.coachId ? { id: ctx.coachId } : { id: '__no_access__' };
    case 'self':
      return { id: '__no_access__' };
    default:
      return undefined;
  }
}

export function classDataScopeWhere(ctx: AccessContext | undefined): Prisma.ClassWhereInput | undefined {
  if (!ctx) return undefined;
  switch (ctx.dataScope) {
    case 'all':
      return undefined;
    case 'organization': {
      const tenantIds = effectiveTenantIds(ctx);
      if (!tenantIds.length) return { id: '__no_access__' };
      return { tenantId: { in: tenantIds } };
    }
    case 'coach_owned':
      return ctx.coachId ? { coachId: ctx.coachId } : { id: '__no_access__' };
    case 'self':
      return ctx.studentId
        ? { students: { some: { studentId: ctx.studentId } } }
        : { id: '__no_access__' };
    default:
      return undefined;
  }
}

export function mergeWhere<T extends Record<string, unknown>>(
  base: T | undefined,
  scope: Record<string, unknown> | undefined,
): T {
  if (!scope) return (base ?? {}) as T;
  if (!base || !Object.keys(base).length) return scope as T;
  return { AND: [base, scope] } as unknown as T;
}

export function resolveDataScope(
  role: string,
  permissions: string[],
  coachId?: string,
  studentId?: string,
): AccessContext['dataScope'] {
  if (hasPermission(permissions, Permission.ORG_CROSS)) return 'all';
  if (studentId || role === 'STUDENT') return 'self';
  if (coachId || role === 'COACH') return 'coach_owned';
  return 'organization';
}
