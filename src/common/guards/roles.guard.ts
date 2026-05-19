import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { hasAnyPermission } from '../rbac/permission.utils';

/**
 * Functional permissions (`@RequirePermissions`) and legacy role checks (`@Roles`).
 * Use with `JwtAuthGuard` on the same route/controller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length && !requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (requiredRoles?.length && requiredRoles.includes(user.role)) {
      return true;
    }

    if (requiredPermissions?.length) {
      if (hasAnyPermission(user.permissions, requiredPermissions)) return true;
      throw new ForbiddenException('权限不足');
    }

    return false;
  }
}
