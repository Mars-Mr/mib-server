import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { auditOnCreate, getAuditUserId } from '../audit/audit-context';

/** Idempotency key for check-in lesson deduction. */
export function buildCheckInBusinessKey(studentId: string, scheduleId: string): string {
  return `checkin:${studentId}:${scheduleId}`;
}

/** Unique key per manual membership lesson adjustment. */
export function buildAdjustBusinessKey(membershipId: string): string {
  return `adjust:${membershipId}:${randomUUID()}`;
}

export type LessonTransactionMetadata = Prisma.InputJsonObject;

export type LessonTransactionWriteInput = {
  membershipId: string;
  studentId: string;
  delta: number;
  reason: string;
  businessKey: string;
  scheduleId?: string | null;
  beforeRemaining: number;
  afterRemaining: number;
  metadata?: LessonTransactionMetadata;
};

/** Prisma `lessonTransaction.create` payload with audit + operator fields. */
export function lessonTransactionCreateData(input: LessonTransactionWriteInput) {
  const operatorId = getAuditUserId();
  return {
    membershipId: input.membershipId,
    studentId: input.studentId,
    delta: input.delta,
    reason: input.reason,
    businessKey: input.businessKey,
    scheduleId: input.scheduleId ?? undefined,
    beforeRemaining: input.beforeRemaining,
    afterRemaining: input.afterRemaining,
    operatorId,
    metadata: input.metadata ?? undefined,
    ...auditOnCreate(),
  };
}
