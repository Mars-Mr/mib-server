import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { createE2eApp } from './helpers/e2e-app';

describe('Redis lock & rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let redis: RedisService;

  beforeAll(async () => {
    app = await createE2eApp();
    redis = app.get(RedisService);
    await redis.onModuleInit();
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
    await app.close();
  });

  it('only the lock holder can release', async () => {
    const key = `e2e-lock-${randomUUID()}`;
    const owner = await redis.acquireLock(key, 30);
    expect(owner).toBeTruthy();

    const wrongRelease = await redis.releaseLock(key, 'wrong-token');
    expect(wrongRelease).toBe(false);

    const okRelease = await redis.releaseLock(key, owner!);
    expect(okRelease).toBe(true);
  });

  it('renewLock extends TTL for the holder token only', async () => {
    const key = `e2e-renew-${randomUUID()}`;
    const owner = await redis.acquireLock(key, 2);
    expect(owner).toBeTruthy();

    const renewed = await redis.renewLock(key, owner!, 5);
    expect(renewed).toBe(true);

    const wrongRenew = await redis.renewLock(key, 'wrong-token', 5);
    expect(wrongRenew).toBe(false);

    await redis.releaseLock(key, owner!);
  });

  it('enforces rate limit window', async () => {
    const key = `e2e-rate-${randomUUID()}`;
    const limit = 5;
    const windowSeconds = 60;

    for (let i = 0; i < limit; i++) {
      const r = await redis.rateLimit(key, limit, windowSeconds);
      expect(r.allowed).toBe(true);
      expect(r.current).toBe(i + 1);
    }

    const blocked = await redis.rateLimit(key, limit, windowSeconds);
    expect(blocked.allowed).toBe(false);
    expect(blocked.current).toBe(limit + 1);
    expect(blocked.ttl).toBeGreaterThan(0);
  });
});
