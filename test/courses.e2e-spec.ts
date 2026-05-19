import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { seedE2eBase, seedSecondCoachAndVenue } from './helpers/seed';
import { api, authedApi } from './helpers/http';

describe('Courses schedules & enrollment (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let seed: Awaited<ReturnType<typeof seedE2eBase>>;
  let coachId2: string;
  let venueId2: string;

  beforeAll(async () => {
    await resetDatabase();
    const prisma = getTestPrisma();
    seed = await seedE2eBase(prisma);
    const extra = await seedSecondCoachAndVenue(prisma, seed.tenantId);
    coachId2 = extra.coachId2;
    venueId2 = extra.venueId2;
    app = await createE2eApp();
    const login = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    adminToken = login.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  it('rejects overlapping coach schedule (resource lock)', async () => {
    const prisma = getTestPrisma();
    const existing = await prisma.schedule.findUnique({ where: { id: seed.scheduleId } });
    const body = {
      classId: seed.classId,
      venueId: venueId2,
      coachId: seed.coachId,
      startsAt: existing!.startsAt.toISOString(),
      endsAt: existing!.endsAt.toISOString(),
    };

    const res = await authedApi(app, adminToken).post('/schedules').send(body);
    expect(res.status).toBe(400);
    expect(String(res.body.message).toLowerCase()).toMatch(/coach|venue|booked|占用/);
  });

  it('rejects overlapping venue schedule', async () => {
    const prisma = getTestPrisma();
    const existing = await prisma.schedule.findUnique({ where: { id: seed.scheduleId } });
    const body = {
      classId: seed.classId,
      venueId: seed.venueId,
      coachId: coachId2,
      startsAt: existing!.startsAt.toISOString(),
      endsAt: existing!.endsAt.toISOString(),
    };

    const res = await authedApi(app, adminToken).post('/schedules').send(body);
    expect(res.status).toBe(400);
    expect(String(res.body.message).toLowerCase()).toMatch(/coach|venue|booked|占用/);
  });

  it('rejects duplicate class enrollment', async () => {
    const res = await authedApi(app, adminToken)
      .post(`/classes/${seed.classId}/students`)
      .send({ studentId: seed.studentId });
    expect(res.status).toBe(409);
  });
});
