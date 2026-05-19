import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { seedE2eBase } from './helpers/seed';
import { api, authedApi } from './helpers/http';

describe('Students (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let createdId: string;

  beforeAll(async () => {
    await resetDatabase();
    await seedE2eBase(getTestPrisma());
    app = await createE2eApp();
    const login = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    adminToken = login.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  it('rejects invalid DTO', async () => {
    await authedApi(app, adminToken).post('/students').send({}).expect(400);
  });

  it('creates a student', async () => {
    const res = await authedApi(app, adminToken)
      .post('/students')
      .send({ name: 'New Student', phone: '18800001111' })
      .expect(201);
    createdId = res.body.id;
    expect(res.body.name).toBe('New Student');
  });

  it('lists students', async () => {
    const res = await authedApi(app, adminToken).get('/students').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('gets student by id', async () => {
    const res = await authedApi(app, adminToken).get(`/students/${createdId}`).expect(200);
    expect(res.body.id).toBe(createdId);
  });

  it('updates student', async () => {
    const res = await authedApi(app, adminToken)
      .patch(`/students/${createdId}`)
      .send({ name: 'Updated Student' })
      .expect(200);
    expect(res.body.name).toBe('Updated Student');
  });

  it('deletes student', async () => {
    await authedApi(app, adminToken).delete(`/students/${createdId}`).expect(200);
    await authedApi(app, adminToken).get(`/students/${createdId}`).expect(404);
  });

  it('rejects unauthenticated access', async () => {
    await api(app).get('/students').expect(401);
  });
});
