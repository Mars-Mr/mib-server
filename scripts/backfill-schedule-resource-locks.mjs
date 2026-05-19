#!/usr/bin/env node
/**
 * One-time backfill of ScheduleResourceLock for existing non-cancelled schedules.
 * Usage: node scripts/backfill-schedule-resource-locks.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, ScheduleResourceType, ScheduleStatus } from '@prisma/client';

config({ path: resolve(process.cwd(), '.env') });

const SLOT_MS = 15 * 60 * 1000;

function buildTimeSlotKeys(startsAt, endsAt) {
  const keys = [];
  let slotStartMs = Math.floor(startsAt.getTime() / SLOT_MS) * SLOT_MS;
  const endMs = endsAt.getTime();
  while (slotStartMs < endMs) {
    keys.push(String(slotStartMs));
    slotStartMs += SLOT_MS;
  }
  return keys;
}

function buildRows(scheduleId, coachId, venueId, startsAt, endsAt) {
  const rows = [];
  for (const timeSlotKey of buildTimeSlotKeys(startsAt, endsAt)) {
    rows.push({ resourceType: ScheduleResourceType.COACH, resourceId: coachId, timeSlotKey, scheduleId });
    rows.push({ resourceType: ScheduleResourceType.VENUE, resourceId: venueId, timeSlotKey, scheduleId });
  }
  return rows;
}

const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.schedule.findMany({
    where: { status: { not: ScheduleStatus.CANCELLED } },
    select: { id: true, coachId: true, venueId: true, startsAt: true, endsAt: true },
  });

  let inserted = 0;
  let skipped = 0;

  for (const s of schedules) {
    const existing = await prisma.scheduleResourceLock.count({ where: { scheduleId: s.id } });
    if (existing > 0) {
      skipped += 1;
      continue;
    }
    const rows = buildRows(s.id, s.coachId, s.venueId, s.startsAt, s.endsAt);
    try {
      await prisma.scheduleResourceLock.createMany({ data: rows, skipDuplicates: true });
      inserted += 1;
    } catch (e) {
      console.warn(`Conflict backfilling schedule ${s.id}:`, e.message);
    }
  }

  console.log(`Backfill done: ${inserted} schedules locked, ${skipped} skipped (already had locks).`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
