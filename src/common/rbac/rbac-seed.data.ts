import { UserRole } from '@prisma/client';
import { ALL_PERMISSION_CODES, Permission, type PermissionCode } from './permission.codes';

export const DEFAULT_TENANT_CODE = 'default';
export const DEFAULT_TENANT_NAME = '默认租户';

/** @deprecated Use DEFAULT_TENANT_CODE */
export const DEFAULT_ORG_CODE = DEFAULT_TENANT_CODE;

/** @deprecated Use DEFAULT_TENANT_NAME */
export const DEFAULT_ORG_NAME = DEFAULT_TENANT_NAME;

const ROLE_NAMES: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.STAFF]: '教务',
  [UserRole.COACH]: '教练',
  [UserRole.STUDENT]: '学员',
};

const STAFF_COACH_READ: PermissionCode[] = [
  Permission.STUDENTS_READ,
  Permission.COACHES_READ,
  Permission.MEMBERSHIPS_READ,
  Permission.COURSE_TYPES_READ,
  Permission.CLASSES_READ,
  Permission.SCHEDULES_READ,
  Permission.VENUES_READ,
  Permission.ATTENDANCE_READ,
  Permission.STATISTICS_READ,
];

/** Default role → permission mapping (seeded to DB; adjustable without code deploy). */
export const ROLE_PERMISSION_MAP: Record<UserRole, PermissionCode[]> = {
  [UserRole.ADMIN]: [...ALL_PERMISSION_CODES],
  [UserRole.STAFF]: [
    ...STAFF_COACH_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_TAGS_WRITE,
    Permission.COACHES_WRITE,
    Permission.MEMBERSHIPS_WRITE,
    Permission.COURSE_TYPES_WRITE,
    Permission.CLASSES_WRITE,
    Permission.SCHEDULES_WRITE,
    Permission.VENUES_WRITE,
    Permission.ATTENDANCE_WRITE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
  ],
  [UserRole.COACH]: [...STAFF_COACH_READ, Permission.ATTENDANCE_CHECK_IN],
  [UserRole.STUDENT]: [
    Permission.SCHEDULES_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_CHECK_IN,
  ],
};

export function roleDisplayName(code: UserRole): string {
  return ROLE_NAMES[code];
}

export function permissionDescriptions(): { code: PermissionCode; description: string }[] {
  return [
    { code: Permission.ORG_CROSS, description: '跨租户访问（数据范围=all，不自动过滤 tenantId）' },
    { code: Permission.AUTH_USERS_READ, description: '查看后台用户' },
    { code: Permission.AUTH_USERS_WRITE, description: '创建/管理后台用户' },
    { code: Permission.STUDENTS_READ, description: '查看学员' },
    { code: Permission.STUDENTS_WRITE, description: '创建/编辑学员' },
    { code: Permission.STUDENTS_TAGS_WRITE, description: '管理学员标签/分组' },
    { code: Permission.COACHES_READ, description: '查看教练' },
    { code: Permission.COACHES_WRITE, description: '管理教练' },
    { code: Permission.MEMBERSHIPS_READ, description: '查看会员卡' },
    { code: Permission.MEMBERSHIPS_WRITE, description: '发卡/调课' },
    { code: Permission.COURSE_TYPES_READ, description: '查看课程类型' },
    { code: Permission.COURSE_TYPES_WRITE, description: '管理课程类型' },
    { code: Permission.CLASSES_READ, description: '查看班级' },
    { code: Permission.CLASSES_WRITE, description: '管理班级' },
    { code: Permission.SCHEDULES_READ, description: '查看排课' },
    { code: Permission.SCHEDULES_WRITE, description: '管理排课' },
    { code: Permission.VENUES_READ, description: '查看场地' },
    { code: Permission.VENUES_WRITE, description: '管理场地' },
    { code: Permission.ATTENDANCE_READ, description: '查看考勤' },
    { code: Permission.ATTENDANCE_WRITE, description: '管理考勤/请假审批' },
    { code: Permission.ATTENDANCE_CHECK_IN, description: '签到' },
    { code: Permission.STATISTICS_READ, description: '查看统计' },
    { code: Permission.BILLING_READ, description: '查看订单' },
    { code: Permission.BILLING_WRITE, description: '创建订单/支付回调' },
  ];
}
