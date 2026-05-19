import { Prisma } from '@prisma/client';
import { auditOnUpdate } from '../audit/audit-context';

export type MembershipLessonTx = Prisma.TransactionClient;

export type DecrementMembershipLessonsOptions = {
  membershipId: string;
  amount: number;
  /** Extra WHERE predicates (e.g. version for optimistic locking). */
  where?: Omit<Prisma.MembershipCardWhereInput, 'id' | 'remainingLessons'>;
  /** Extra SET fields on successful decrement (e.g. version bump). */
  data?: Omit<Prisma.MembershipCardUpdateManyMutationInput, 'remainingLessons'>;
};

/**
 * Atomically decrement remainingLessons only when balance >= amount.
 * Do not read balance and write back a computed value.
 */
export async function tryDecrementMembershipLessons(
  tx: MembershipLessonTx,
  options: DecrementMembershipLessonsOptions,
): Promise<boolean> {
  const { membershipId, amount, where = {}, data = {} } = options;
  if (amount <= 0) return false;

  const updated = await tx.membershipCard.updateMany({
    where: {
      id: membershipId,
      ...where,
      remainingLessons: { gte: amount },
    },
    data: {
      ...data,
      remainingLessons: { decrement: amount },
      ...auditOnUpdate(),
    },
  });
  return updated.count === 1;
}

/** Compensating increment after a failed follow-up write (e.g. lesson transaction create). */
export async function incrementMembershipLessons(
  tx: MembershipLessonTx,
  membershipId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  await tx.membershipCard.updateMany({
    where: { id: membershipId },
    data: { remainingLessons: { increment: amount }, ...auditOnUpdate() },
  });
}
