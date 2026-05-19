import { Prisma } from '@prisma/client';
import { auditOnUpdate } from '../../common/audit/audit-context';
import { tryDecrementMembershipLessons } from '../../common/prisma/membership-lessons';

export type MembershipLessonAdjustTx = Prisma.TransactionClient;

export type LessonAdjustFailureReason = 'insufficient' | 'version_conflict';

export type LessonAdjustResult = { ok: true } | { ok: false; reason: LessonAdjustFailureReason };

/**
 * Atomically adjust remainingLessons with optimistic locking (version).
 * Positive delta: increment. Negative delta: conditional decrement.
 */
export async function applyMembershipLessonDelta(
  tx: MembershipLessonAdjustTx,
  membershipId: string,
  expectedVersion: number,
  delta: number,
): Promise<LessonAdjustResult> {
  if (delta > 0) {
    const updated = await tx.membershipCard.updateMany({
      where: { id: membershipId, version: expectedVersion },
      data: {
        remainingLessons: { increment: delta },
        version: { increment: 1 },
        ...auditOnUpdate(),
      },
    });
    return updated.count === 1 ? { ok: true } : { ok: false, reason: 'version_conflict' };
  }

  const amount = Math.abs(delta);
  const decremented = await tryDecrementMembershipLessons(tx, {
    membershipId,
    amount,
    where: { version: expectedVersion },
    data: { version: { increment: 1 }, ...auditOnUpdate() },
  });

  if (decremented) return { ok: true };

  const card = await tx.membershipCard.findUnique({
    where: { id: membershipId },
    select: { version: true, remainingLessons: true },
  });
  if (!card || card.version !== expectedVersion) {
    return { ok: false, reason: 'version_conflict' };
  }
  if (card.remainingLessons < amount) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: false, reason: 'version_conflict' };
}
