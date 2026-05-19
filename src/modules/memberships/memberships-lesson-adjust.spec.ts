import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { applyMembershipLessonDelta } from './memberships-lesson-adjust';

describe('applyMembershipLessonDelta', () => {
  const tx = {
    membershipCard: {
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
      findUnique: jest.fn<() => Promise<{ version: number; remainingLessons: number } | null>>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments remainingLessons and version for positive delta', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });

    const result = await applyMembershipLessonDelta(tx as never, 'card-1', 2, 3);

    expect(result).toEqual({ ok: true });
    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', version: 2 },
      data: {
        remainingLessons: { increment: 3 },
        version: { increment: 1 },
      },
    });
  });

  it('conditionally decrements for negative delta', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });

    const result = await applyMembershipLessonDelta(tx as never, 'card-1', 0, -2);

    expect(result).toEqual({ ok: true });
    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', version: 0, remainingLessons: { gte: 2 } },
      data: {
        remainingLessons: { decrement: 2 },
        version: { increment: 1 },
      },
    });
  });

  it('returns insufficient when balance too low', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 0 });
    tx.membershipCard.findUnique.mockResolvedValue({ version: 0, remainingLessons: 1 });

    const result = await applyMembershipLessonDelta(tx as never, 'card-1', 0, -2);

    expect(result).toEqual({ ok: false, reason: 'insufficient' });
  });

  it('returns version_conflict when version changed', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 0 });
    tx.membershipCard.findUnique.mockResolvedValue({ version: 3, remainingLessons: 10 });

    const result = await applyMembershipLessonDelta(tx as never, 'card-1', 2, -1);

    expect(result).toEqual({ ok: false, reason: 'version_conflict' });
  });
});
