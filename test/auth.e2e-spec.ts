import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { seedE2eBase } from './helpers/seed';
import { api, authedApi } from './helpers/http';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let coachToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await seedE2eBase(getTestPrisma());
    app = await createE2eApp();

    const adminLogin = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    adminToken = adminLogin.body.token;

    const coachLogin = await api(app).post('/auth/login').send({ username: 'e2e_coach', password: '123456' });
    coachToken = coachLogin.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  it('login succeeds with valid credentials', async () => {
    const res = await api(app).post('/auth/login').send({ username: 'e2e_admin', password: '123456' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('e2e_admin');
  });

  it('login fails with wrong password', async () => {
    await api(app).post('/auth/login').send({ username: 'e2e_admin', password: 'wrong' }).expect(401);
  });

  it('rejects protected route without token', async () => {
    await api(app).get('/auth/profile').expect(401);
  });

  it('allows profile with valid token', async () => {
    await authedApi(app, adminToken).get('/auth/profile').expect(200);
  });

  it('rejects admin-only route for coach role', async () => {
    await authedApi(app, coachToken).get('/auth/admin-only').expect(403);
  });

  it('allows admin-only route for admin', async () => {
    await authedApi(app, adminToken).get('/auth/admin-only').expect(200);
  });

  it('invalidates old token after password change', async () => {
    const login = await api(app)
      .post('/auth/login')
      .send({ username: 'e2e_staff', password: '123456' });
    const oldToken = login.body.token;

    await authedApi(app, oldToken)
      .post('/auth/change-password')
      .send({ currentPassword: '123456', newPassword: '654321' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await authedApi(app, oldToken).get('/auth/profile').expect(401);

    const relogin = await api(app)
      .post('/auth/login')
      .send({ username: 'e2e_staff', password: '654321' });
    await authedApi(app, relogin.body.token).get('/auth/profile').expect(200);

    await authedApi(app, relogin.body.token)
      .post('/auth/change-password')
      .send({ currentPassword: '654321', newPassword: '123456' })
      .expect((res) => expect([200, 201]).toContain(res.status));
  });

  it('logout blacklists current token', async () => {
    const login = await api(app)
      .post('/auth/login')
      .send({ username: 'e2e_coach', password: '123456' });
    const token = login.body.token;
    await authedApi(app, token).post('/auth/logout').expect((res) => expect([200, 201]).toContain(res.status));
    await authedApi(app, token).get('/auth/profile').expect(401);
  });
});
