import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { api, authedApi } from './helpers/http';
import { seedE2eBase } from './helpers/seed';

describe('Request idempotency (e2e)', () => {
  let app: INestApplication<App>;
  let staffToken: string;
  let studentId: string;

  beforeAll(async () => {
    await resetDatabase();
    const seed = await seedE2eBase(getTestPrisma());
    studentId = seed.studentId;
    app = await createE2eApp();

    const login = await api(app).post('/auth/login').send({ username: 'e2e_staff', password: '123456' });
    staffToken = login.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  it('replays cached HTTP response for duplicate membership create', async () => {
    const key = 'e2e-membership-create-001';
    const body = {
      studentId,
      title: 'E2E Card',
      totalLessons: 10,
      remainingLessons: 10,
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2027-01-01T00:00:00.000Z',
    };

    const first = await authedApi(app, staffToken)
      .post('/memberships')
      .set('Idempotency-Key', key)
      .send(body)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const second = await authedApi(app, staffToken)
      .post('/memberships')
      .set('Idempotency-Key', key)
      .send({ ...body, title: 'Different Title' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.title).toBe(first.body.title);
  });

  it('rejects write without Idempotency-Key when required', async () => {
    await authedApi(app, staffToken)
      .post('/memberships')
      .send({
        studentId,
        title: 'No Key',
        totalLessons: 1,
        remainingLessons: 1,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2027-01-01T00:00:00.000Z',
      })
      .expect(400);
  });
});
