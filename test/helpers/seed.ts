import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  AttendanceMethod,
  CourseKind,
  MembershipStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { buildScheduleResourceLockRows } from '../../src/modules/courses/schedule-resource-lock';
import { seedRbac } from '../../prisma/rbac-seed';

export type E2eSeed = {
  adminToken: string;
  coachToken: string;
  staffToken: string;
  adminUserId: string;
  coachUserId: string;
  coachId: string;
  studentId: string;
  courseTypeId: string;
  venueId: string;
  classId: string;
  scheduleId: string;
  membershipId: string;
  tenantId: string;
};

export async function seedE2eBase(prisma: PrismaClient): Promise<Omit<E2eSeed, 'adminToken' | 'coachToken' | 'staffToken'>> {
  const { tenantId } = await seedRbac(prisma);
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: { username: 'e2e_admin', passwordHash, role: UserRole.ADMIN, tenantId },
  });
  const coachUser = await prisma.user.create({
    data: { username: 'e2e_coach', passwordHash, role: UserRole.COACH, tenantId },
  });
  await prisma.user.create({
    data: { username: 'e2e_staff', passwordHash, role: UserRole.STAFF, tenantId },
  });

  const coach = await prisma.coach.create({
    data: { name: 'E2E Coach', phone: '10000000001', userId: coachUser.id, tenantId },
  });

  const student = await prisma.student.create({
    data: { name: 'E2E Student', phone: '10000000002', tenantId },
  });

  const courseType = await prisma.courseType.create({
    data: { kind: CourseKind.GROUP, name: 'E2E Yoga', defaultLessonDeduct: 1, tenantId },
  });

  const venue = await prisma.venue.create({
    data: { name: 'E2E Room A', tenantId },
  });

  const klass = await prisma.class.create({
    data: {
      courseTypeId: courseType.id,
      name: 'E2E Class',
      coachId: coach.id,
      maxStudents: 30,
      tenantId,
    },
  });

  await prisma.classStudent.create({
    data: { classId: klass.id, studentId: student.id },
  });

  const now = Date.now();
  const startsAt = new Date(now + 60 * 60 * 1000);
  const endsAt = new Date(now + 2 * 60 * 60 * 1000);

  const schedule = await prisma.schedule.create({
    data: {
      classId: klass.id,
      venueId: venue.id,
      coachId: coach.id,
      tenantId,
      startsAt,
      endsAt,
      lateGraceMinutes: 15,
    },
  });

  await prisma.scheduleResourceLock.createMany({
    data: buildScheduleResourceLockRows(schedule.id, coach.id, venue.id, startsAt, endsAt),
  });

  const membership = await prisma.membershipCard.create({
    data: {
      studentId: student.id,
      tenantId,
      title: 'E2E Card',
      totalLessons: 10,
      remainingLessons: 10,
      validFrom: new Date(now - 86400000),
      validTo: new Date(now + 86400000 * 365),
      status: MembershipStatus.ACTIVE,
    },
  });

  return {
    adminUserId: admin.id,
    coachUserId: coachUser.id,
    coachId: coach.id,
    studentId: student.id,
    courseTypeId: courseType.id,
    venueId: venue.id,
    classId: klass.id,
    scheduleId: schedule.id,
    membershipId: membership.id,
    tenantId,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function loginToken(
  prisma: PrismaClient,
  username: string,
  password: string,
  jwtSign: (payload: object) => string,
): Promise<string> {
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) throw new Error(`user ${username} not found`);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('bad password');
  return jwtSign({
    sub: user.id,
    username: user.username,
    role: user.role,
    jti: randomUUID(),
    tv: user.tokenVersion,
  });
}

/** Second venue/coach for conflict tests */
export async function seedSecondCoachAndVenue(prisma: PrismaClient, tenantId: string) {
  const coach2 = await prisma.coach.create({
    data: { name: 'E2E Coach 2', phone: '10000000003', tenantId },
  });
  const venue2 = await prisma.venue.create({
    data: { name: 'E2E Room B', tenantId },
  });
  return { coachId2: coach2.id, venueId2: venue2.id };
}

export { AttendanceMethod };
