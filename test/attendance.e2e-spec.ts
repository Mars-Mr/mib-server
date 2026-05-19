import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { AttendanceMethod } from '@prisma/client';
import { App } from 'supertest/types';
import { buildCheckInBusinessKey } from '../src/modules/attendance/attendance-lesson-deduct';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { seedE2eBase } from './helpers/seed';
import { api, authedApi } from './helpers/http';

describe('Attendance check-in (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let seed: Awaited<ReturnType<typeof seedE2eBase>>;

  beforeAll(async () => {
    await resetDatabase();
    seed = await seedE2eBase(getTestPrisma());
    app = await createE2eApp();
    const login = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    adminToken = login.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  async function resetAttendanceState(remainingLessons: number) {
    const prisma = getTestPrisma();
    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    await prisma.lessonTransaction.deleteMany({
      where: { OR: [{ businessKey }, { scheduleId: seed.scheduleId }] },
    });
    await prisma.attendanceRecord.deleteMany({
      where: { studentId: seed.studentId, scheduleId: seed.scheduleId },
    });
    await prisma.leaveRequest.deleteMany({
      where: { studentId: seed.studentId, scheduleId: seed.scheduleId },
    });
    await prisma.membershipCard.update({
      where: { id: seed.membershipId },
      data: { remainingLessons, version: 0 },
    });
  }

  function checkIn() {
    return authedApi(app, adminToken).post('/attendance/check-in').send({
      studentId: seed.studentId,
      scheduleId: seed.scheduleId,
      method: AttendanceMethod.MANUAL,
    });
  }

  it('check-in deducts one lesson', async () => {
    await resetAttendanceState(5);
    const res = await checkIn().expect(201);
    expect(res.body.deducted).toBe(true);

    const prisma = getTestPrisma();
    const card = await prisma.membershipCard.findUnique({ where: { id: seed.membershipId } });
    expect(card!.remainingLessons).toBe(4);

    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    const txCount = await prisma.lessonTransaction.count({ where: { businessKey } });
    expect(txCount).toBe(1);
  });

  it('repeat check-in does not deduct again', async () => {
    await resetAttendanceState(5);
    await checkIn().expect(201);
    const res = await checkIn().expect(201);
    expect(res.body.deducted).toBe(false);

    const prisma = getTestPrisma();
    const card = await prisma.membershipCard.findUnique({ where: { id: seed.membershipId } });
    expect(card!.remainingLessons).toBe(4);
    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    expect(await prisma.lessonTransaction.count({ where: { businessKey } })).toBe(1);
  });

  it('approved leave does not deduct', async () => {
    await resetAttendanceState(5);
    await authedApi(app, adminToken)
      .post('/attendance/leave-requests')
      .send({ studentId: seed.studentId, scheduleId: seed.scheduleId })
      .expect(201);

    const res = await checkIn().expect(201);
    expect(res.body.deducted).toBe(false);
    expect(res.body.attendance.status).toBe('LEAVE');

    const prisma = getTestPrisma();
    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    expect(await prisma.lessonTransaction.count({ where: { businessKey } })).toBe(0);
    const card = await prisma.membershipCard.findUnique({ where: { id: seed.membershipId } });
    expect(card!.remainingLessons).toBe(5);
  });

  it('does not deduct when remaining lessons insufficient', async () => {
    await resetAttendanceState(0);
    const res = await checkIn().expect(201);
    expect(res.body.deducted).toBe(false);

    const prisma = getTestPrisma();
    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    expect(await prisma.lessonTransaction.count({ where: { businessKey } })).toBe(0);
  });

  it('concurrent check-ins deduct at most once', async () => {
    await resetAttendanceState(1);
    const attempts = 20;
    await Promise.all(Array.from({ length: attempts }, () => checkIn()));

    const prisma = getTestPrisma();
    const attendanceCount = await prisma.attendanceRecord.count({
      where: { studentId: seed.studentId, scheduleId: seed.scheduleId },
    });
    expect(attendanceCount).toBe(1);

    const businessKey = buildCheckInBusinessKey(seed.studentId, seed.scheduleId);
    const txCount = await prisma.lessonTransaction.count({ where: { businessKey } });
    expect(txCount).toBe(1);

    const card = await prisma.membershipCard.findUnique({ where: { id: seed.membershipId } });
    expect(card!.remainingLessons).toBe(0);
  });
});
