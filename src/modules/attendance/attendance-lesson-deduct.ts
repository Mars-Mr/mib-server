import { MembershipStatus, Prisma } from '@prisma/client';
import {
  buildCheckInBusinessKey,
  lessonTransactionCreateData,
} from '../../common/prisma/lesson-transaction';
import {
  incrementMembershipLessons,
  tryDecrementMembershipLessons,
} from '../../common/prisma/membership-lessons';
import { isPrismaUniqueViolation } from '../../common/utils/prisma-errors';

export const CHECKIN_DEDUCT_REASON = 'CLASS_CHECK_IN';

export type LessonDeductTx = Prisma.TransactionClient;

export type LessonDeductOutcome = 'deducted' | 'already_deducted' | 'insufficient';

/** @deprecated Use buildCheckInBusinessKey */
export const buildCheckInDeductKey = buildCheckInBusinessKey;

export { buildCheckInBusinessKey };

export { isPrismaUniqueViolation } from '../../common/utils/prisma-errors';

/**
 * Idempotent lesson deduction inside an open transaction (DB source of truth).
 * Redis check-in lock is advisory only; relies on businessKey unique + conditional updateMany.
 */
export async function deductLessonsForCheckIn(
  tx: LessonDeductTx,
  studentId: string,
  scheduleId: string,
  deductAmount: number,
): Promise<LessonDeductOutcome> {
  if (deductAmount <= 0) return 'insufficient';

  const businessKey = buildCheckInBusinessKey(studentId, scheduleId);

  const existing = await tx.lessonTransaction.findFirst({
    where: {
      OR: [
        { businessKey },
        {
          scheduleId,
          reason: CHECKIN_DEDUCT_REASON,
          studentId,
        },
      ],
    },
  });
  if (existing) return 'already_deducted';

  const now = new Date();
  const cards = await tx.membershipCard.findMany({
    where: {
      studentId,
      status: MembershipStatus.ACTIVE,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
    orderBy: { validTo: 'asc' },
    select: { id: true, remainingLessons: true },
  });

  for (const card of cards) {
    const beforeRemaining = card.remainingLessons;
    const decremented = await tryDecrementMembershipLessons(tx, {
      membershipId: card.id,
      amount: deductAmount,
    });
    if (!decremented) continue;

    const afterRemaining = beforeRemaining - deductAmount;

    try {
      await tx.lessonTransaction.create({
        data: lessonTransactionCreateData({
          membershipId: card.id,
          studentId,
          scheduleId,
          delta: -deductAmount,
          reason: CHECKIN_DEDUCT_REASON,
          businessKey,
          beforeRemaining,
          afterRemaining,
          metadata: { source: 'check_in', scheduleId },
        }),
      });
      return 'deducted';
    } catch (error) {
      await incrementMembershipLessons(tx, card.id, deductAmount);

      if (isPrismaUniqueViolation(error)) {
        const winner = await tx.lessonTransaction.findFirst({
          where: {
            OR: [
              { businessKey },
              {
                scheduleId,
                reason: CHECKIN_DEDUCT_REASON,
                studentId,
              },
            ],
          },
        });
        if (winner) return 'already_deducted';
      }

      throw error;
    }
  }

  return 'insufficient';
}
