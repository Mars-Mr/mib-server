import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  incrementMembershipLessons,
  tryDecrementMembershipLessons,
} from './membership-lessons';

describe('membership-lessons', () => {
  const tx = {
    membershipCard: {
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tryDecrementMembershipLessons uses conditional updateMany', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });

    const ok = await tryDecrementMembershipLessons(tx as never, {
      membershipId: 'card-1',
      amount: 2,
    });

    expect(ok).toBe(true);
    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', remainingLessons: { gte: 2 } },
      data: { remainingLessons: { decrement: 2 } },
    });
  });

  it('tryDecrementMembershipLessons returns false when count is 0', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 0 });

    const ok = await tryDecrementMembershipLessons(tx as never, {
      membershipId: 'card-1',
      amount: 1,
    });

    expect(ok).toBe(false);
  });

  it('tryDecrementMembershipLessons merges version predicates and bumps', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });

    await tryDecrementMembershipLessons(tx as never, {
      membershipId: 'card-1',
      amount: 3,
      where: { version: 2 },
      data: { version: { increment: 1 } },
    });

    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', version: 2, remainingLessons: { gte: 3 } },
      data: { version: { increment: 1 }, remainingLessons: { decrement: 3 } },
    });
  });

  it('incrementMembershipLessons uses atomic increment', async () => {
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });

    await incrementMembershipLessons(tx as never, 'card-1', 2);

    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: { remainingLessons: { increment: 2 } },
    });
  });
});
