import { PrismaClient, UserRole } from '@prisma/client';
import {
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_NAME,
  ROLE_PERMISSION_MAP,
  permissionDescriptions,
  roleDisplayName,
} from '../src/common/rbac/rbac-seed.data';

export async function seedRbac(prisma: PrismaClient): Promise<{ tenantId: string }> {
  const tenant = await prisma.tenant.upsert({
    where: { code: DEFAULT_TENANT_CODE },
    create: { code: DEFAULT_TENANT_CODE, name: DEFAULT_TENANT_NAME },
    update: { name: DEFAULT_TENANT_NAME },
  });

  for (const { code, description } of permissionDescriptions()) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description },
      update: { description },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permByCode = new Map(allPerms.map(p => [p.code, p.id]));

  for (const roleCode of Object.values(UserRole)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      create: { code: roleCode, name: roleDisplayName(roleCode) },
      update: { name: roleDisplayName(roleCode) },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const codes = ROLE_PERMISSION_MAP[roleCode];
    const permissionIds = codes.map(c => permByCode.get(c)).filter((id): id is string => !!id);

    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({ roleId: role.id, permissionId })),
      });
    }
  }

  return { tenantId: tenant.id };
}

/** @deprecated Use return value `tenantId` */
export type SeedRbacResult = { tenantId: string; organizationId?: string };
