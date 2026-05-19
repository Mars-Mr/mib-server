import { describe, expect, it } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { scheduleDataScopeWhere, studentDataScopeWhere } from './data-scope.filters';
import type { AccessContext } from './data-scope.types';
import { Permission } from './permission.codes';

function ctx(partial: Partial<AccessContext>): AccessContext {
  return {
    userId: 'u1',
    role: UserRole.COACH,
    permissions: [Permission.SCHEDULES_READ],
    tenantIds: ['tenant-1'],
    dataScope: 'coach_owned',
    ...partial,
  };
}

describe('data-scope.filters', () => {
  it('coach_owned limits schedules to coachId', () => {
    expect(scheduleDataScopeWhere(ctx({ coachId: 'c1', dataScope: 'coach_owned' }))).toEqual({
      coachId: 'c1',
    });
  });

  it('coach_owned limits students via classes or attendance', () => {
    const where = studentDataScopeWhere(ctx({ coachId: 'c1', dataScope: 'coach_owned' }));
    expect(where?.OR).toHaveLength(2);
  });

  it('organization scopes students by tenantId', () => {
    expect(
      studentDataScopeWhere(ctx({ dataScope: 'organization', tenantIds: ['tenant-a'] })),
    ).toEqual({ tenantId: { in: ['tenant-a'] } });
  });
});
