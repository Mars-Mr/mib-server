import { ScheduleResourceType, Prisma } from '@prisma/client';
import { isPrismaUniqueViolation } from '../../common/utils/prisma-errors';

/**
 * Source of truth for coach/venue schedule conflicts (DB unique on resource + time slot).
 * Redis locks in CoursesService only reduce contention before this insert runs.
 */

/** Time slice granularity for resource locks (minutes). */
export const SCHEDULE_SLOT_MINUTES = 15;

const SLOT_MS = SCHEDULE_SLOT_MINUTES * 60 * 1000;

export type ScheduleResourceLockTx = Prisma.TransactionClient;

export function buildTimeSlotKeys(startsAt: Date, endsAt: Date): string[] {
  const keys: string[] = [];
  let slotStartMs = Math.floor(startsAt.getTime() / SLOT_MS) * SLOT_MS;
  const endMs = endsAt.getTime();
  while (slotStartMs < endMs) {
    keys.push(String(slotStartMs));
    slotStartMs += SLOT_MS;
  }
  return keys;
}

export function buildScheduleResourceLockRows(
  scheduleId: string,
  coachId: string,
  venueId: string,
  startsAt: Date,
  endsAt: Date,
): Array<{
  resourceType: ScheduleResourceType;
  resourceId: string;
  timeSlotKey: string;
  scheduleId: string;
}> {
  const slotKeys = buildTimeSlotKeys(startsAt, endsAt);
  const rows: Array<{
    resourceType: ScheduleResourceType;
    resourceId: string;
    timeSlotKey: string;
    scheduleId: string;
  }> = [];

  for (const timeSlotKey of slotKeys) {
    rows.push({
      resourceType: ScheduleResourceType.COACH,
      resourceId: coachId,
      timeSlotKey,
      scheduleId,
    });
    rows.push({
      resourceType: ScheduleResourceType.VENUE,
      resourceId: venueId,
      timeSlotKey,
      scheduleId,
    });
  }

  return rows;
}

/**
 * Insert discrete slot locks; unique index is the concurrency guarantee.
 */
export async function insertScheduleResourceLocks(
  tx: ScheduleResourceLockTx,
  scheduleId: string,
  coachId: string,
  venueId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  const rows = buildScheduleResourceLockRows(scheduleId, coachId, venueId, startsAt, endsAt);
  if (rows.length === 0) {
    throw new Error('SCHEDULE_EMPTY_TIME_RANGE');
  }

  try {
    await tx.scheduleResourceLock.createMany({ data: rows });
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      throw new Error('SCHEDULE_RESOURCE_CONFLICT');
    }
    throw error;
  }
}

export async function releaseScheduleResourceLocks(tx: ScheduleResourceLockTx, scheduleId: string): Promise<void> {
  await tx.scheduleResourceLock.deleteMany({ where: { scheduleId } });
}
