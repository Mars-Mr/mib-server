import { PrismaClient } from '@prisma/client';

const TABLES = [
  'ScheduleResourceLock',
  'LessonTransaction',
  'AttendanceRecord',
  'LeaveRequest',
  'ScheduleQrToken',
  'Schedule',
  'ClassStudent',
  'Class',
  'MembershipCard',
  'Order',
  'LoginEvent',
  'StudentTag',
  'StudentGroup',
  'Tag',
  'Group',
  'Student',
  'Coach',
  'Venue',
  'CourseType',
  'User',
] as const;

let prisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function resetDatabase(): Promise<void> {
  const client = getTestPrisma();
  await client.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }
  await client.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
