/** Models that carry `tenantId` and are auto-filtered by the Prisma tenant extension. */
export const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Student',
  'Coach',
  'CourseType',
  'Class',
  'Schedule',
  'MembershipCard',
  'Order',
  'Venue',
]);

export type TenantScopedModel = typeof TENANT_SCOPED_MODELS extends Set<infer M> ? M : never;
