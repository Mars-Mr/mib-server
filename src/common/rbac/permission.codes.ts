/** Functional permission codes (`resource:action`). */
export const Permission = {
  ORG_CROSS: 'org:cross',

  AUTH_USERS_READ: 'auth:users:read',
  AUTH_USERS_WRITE: 'auth:users:write',

  STUDENTS_READ: 'students:read',
  STUDENTS_WRITE: 'students:write',
  STUDENTS_TAGS_WRITE: 'students:tags:write',

  COACHES_READ: 'coaches:read',
  COACHES_WRITE: 'coaches:write',

  MEMBERSHIPS_READ: 'memberships:read',
  MEMBERSHIPS_WRITE: 'memberships:write',

  COURSE_TYPES_READ: 'course_types:read',
  COURSE_TYPES_WRITE: 'course_types:write',
  CLASSES_READ: 'classes:read',
  CLASSES_WRITE: 'classes:write',
  SCHEDULES_READ: 'schedules:read',
  SCHEDULES_WRITE: 'schedules:write',
  VENUES_READ: 'venues:read',
  VENUES_WRITE: 'venues:write',

  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_WRITE: 'attendance:write',
  ATTENDANCE_CHECK_IN: 'attendance:check_in',

  STATISTICS_READ: 'statistics:read',

  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(Permission);
