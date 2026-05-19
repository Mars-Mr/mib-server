import type { UserRole } from '@prisma/client';
import type { AccessContext } from '../common/rbac/data-scope.types';
import type { PermissionCode } from '../common/rbac/permission.codes';

declare global {
  namespace Express {
    interface Request {
      /** Correlation / request id (also echoed as `x-request-id`) */
      id: string;
    }
    /** JWT 载荷挂载到 `req.user`（与 Passport 约定一致） */
    interface User {
      userId: string;
      username: string;
      role: UserRole;
      /** JWT ID — used for logout / revocation */
      jti: string;
      permissions: PermissionCode[];
      access: AccessContext;
    }
  }
}

export {};
