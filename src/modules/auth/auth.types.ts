import type { UserRole } from '@prisma/client';
import type { AccessContext } from '../../common/rbac/data-scope.types';
import type { PermissionCode } from '../../common/rbac/permission.codes';

export type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  jti: string;
  tv: number;
};

export type AuthUser = {
  userId: string;
  username: string;
  role: UserRole;
  jti: string;
  permissions: PermissionCode[];
  access: AccessContext;
};
