import { describe, expect, it } from '@jest/globals';
import { ScheduleResourceType } from '@prisma/client';
import { buildScheduleResourceLockRows, buildTimeSlotKeys, SCHEDULE_SLOT_MINUTES } from './schedule-resource-lock';

describe('schedule resource locks', () => {
  it('builds 15-minute slot keys for a one-hour window', () => {
    const start = new Date('2026-05-20T10:00:00.000Z');
    const end = new Date('2026-05-20T11:00:00.000Z');
    const keys = buildTimeSlotKeys(start, end);
    expect(keys).toHaveLength(60 / SCHEDULE_SLOT_MINUTES);
  });

  it('builds coach and venue rows per slot', () => {
    const start = new Date('2026-05-20T10:00:00.000Z');
    const end = new Date('2026-05-20T10:30:00.000Z');
    const rows = buildScheduleResourceLockRows('sched-1', 'coach-1', 'venue-1', start, end);
    expect(rows).toHaveLength(4);
    expect(rows.filter(r => r.resourceType === ScheduleResourceType.COACH)).toHaveLength(2);
    expect(rows.filter(r => r.resourceType === ScheduleResourceType.VENUE)).toHaveLength(2);
  });
});
