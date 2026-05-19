import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { seedE2eBase } from './helpers/seed';
import { api, authedApi } from './helpers/http';

describe('Memberships adjust lessons (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let membershipId: string;

  beforeAll(async () => {
    await resetDatabase();
    const seed = await seedE2eBase(getTestPrisma());
    membershipId = seed.membershipId;
    app = await createE2eApp();
    const login = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    adminToken = login.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  async function resetCard(remaining: number) {
    const prisma = getTestPrisma();
    await prisma.lessonTransaction.deleteMany({ where: { membershipId } });
    await prisma.membershipCard.update({
      where: { id: membershipId },
      data: { remainingLessons: remaining, version: 0 },
    });
  }

  it('adjusts lessons positively and negatively', async () => {
    await resetCard(10);
    await authedApi(app, adminToken)
      .post(`/memberships/${membershipId}/adjust-lessons`)
      .send({ delta: 2, reason: 'gift' })
      .expect(201);

    const afterAdd = await getTestPrisma().membershipCard.findUnique({ where: { id: membershipId } });
    expect(afterAdd!.remainingLessons).toBe(12);

    await authedApi(app, adminToken)
      .post(`/memberships/${membershipId}/adjust-lessons`)
      .send({ delta: -2, reason: 'correction' })
      .expect(201);

    const afterSub = await getTestPrisma().membershipCard.findUnique({ where: { id: membershipId } });
    expect(afterSub!.remainingLessons).toBe(10);
  });

  it('rejects adjustment that would go negative', async () => {
    await resetCard(1);
    await authedApi(app, adminToken)
      .post(`/memberships/${membershipId}/adjust-lessons`)
      .send({ delta: -2, reason: 'too much' })
      .expect(400);
  });

  it('concurrent decrements cannot drive balance below zero', async () => {
    await resetCard(5);
    const attempts = 20;
    await Promise.all(
      Array.from({ length: attempts }, () =>
        authedApi(app, adminToken)
          .post(`/memberships/${membershipId}/adjust-lessons`)
          .send({ delta: -1, reason: 'concurrent' }),
      ),
    );

    const prisma = getTestPrisma();
    const card = await prisma.membershipCard.findUnique({ where: { id: membershipId } });
    expect(card!.remainingLessons).toBeGreaterThanOrEqual(0);
    expect(card!.remainingLessons).toBeLessThanOrEqual(5);

    const debitTx = await prisma.lessonTransaction.count({
      where: { membershipId, delta: -1, reason: 'concurrent' },
    });
    expect(debitTx).toBeGreaterThanOrEqual(1);
    expect(debitTx).toBeLessThanOrEqual(5);
  });
});
