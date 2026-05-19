import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { runWithoutTenantScope } from '../../infrastructure/prisma/tenant/tenant-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AccessContext } from './data-scope.types';
import { resolveDataScope } from './data-scope.filters';
import { asPermissionCodes } from './permission.utils';
import { ROLE_PERMISSION_MAP } from './rbac-seed.data';

@Injectable()
export class AccessContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string, role: UserRole, activeTenantId?: string): Promise<AccessContext> {
    return runWithoutTenantScope(() => this.buildInternal(userId, role, activeTenantId));
  }

  private async buildInternal(
    userId: string,
    role: UserRole,
    activeTenantId?: string,
  ): Promise<AccessContext> {
    const user = await (this.prisma as unknown as PrismaClient).user.findUnique({
      where: { id: userId },
      select: {
        tenantId: true,
        coach: { select: { id: true, tenantId: true } },
        student: { select: { id: true, tenantId: true } },
        tenants: { select: { tenantId: true, isPrimary: true } },
      },
    });

    const permissions = await this.loadPermissions(role);
    const tenantIds = this.collectTenantIds(user);
    const coachId = user?.coach?.id;
    const studentId = user?.student?.id;

    const dataScope = resolveDataScope(role, permissions, coachId, studentId);

    let resolvedActive: string | undefined;
    if (activeTenantId && tenantIds.includes(activeTenantId)) {
      resolvedActive = activeTenantId;
    }

    return {
      userId,
      role,
      permissions,
      tenantIds,
      activeTenantId: resolvedActive,
      coachId,
      studentId,
      dataScope,
    };
  }

  private async loadPermissions(role: UserRole): Promise<AccessContext['permissions']> {
    const dbRole = await runWithoutTenantScope(() =>
      (this.prisma as unknown as PrismaClient).role.findUnique({
        where: { code: role },
        include: { permissions: { include: { permission: true } } },
      }),
    );
    if (dbRole?.permissions.length) {
      return asPermissionCodes(dbRole.permissions.map(rp => rp.permission.code));
    }
    return ROLE_PERMISSION_MAP[role] ?? [];
  }

  private collectTenantIds(
    user: {
      tenantId: string | null;
      coach: { tenantId: string | null } | null;
      student: { tenantId: string | null } | null;
      tenants: { tenantId: string; isPrimary: boolean }[];
    } | null,
  ): string[] {
    const ids = new Set<string>();
    if (user?.tenantId) ids.add(user.tenantId);
    for (const m of user?.tenants ?? []) ids.add(m.tenantId);
    if (user?.coach?.tenantId) ids.add(user.coach.tenantId);
    if (user?.student?.tenantId) ids.add(user.student.tenantId);
    return [...ids];
  }
}
