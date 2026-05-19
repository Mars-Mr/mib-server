import type { PermissionCode } from './permission.codes';

export function hasPermission(userPermissions: readonly string[] | undefined, required: string): boolean {
  if (!userPermissions?.length) return false;
  if (userPermissions.includes(required)) return true;
  return userPermissions.includes('*');
}

export function hasAnyPermission(
  userPermissions: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) return true;
  return required.some(p => hasPermission(userPermissions, p));
}

export function hasAllPermissions(
  userPermissions: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) return true;
  return required.every(p => hasPermission(userPermissions, p));
}

export function asPermissionCodes(codes: string[]): PermissionCode[] {
  return codes as PermissionCode[];
}
