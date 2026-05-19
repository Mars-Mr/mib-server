import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MembershipStatus, Prisma } from '@prisma/client';
import {
  buildCheckInBusinessKey,
  deductLessonsForCheckIn,
  isPrismaUniqueViolation,
} from './attendance-lesson-deduct';

describe('deductLessonsForCheckIn', () => {
  const studentId = 'student-1';
  const scheduleId = 'schedule-1';
  const businessKey = buildCheckInBusinessKey(studentId, scheduleId);

  const tx = {
    lessonTransaction: {
      findFirst: jest.fn<() => Promise<unknown>>(),
      create: jest.fn<() => Promise<unknown>>(),
    },
    membershipCard: {
      findMany: jest.fn<() => Promise<unknown>>(),
      updateMany: jest.fn<() => Promise<unknown>>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns already_deducted when businessKey exists', async () => {
    tx.lessonTransaction.findFirst.mockResolvedValue({ id: 'tx-1', businessKey });

    const result = await deductLessonsForCheckIn(tx as never, studentId, scheduleId, 1);

    expect(result).toBe('already_deducted');
    expect(tx.membershipCard.findMany).not.toHaveBeenCalled();
  });

  it('returns deducted when conditional update succeeds', async () => {
    tx.lessonTransaction.findFirst.mockResolvedValue(null);
    tx.membershipCard.findMany.mockResolvedValue([{ id: 'card-a', remainingLessons: 10 }]);
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });
    tx.lessonTransaction.create.mockResolvedValue({ id: 'tx-new' });

    const result = await deductLessonsForCheckIn(tx as never, studentId, scheduleId, 2);

    expect(result).toBe('deducted');
    expect(tx.membershipCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          remainingLessons: expect.anything(),
        }),
      }),
    );
    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-a', remainingLessons: { gte: 2 } },
      data: { remainingLessons: { decrement: 2 } },
    });
  });

  it('tries next card when first conditional update returns count 0', async () => {
    tx.lessonTransaction.findFirst.mockResolvedValue(null);
    tx.membershipCard.findMany.mockResolvedValue([
      { id: 'card-a', remainingLessons: 1 },
      { id: 'card-b', remainingLessons: 5 },
    ]);
    tx.membershipCard.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    tx.lessonTransaction.create.mockResolvedValue({ id: 'tx-new' });

    const result = await deductLessonsForCheckIn(tx as never, studentId, scheduleId, 2);

    expect(result).toBe('deducted');
  });

  it('returns already_deducted on unique conflict when winner row exists', async () => {
    tx.lessonTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'tx-winner', businessKey });
    tx.membershipCard.findMany.mockResolvedValue([{ id: 'card-a', remainingLessons: 10 }]);
    tx.membershipCard.updateMany.mockResolvedValue({ count: 1 });
    const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    tx.lessonTransaction.create.mockRejectedValue(uniqueError);

    const result = await deductLessonsForCheckIn(tx as never, studentId, scheduleId, 1);

    expect(result).toBe('already_deducted');
    expect(tx.membershipCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card-a' },
        data: expect.objectContaining({ remainingLessons: { increment: 1 } }),
      }),
    );
  });

  it('returns insufficient when no card has enough lessons', async () => {
    tx.lessonTransaction.findFirst.mockResolvedValue(null);
    tx.membershipCard.findMany.mockResolvedValue([]);
    const result = await deductLessonsForCheckIn(tx as never, studentId, scheduleId, 1);
    expect(result).toBe('insufficient');
  });
});

describe('isPrismaUniqueViolation', () => {
  it('detects P2002', () => {
    const err = new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: 't' });
    expect(isPrismaUniqueViolation(err)).toBe(true);
  });
});
